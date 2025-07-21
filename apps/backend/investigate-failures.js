require('dotenv').config();
const Redis = require('ioredis');
const { Queue } = require('bullmq');
const Job = require('./src/models/Job');
const mongoose = require('mongoose');

async function investigateFailedJobs() {
  const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
  });

  try {
    console.log('🔍 Investigating failed jobs...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize file queue
    const fileQueue = new Queue('file-process', { connection });

    console.log('\n📊 Checking Redis queue status...');
    const waiting = await fileQueue.getWaiting();
    const active = await fileQueue.getActive();
    const completed = await fileQueue.getCompleted();
    const failed = await fileQueue.getFailed();

    console.log(`⏳ Waiting: ${waiting.length}`);
    console.log(`🔄 Active: ${active.length}`);
    console.log(`✅ Completed: ${completed.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Jobs Details:');
      for (let i = 0; i < Math.min(failed.length, 5); i++) {
        const job = failed[i];
        console.log(`\n🔍 Failed Job ${i + 1}:`);
        console.log(`  ID: ${job.id}`);
        console.log(`  Name: ${job.name}`);
        console.log(`  Data:`, JSON.stringify(job.data, null, 2));
        console.log(`  Failed Reason: ${job.failedReason}`);
        console.log(`  Stack Trace:`, job.stacktrace ? job.stacktrace.slice(0, 500) + '...' : 'None');
        console.log(`  Attempts: ${job.attemptsMade}/${job.opts.attempts || 1}`);
        console.log(`  Timestamp: ${new Date(job.timestamp).toLocaleString()}`);
      }
    }

    console.log('\n📋 Checking MongoDB jobs...');
    const recentJobs = await Job.find({})
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`\n📊 Recent MongoDB Jobs (${recentJobs.length}):`);
    for (const job of recentJobs) {
      console.log(`\n📄 Job: ${job._id}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Progress: ${job.progress}%`);
      console.log(`  Original Name: ${job.metadata?.originalName || 'Unknown'}`);
      console.log(`  File Path: ${job.metadata?.filePath || 'Unknown'}`);
      console.log(`  Created: ${job.createdAt.toLocaleString()}`);
      console.log(`  Updated: ${job.updatedAt.toLocaleString()}`);
      if (job.error) {
        console.log(`  Error: ${job.error}`);
      }
    }

    // Check if files exist
    console.log('\n📁 Checking file existence...');
    const fs = require('fs');
    const path = require('path');
    
    for (const job of recentJobs.slice(0, 5)) {
      if (job.metadata?.filePath) {
        const filePath = path.resolve(job.metadata.filePath);
        const exists = fs.existsSync(filePath);
        console.log(`  ${job.metadata.originalName}: ${exists ? '✅ EXISTS' : '❌ MISSING'} (${filePath})`);
      }
    }

    await connection.quit();
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Investigation failed:', error);
    await connection.quit();
    await mongoose.disconnect();
    process.exit(1);
  }
}

investigateFailedJobs();