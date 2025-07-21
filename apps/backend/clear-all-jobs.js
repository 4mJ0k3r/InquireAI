require('dotenv').config();
const Redis = require('ioredis');
const { Queue } = require('bullmq');
const Job = require('./src/models/Job');
const mongoose = require('mongoose');

async function clearAllJobs() {
  const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
  });

  try {
    console.log('🧹 Starting complete job cleanup...\n');

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

    console.log('🗑️ Clearing Redis queues...');
    for (const { name, queue } of queues) {
      try {
        // Clear all jobs from queue
        await queue.obliterate({ force: true });
        console.log(`✅ Cleared queue: ${name}`);
      } catch (error) {
        console.log(`❌ Error clearing queue ${name}: ${error.message}`);
      }
    }

    console.log('\n🗑️ Clearing MongoDB jobs...');
    const deleteResult = await Job.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} jobs from MongoDB`);

    console.log('\n🔄 Restarting queues...');
    for (const { name, queue } of queues) {
      try {
        await queue.close();
        console.log(`✅ Closed queue: ${name}`);
      } catch (error) {
        console.log(`❌ Error closing queue ${name}: ${error.message}`);
      }
    }

    await connection.quit();
    await mongoose.disconnect();

    console.log('\n🎉 Complete cleanup finished!');
    console.log('📋 All jobs cleared from both Redis and MongoDB');
    console.log('🚀 Ready for fresh job processing');
    console.log('\n💡 Next steps:');
    console.log('1. Restart the server: npm run dev');
    console.log('2. Upload new files to test');
    console.log('3. Monitor with: node monitor-jobs.js');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    await connection.quit();
    await mongoose.disconnect();
    process.exit(1);
  }
}

clearAllJobs();