require('dotenv').config();
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

const fileQueue = new Queue('file-process', { connection });

async function clearFailedJobs() {
  try {
    console.log('Connecting to Redis...');
    await connection.ping();
    console.log('Connected to Redis.');

    console.log('Fetching failed jobs...');
    const failedJobs = await fileQueue.getFailed();
    console.log(`Found ${failedJobs.length} failed jobs.`);

    if (failedJobs.length === 0) {
      console.log('No failed jobs to clear.');
      return;
    }

    for (const job of failedJobs) {
      console.log(`Removing failed job ${job.id}...`);
      await job.remove();
    }

    console.log('All failed jobs have been cleared.');
  } catch (error) {
    console.error('Error clearing failed jobs:', error);
  } finally {
    await connection.quit();
    console.log('Redis connection closed.');
  }
}

clearFailedJobs();