require('dotenv').config();
const Redis = require('ioredis');
const { Queue } = require('bullmq');

async function cleanupRedis() {
  const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
  });

  try {
    console.log('🔧 Starting comprehensive Redis cleanup...');

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

    // Clean each queue
    for (const { name, queue } of queues) {
      console.log(`\n🧹 Cleaning queue: ${name}`);
      
      try {
        // Get job counts before cleanup
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        const delayed = await queue.getDelayed();

        console.log(`  📊 Before cleanup - Waiting: ${waiting.length}, Active: ${active.length}, Completed: ${completed.length}, Failed: ${failed.length}, Delayed: ${delayed.length}`);

        // Clean all job states
        await queue.clean(0, 1000, 'completed');
        await queue.clean(0, 1000, 'failed');
        await queue.clean(0, 1000, 'active');
        await queue.clean(0, 1000, 'waiting');
        await queue.clean(0, 1000, 'delayed');

        // Drain the queue (remove all waiting jobs)
        await queue.drain();

        // Remove all repeatable jobs
        const repeatableJobs = await queue.getRepeatableJobs();
        for (const job of repeatableJobs) {
          await queue.removeRepeatable(job.name, job.opts.repeat);
          console.log(`  🗑️ Removed repeatable job: ${job.name}`);
        }

        console.log(`  ✅ Queue ${name} cleaned successfully`);
      } catch (error) {
        console.log(`  ❌ Error cleaning queue ${name}:`, error.message);
      }
    }

    // Clear all Redis keys related to BullMQ
    console.log('\n🗑️ Clearing BullMQ Redis keys...');
    const keys = await connection.keys('bull:*');
    if (keys.length > 0) {
      await connection.del(...keys);
      console.log(`  ✅ Deleted ${keys.length} BullMQ keys`);
    } else {
      console.log('  ℹ️ No BullMQ keys found');
    }

    // Clear chat-related Redis keys
    console.log('\n🗑️ Clearing chat-related Redis keys...');
    const chatKeys = await connection.keys('chat:*');
    if (chatKeys.length > 0) {
      await connection.del(...chatKeys);
      console.log(`  ✅ Deleted ${chatKeys.length} chat keys`);
    } else {
      console.log('  ℹ️ No chat keys found');
    }

    // Close all queue connections
    for (const { queue } of queues) {
      await queue.close();
    }

    console.log('\n🎉 Redis cache cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ All job queues cleared');
    console.log('  ✅ All active/waiting/failed jobs removed');
    console.log('  ✅ All repeatable jobs removed');
    console.log('  ✅ All BullMQ Redis keys cleared');
    console.log('  ✅ All chat session keys cleared');
    console.log('\n🔄 You can now restart your application with a clean queue state.');

  } catch (error) {
    console.error('❌ Redis cleanup failed:', error);
  } finally {
    await connection.quit();
    process.exit(0);
  }
}

cleanupRedis();