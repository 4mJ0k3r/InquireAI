require('dotenv').config();
const Redis = require('ioredis');
const { Queue } = require('bullmq');
const Job = require('./src/models/Job');
const mongoose = require('mongoose');

async function monitorJobs() {
  const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
  });

  try {
    console.log('🔍 Starting REAL-TIME job monitoring...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize all queues
    const fileQueue = new Queue('file-process', { connection });
    const chatQueue = new Queue('chat', { connection });
    const notionQueue = new Queue('notion-sync', { connection });
    const gdocQueue = new Queue('gdoc-fetch', { connection });
    const siteQueue = new Queue('site-crawl', { connection });

    const queues = [
      { name: 'file-process', queue: fileQueue },
      { name: 'chat', queue: chatQueue },
      { name: 'notion-sync', queue: notionQueue },
      { name: 'gdoc-fetch', queue: gdocQueue },
      { name: 'site-crawl', queue: siteQueue }
    ];

    // Get session start time (when monitoring started)
    const sessionStartTime = new Date();
    console.log(`📅 Session started at: ${sessionStartTime.toLocaleString()}`);

    // Monitor function
    const monitor = async () => {
      console.clear();
      console.log('🔍 REAL-TIME Job Queue Monitor - ' + new Date().toLocaleString());
      console.log('📅 Session started: ' + sessionStartTime.toLocaleString());
      console.log('=' .repeat(80));

      // Check MongoDB jobs ONLY from current session
      console.log('\n📊 MongoDB Job Status (Current Session Only):');
      const mongoJobs = await Job.find({
        createdAt: { $gte: sessionStartTime }
      }).sort({ createdAt: -1 }).limit(20);
      
      if (mongoJobs.length === 0) {
        console.log('  ℹ️ No jobs created in current session');
      } else {
        console.log(`  Current Session Jobs (${mongoJobs.length} total):`);
        mongoJobs.forEach((job, index) => {
          const status = job.status || 'unknown';
          const progress = job.progress || 0;
          const originalName = job.originalName || 'unknown';
          const emoji = status === 'done' ? '✅' : status === 'failed' ? '❌' : status === 'processing' ? '🔄' : '⏳';
          const timeAgo = Math.round((Date.now() - job.createdAt) / 1000);
          console.log(`    ${emoji} Job ${index + 1}: ${originalName} | ${status} | ${progress}% | ${timeAgo}s ago`);
          if (status === 'failed' && job.error) {
            console.log(`        💥 Error: ${job.error}`);
          }
        });
      }

      // Check Redis queues with REAL-TIME data
      console.log('\n🗂️ Redis Queue Status (LIVE):');
      for (const { name, queue } of queues) {
        try {
          const waiting = await queue.getWaiting();
          const active = await queue.getActive();
          const completed = await queue.getCompleted(0, 9); // Get last 10 completed
          const failed = await queue.getFailed(0, 9); // Get last 10 failed
          const delayed = await queue.getDelayed();

          console.log(`\n  📋 Queue: ${name}`);
          console.log(`    ⏳ Waiting: ${waiting.length}`);
          console.log(`    🔄 Active: ${active.length}`);
          console.log(`    ✅ Completed: ${completed.length}`);
          console.log(`    ❌ Failed: ${failed.length}`);
          console.log(`    ⏰ Delayed: ${delayed.length}`);

          // Show waiting jobs details
          if (waiting.length > 0) {
            console.log(`    ⏳ Waiting Jobs:`);
            waiting.slice(0, 5).forEach((job, index) => {
              const data = job.data || {};
              console.log(`      ${index + 1}. Job ${job.id} | File: ${data.originalName || 'Unknown'}`);
            });
          }

          // Show active jobs details
          if (active.length > 0) {
            console.log(`    🔄 Active Jobs:`);
            active.forEach((job, index) => {
              const data = job.data || {};
              console.log(`      ${index + 1}. Job ${job.id} | File: ${data.originalName || 'Unknown'} | Progress: ${job.progress || 0}%`);
            });
          }

          // Show recent completed jobs (only from current session)
          if (completed.length > 0) {
            console.log(`    ✅ Recent Completed:`);
            const recentCompleted = completed.filter(job => {
              return job.finishedOn && job.finishedOn >= sessionStartTime.getTime();
            });
            recentCompleted.slice(0, 5).forEach((job, index) => {
              const data = job.data || {};
              console.log(`      ${index + 1}. Job ${job.id} | File: ${data.originalName || 'Unknown'} | Finished: ${job.finishedOn ? new Date(job.finishedOn).toLocaleTimeString() : 'Unknown'}`);
            });
          }

          // Show recent failed jobs (only from current session)
          if (failed.length > 0) {
            console.log(`    ❌ Recent Failed:`);
            const recentFailed = failed.filter(job => {
              return job.failedOn && job.failedOn >= sessionStartTime.getTime();
            });
            recentFailed.slice(0, 5).forEach((job, index) => {
              const data = job.data || {};
              console.log(`      ${index + 1}. Job ${job.id} | File: ${data.originalName || 'Unknown'} | Error: ${job.failedReason || 'Unknown'}`);
            });
          }

        } catch (error) {
          console.log(`    ❌ Error checking queue ${name}: ${error.message}`);
        }
      }

      console.log('\n' + '=' .repeat(80));
      console.log('🔄 Auto-refreshing every 2 seconds... Press Ctrl+C to exit');
    };

    // Initial monitor call
    await monitor();

    // Set up interval monitoring (faster refresh)
    const interval = setInterval(monitor, 2000); // Update every 2 seconds

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Stopping job monitor...');
      clearInterval(interval);
      
      // Close all queue connections
      for (const { queue } of queues) {
        await queue.close();
      }
      
      await connection.quit();
      await mongoose.disconnect();
      console.log('✅ Monitor stopped gracefully');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Monitor failed:', error);
    await connection.quit();
    await mongoose.disconnect();
    process.exit(1);
  }
}

monitorJobs();