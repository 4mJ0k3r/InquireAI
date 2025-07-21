const { Worker } = require('bullmq');
const axios = require('axios');
const cheerio = require('cheerio');
const { processTextChunks } = require('../services/processText.service');
const Job = require('../models/Job');
const { connection } = require('../queues/site.queue'); // Import Redis connection from site queue

// Dynamic import for ES module
let Sitemap;
const sitemapPromise = (async () => {
  const sitemapperModule = await import('sitemapper');
  Sitemap = sitemapperModule.default;
  return Sitemap;
})();

console.log('🕷️ Site crawler worker started and listening for jobs...');

// Helper function to normalize URLs
function normalizeUrl(url, baseUrl) {
  try {
    const urlObj = new URL(url, baseUrl);
    // Remove fragment and normalize
    urlObj.hash = '';
    return urlObj.href;
  } catch (error) {
    return null;
  }
}

// Helper function to check if URL is valid for crawling
function isValidCrawlUrl(url, baseHost) {
  try {
    const urlObj = new URL(url);
    
    // Only crawl same domain
    if (urlObj.hostname !== baseHost) {
      return false;
    }
    
    // Skip common non-content URLs
    const path = urlObj.pathname.toLowerCase();
    const skipPatterns = [
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz|jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/,
      /\/(api|admin|login|logout|register|signin|signup|auth|oauth|download|upload|assets|static|images|img|css|js|fonts|media)($|\/)/,
      /#/,
      /\?.*=(pdf|doc|download)/,
      /mailto:|tel:|javascript:|data:/
    ];
    
    return !skipPatterns.some(pattern => pattern.test(path) || pattern.test(url));
  } catch (error) {
    return false;
  }
}

// Enhanced crawler function
async function discoverUrls(startUrl, baseHost, maxPages = 100) {
  const discovered = new Set();
  const toVisit = [startUrl];
  const visited = new Set();
  
  console.log(`🔍 Starting URL discovery from: ${startUrl}`);
  
  while (toVisit.length > 0 && discovered.size < maxPages) {
    const currentUrl = toVisit.shift();
    
    if (visited.has(currentUrl)) {
      continue;
    }
    
    visited.add(currentUrl);
    discovered.add(currentUrl);
    
    try {
      console.log(`🔗 Discovering links from: ${currentUrl}`);
      
      const response = await axios.get(currentUrl, {
        timeout: 15000,
        maxContentLength: 2 * 1024 * 1024, // 2MB limit for discovery
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Chatbot-Crawler/1.0)'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract all links
      $('a[href]').each((i, element) => {
        const href = $(element).attr('href');
        if (!href) return;
        
        const normalizedUrl = normalizeUrl(href, currentUrl);
        if (!normalizedUrl) return;
        
        if (isValidCrawlUrl(normalizedUrl, baseHost) && 
            !visited.has(normalizedUrl) && 
            !discovered.has(normalizedUrl)) {
          toVisit.push(normalizedUrl);
        }
      });
      
      // Rate limiting for discovery
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`⚠️ Failed to discover links from ${currentUrl}: ${error.message}`);
    }
  }
  
  console.log(`✅ Discovered ${discovered.size} URLs to crawl`);
  return Array.from(discovered);
}

const crawlerWorker = new Worker('site-crawl', async (job) => {
  const { url, tenantId, jobId, host } = job.data;
  
  try {
    // Update job status to processing
    await Job.findByIdAndUpdate(jobId, { 
      status: 'processing',
      progress: 0,
      startedAt: new Date()
    });

    let urls = [];
    
    // 1. Try sitemap first (quick win if available)
    try {
      console.log(`🗺️ Attempting to fetch sitemap for ${host}...`);
      const sitemapUrl = `https://${host}/sitemap.xml`;
      
      // Wait for Sitemap to be available
      await sitemapPromise;
      const sitemap = new Sitemap();
      const result = await sitemap.fetch(sitemapUrl);
      
      if (result.sites && result.sites.length > 0) {
        urls = result.sites.filter(siteUrl => isValidCrawlUrl(siteUrl, host));
        console.log(`✅ Found ${urls.length} valid URLs in sitemap`);
      }
    } catch (sitemapError) {
      console.log(`⚠️ Sitemap not found or failed to parse: ${sitemapError.message}`);
    }
    
    // 2. If sitemap didn't provide enough URLs, use web crawler
    if (urls.length === 0) {
      console.log(`🕷️ Sitemap unavailable, starting web crawler discovery...`);
      urls = await discoverUrls(url, host, 200); // Discover up to 200 pages
    }
    
    // 3. If still no URLs, at least crawl the starting page
    if (urls.length === 0) {
      console.log(`⚠️ No URLs discovered, falling back to single page crawl`);
      urls = [url];
    }

    // Safety limit: max 500 URLs for processing
    if (urls.length > 500) {
      console.log(`⚠️ Too many URLs found (${urls.length}), limiting to 500`);
      urls = urls.slice(0, 500);
    }

    const total = urls.length;
    let processed = 0;
    let successful = 0;

    console.log(`🚀 Starting content crawl of ${total} URLs...`);

    // Update progress to show discovery is complete
    await Job.findByIdAndUpdate(jobId, { 
      progress: 5,
      discoveredUrls: total
    });

    for (const pageUrl of urls) {
      try {
        console.log(`📄 Crawling content: ${pageUrl}`);
        
        // Fetch HTML content
        const response = await axios.get(pageUrl, {
          timeout: 30000, // 30 second timeout
          maxContentLength: 5 * 1024 * 1024, // 5MB limit
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AI-Chatbot-Crawler/1.0)'
          }
        });

        const html = response.data;
        
        // Parse HTML and extract text
        const $ = cheerio.load(html);
        
        // Remove script and style elements and common non-content areas
        $('script, style, nav, header, footer, .sidebar, .menu, .navigation, .breadcrumb, .pagination, .comments, .social-share').remove();
        
        // Try to find main content area first
        let contentArea = $('main, .main, .content, .main-content, article, .article, .post, .documentation, .docs');
        if (contentArea.length === 0) {
          contentArea = $('body');
        }
        
        // Extract text from content area
        const rawText = contentArea.text()
          .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
          .replace(/\n\s*\n/g, '\n') // Remove empty lines
          .trim();

        if (rawText.length > 200) { // Only process if we have substantial content
          // Extract title for better context
          const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
          
          // Process through existing pipeline
          await processTextChunks({
            rawText,
            tenantId,
            docId: pageUrl, // Use URL as document ID
            provider: 'site-docs',
            sourceName: `${title} - ${pageUrl}`,
            jobId,
            onProgress: (progress) => {
              // Individual page progress is handled at the overall level
            }
          });
          
          successful++;
          console.log(`✅ Processed: ${pageUrl} (${rawText.length} chars) - "${title}"`);
        } else {
          console.log(`⚠️ Skipped: ${pageUrl} (insufficient content: ${rawText.length} chars)`);
        }

      } catch (pageError) {
        console.error(`❌ Failed to process ${pageUrl}:`, pageError.message);
      }

      processed++;
      const overallProgress = Math.round(5 + (processed / total) * 95); // 5% for discovery, 95% for processing
      
      // Update job progress
      await job.updateProgress(overallProgress);
      await Job.findByIdAndUpdate(jobId, { 
        progress: overallProgress,
        processedCount: processed,
        successfulCount: successful
      });

      // Rate limiting: delay between requests to be polite
      await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
    }

    // Mark job as completed
    await Job.findByIdAndUpdate(jobId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      result: {
        totalUrls: total,
        processedUrls: processed,
        successfulUrls: successful,
        message: `Successfully crawled and processed ${successful} out of ${total} pages`
      }
    });

    console.log(`🎉 Crawl completed! Processed ${successful}/${total} pages successfully`);

  } catch (error) {
    console.error('❌ Crawler job failed:', error);
    
    // Mark job as failed
    await Job.findByIdAndUpdate(jobId, {
      status: 'failed',
      completedAt: new Date(),
      error: error.message
    });
    
    throw error;
  }
}, { 
  connection,
  concurrency: 1, // Process one crawl job at a time
  limiter: {
    max: 3, // Max 3 requests per second (more conservative)
    duration: 1000
  }
});

module.exports = crawlerWorker;