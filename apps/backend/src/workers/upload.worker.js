const { Worker } = require('bullmq');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const Job = require('../models/Job');
const { processTextChunks } = require('../services/processText.service');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const connection = new Redis({
  maxRetriesPerRequest: null
}); // localhost:6379

// Create worker for file processing
const uploadWorker = new Worker('file-process', async (job) => {
  const { jobId, filePath, tenantId, provider, originalName } = job.data;
  
  console.log(`🚀 Starting job ${jobId} for file: ${originalName}`);
  
  try {
    // Step 1: Read file content
    console.log(`📖 Reading file: ${filePath}`);
    let rawText;
    
    const fileExtension = path.extname(originalName).toLowerCase();
    
    if (fileExtension === '.txt' || fileExtension === '.md') {
      rawText = fs.readFileSync(filePath, 'utf8');
    } else if (fileExtension === '.pdf') {
      console.log(`📄 Processing PDF file: ${originalName}`);
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      rawText = pdfData.text;
    } else if (fileExtension === '.docx') {
      console.log(`📝 Processing DOCX file: ${originalName}`);
      const result = await mammoth.extractRawText({ path: filePath });
      rawText = result.value;
      if (result.messages.length > 0) {
        console.log('📋 DOCX processing messages:', result.messages);
      }
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
    console.log(`📊 Job ${jobId} progress: 10% - File read and text extracted`);
    
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
        console.log(`📊 Job ${jobId} progress: ${progress}%`);
      }
    });
    
    // Step 7: Final update
    await Job.findByIdAndUpdate(jobId, {
      progress: 100,
      status: 'done',
      metadata: {
        ...job.data.metadata,
        chunksCount: result.chunksCount,
        vectorsStored: result.vectorsStored,
        fileSize: fs.statSync(filePath).size,
        fileType: fileExtension,
        textLength: rawText.length
      }
    });
    
    console.log(`📊 Job ${jobId} progress: 100% - Complete!`);
    console.log(`✅ Job ${jobId} completed successfully - ${result.chunksCount} chunks embedded and stored`);
    
  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    // Update job status to failed
    await Job.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message
    });
    
    throw error;
  }
}, { connection });

// Event listeners for worker
uploadWorker.on('completed', (job) => {
  console.log(`🎉 Worker completed job ${job.id}`);
});

uploadWorker.on('failed', (job, err) => {
  console.log(`💥 Worker failed job ${job.id}:`, err.message);
});

uploadWorker.on('error', (err) => {
  console.error('🔥 Worker error:', err);
});

console.log('🔧 Upload worker started and listening for jobs...');

module.exports = uploadWorker;