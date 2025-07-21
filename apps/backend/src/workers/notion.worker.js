const { Worker } = require('bullmq');
const { Client } = require('@notionhq/client');
const { connection } = require('./notion.queue');
const { processTextChunks } = require('../services/processText.service');
const Source = require('../models/Source');
const Job = require('../models/Job');

const notionWorker = new Worker('notion-sync', async (job) => {
  const { tenantId, jobId, apiKey } = job.data;
  
  console.log(`🚀 Starting Notion sync for tenant: ${tenantId}`);
  
  try {
    // Get API key from job data or fallback to environment variable
    const notionApiKey = apiKey || process.env.NOTION_TOKEN;
    if (!notionApiKey) {
      throw new Error('No Notion API key provided');
    }
    
    // Initialize Notion client with the provided API key
    const notion = new Client({ auth: notionApiKey });
    
    // Update job status to processing
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        status: 'processing',
        progress: 5
      });
    }
    
    // Step 1: Get source and lastSynced timestamp
    const source = await Source.findOne({ tenantId, provider: 'notion' });
    const editedAfter = source?.lastSynced?.toISOString() ?? '1970-01-01';
    console.log(`📚 Fetching pages from Notion (edited after: ${editedAfter})...`);
    
    // Pull all pages shared with integration, sorted by edit time
    const pages = await notion.search({
      filter: { 
        value: 'page', 
        property: 'object' 
      },
      sort: { 
        direction: 'ascending', 
        timestamp: 'last_edited_time' 
      },
      start_cursor: undefined,
    });
    
    // Filter pages to only include those edited after lastSynced
    const filteredPages = pages.results.filter(page => {
      const lastEditedTime = page.last_edited_time;
      return lastEditedTime > editedAfter;
    });
    
    const total = filteredPages.length;
    console.log(`📄 Found ${pages.results.length} total pages, ${total} pages to process (edited after ${editedAfter})`);
    
    if (total === 0) {
      console.log(`⚠️ No pages found. Make sure pages are shared with the integration.`);
      if (jobId) {
        await Job.findByIdAndUpdate(jobId, {
          status: 'done',
          progress: 100,
          metadata: { message: 'No pages found to sync' }
        });
      }
      return;
    }
    
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        progress: 10,
        metadata: { totalPages: total }
      });
    }
    
    let done = 0;
    
    for (const page of filteredPages) {
      console.log(`📖 Processing page: ${page.id}`);
      
      try {
        // Step 2: Flatten rich-text blocks to plain text
        const blocks = await notion.blocks.children.list({ 
          block_id: page.id 
        });
        
        const rawText = blocks.results
          .map(block => {
            // Handle different block types
            if (block.type === 'paragraph' && block.paragraph?.rich_text) {
              return block.paragraph.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'heading_1' && block.heading_1?.rich_text) {
              return block.heading_1.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'heading_2' && block.heading_2?.rich_text) {
              return block.heading_2.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'heading_3' && block.heading_3?.rich_text) {
              return block.heading_3.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
              return '• ' + block.bulleted_list_item.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'numbered_list_item' && block.numbered_list_item?.rich_text) {
              return '1. ' + block.numbered_list_item.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'to_do' && block.to_do?.rich_text) {
              const checked = block.to_do.checked ? '☑' : '☐';
              return checked + ' ' + block.to_do.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'quote' && block.quote?.rich_text) {
              return '> ' + block.quote.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'code' && block.code?.rich_text) {
              return '```\n' + block.code.rich_text.map(t => t.plain_text).join('') + '\n```';
            }
            return '';
          })
          .filter(text => text.trim().length > 0)
          .join('\n');
        
        // Skip empty pages
        if (!rawText.trim()) {
          console.log(`⚠️ Skipping empty page: ${page.id}`);
          done += 1;
          continue;
        }
        
        // Get page title
        const pageTitle = page.properties?.title?.title?.[0]?.plain_text || 
                         page.properties?.Name?.title?.[0]?.plain_text ||
                         `Untitled Page (${page.id.slice(-8)})`;
        
        console.log(`📝 Processing "${pageTitle}" (${rawText.length} characters)`);
        
        // Step 3: Feed into existing splitter → Gemini → Qdrant helper
        await processTextChunks({
          rawText,
          tenantId,
          docId: page.id,
          provider: 'notion',
          sourceName: pageTitle,
          updateProgress: () => {} // Individual page progress not tracked
        });
        
        console.log(`✅ Completed processing "${pageTitle}"`);
        
      } catch (pageError) {
        console.error(`❌ Failed to process page ${page.id}:`, pageError.message);
        // Continue with other pages even if one fails
      }
      
      // Step 4: Progress update
      done += 1;
      const progress = Math.round(10 + (done / total) * 85); // 10-95% for processing
      
      if (jobId) {
        await Job.findByIdAndUpdate(jobId, {
          progress,
          metadata: { 
            totalPages: total, 
            processedPages: done,
            currentPage: page.id
          }
        });
      }
      
      job.updateProgress(progress);
      console.log(`📊 Progress: ${done}/${total} pages (${progress}%)`);
    }
    
    // Step 5: Mark source lastSynced
    await Source.findOneAndUpdate(
      { tenantId, provider: 'notion' }, 
      { lastSynced: new Date() }
    );
    
    // Final job update
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        status: 'done',
        progress: 100,
        metadata: { 
          totalPages: total, 
          processedPages: done,
          message: `Successfully synced ${done} Notion pages`
        }
      });
    }
    
    console.log(`🎉 Notion sync completed! Processed ${done}/${total} pages`);
    
  } catch (error) {
    console.error(`❌ Notion sync failed:`, error);
    
    // Update job status to failed
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        error: error.message
      });
    }
    
    throw error;
  }
}, { 
  connection,
  concurrency: 1, // Process one notion job at a time to avoid race conditions
  limiter: {
    max: 1, // Max 1 job per second
    duration: 1000
  }
});

// Event listeners for worker
notionWorker.on('completed', (job) => {
  console.log(`🎉 Notion worker completed job ${job.id}`);
});

notionWorker.on('failed', (job, err) => {
  console.log(`💥 Notion worker failed job ${job.id}:`, err.message);
});

notionWorker.on('error', (err) => {
  console.error('🔥 Notion worker error:', err);
});

console.log('📝 Notion worker started and listening for jobs...');

module.exports = notionWorker;