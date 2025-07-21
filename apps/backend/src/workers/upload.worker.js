const { Worker } = require('bullmq');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const Job = require('../models/Job');
const { processTextChunks } = require('../services/processText.service');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

// Create worker for file processing
const uploadWorker = new Worker('file-process', async (job) => {
  // Handle garbage jobs - complete them immediately
  if (job.data.isGarbageJob) {
    return { message: 'Garbage job completed', purpose: job.data.purpose, position: job.data.position };
  }
  
  const { jobId, filePath, tenantId, provider, originalName } = job.data;
  
  try {
    // Step 1: Read file content
    const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, '..', '..', filePath);
    
    let rawText;
    const fileExtension = path.extname(originalName).toLowerCase();

    if (fileExtension === '.txt' || fileExtension === '.md') {
      rawText = fs.readFileSync(absoluteFilePath, 'utf8');
    } else if (fileExtension === '.pdf') {
      const dataBuffer = fs.readFileSync(absoluteFilePath);
      const pdfData = await pdfParse(dataBuffer);
      rawText = pdfData.text;
    } else if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ path: absoluteFilePath });
      rawText = result.value;
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}. Supported types: .txt, .md, .pdf, .docx`);
    }

    // Validate that we extracted some text
    if (!rawText || rawText.trim().length === 0) {
      throw new Error(`No text content could be extracted from ${originalName}`);
    }

    await Job.findByIdAndUpdate(jobId, {
      progress: 10,
      status: 'processing'
    });
    
    // Step 2-6: Process text through the embedding pipeline
    const result = await processTextChunks({
      rawText,
      tenantId,
      docId: jobId,
      provider: provider || 'uploads',
      sourceName: originalName,
      jobId,
      updateProgress: async (progress) => {
        await Job.findByIdAndUpdate(jobId, { progress });
      }
    });
    
    // Wait a moment to ensure all async progress updates complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 7: Final update
    await Job.findByIdAndUpdate(jobId, {
      progress: 100,
      status: 'done',
      metadata: {
        ...job.data.metadata,
        chunksCount: result.chunksCount,
        vectorsStored: result.vectorsStored,
        fileSize: fs.statSync(absoluteFilePath).size,
        fileType: fileExtension,
        textLength: rawText.length
      }
    });
    
  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    // Update job status to failed
    await Job.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message
    });
    
    throw error;
  }
}, {
  connection,
  concurrency: 3, // Process up to 3 upload jobs concurrently
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
});

// Event listeners for worker
uploadWorker.on('completed', (job) => {
  // Job completed successfully
});

uploadWorker.on('failed', (job, err) => {
  console.error(`💥 Worker failed job ${job.id}:`, err.message);
});

uploadWorker.on('error', (err) => {
  console.error('🔥 Worker error:', err);
});

console.log('🔧 Upload worker started and listening for jobs...');

module.exports = uploadWorker;