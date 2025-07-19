const { Worker } = require('bullmq');
const axios = require('axios');
const Job = require('../models/Job');
const { processTextChunks } = require('../services/processText.service');
const { connection } = require('./gdoc.queue');

console.log('📄 Google Docs worker started and listening for jobs...');

const gdocWorker = new Worker('gdoc-fetch', async (job) => {
  const { tenantId, url, docId, jobId } = job.data;
  
  console.log(`🚀 Starting Google Docs fetch for tenant: ${tenantId}, docId: ${docId}`);
  
  try {
    // Update job status to processing
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, { 
        status: 'processing',
        progress: 0
      });
    }
    
    // Step 1: Download plain-text from Google Docs
    console.log(`📥 Downloading document from: ${url}`);
    job.updateProgress(5);
    
    const response = await axios.get(url, { 
      responseType: 'text',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data || response.data.trim().length === 0) {
      throw new Error('Document is empty or could not be accessed. Make sure the document is shared with "Anyone with the link".');
    }
    
    console.log(`📄 Downloaded ${response.data.length} characters`);
    job.updateProgress(20);
    
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, { progress: 20 });
    }
    
    // Step 2: Process the text through the embedding pipeline
    console.log(`🔄 Processing text through embedding pipeline...`);
    
    const updateProgress = async (progress) => {
      job.updateProgress(progress);
      if (jobId) {
        await Job.findByIdAndUpdate(jobId, { progress });
      }
    };
    
    await processTextChunks({
      rawText: response.data,
      tenantId,
      docId,
      provider: 'gdocs',
      sourceName: `Google Doc: ${docId}`,
      jobId,
      updateProgress
    });
    
    // Step 3: Mark job as completed
    job.updateProgress(100);
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, { 
        status: 'done',
        progress: 100
      });
    }
    
    console.log(`🎉 Google Docs worker completed job for docId: ${docId}`);
    
  } catch (error) {
    console.error(`❌ Google Docs worker failed for docId: ${docId}`, error);
    
    // Update job status to failed
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, { 
        status: 'failed',
        progress: 0,
        error: error.message
      });
    }
    
    throw error;
  }
}, { connection });

module.exports = gdocWorker;