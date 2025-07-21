require('dotenv').config();
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

async function retryFailedJobs() {
  console.log('🔄 Starting failed job retry process...\n');
  
  try {
    // Initialize the file-process queue
    const fileQueue = new Queue('file-process', { connection });
    
    // Get failed jobs
    const failedJobs = await fileQueue.getFailed();
    console.log(`📊 Found ${failedJobs.length} failed jobs\n`);
    
    if (failedJobs.length === 0) {
      console.log('✅ No failed jobs to retry');
      return;
    }
    
    // Retry each failed job
    for (const job of failedJobs) {
      try {
        console.log(`🔄 Retrying job ${job.id}: ${job.data.originalName}`);
        console.log(`   📁 File path: ${job.data.filePath}`);
        
        // Retry the job
        await job.retry();
        console.log(`✅ Job ${job.id} queued for retry\n`);
        
      } catch (error) {
        console.log(`❌ Failed to retry job ${job.id}:`, error.message);
      }
    }
    
    console.log('🎉 Failed job retry process completed!');
    console.log('📊 Check the monitor to see if jobs are now processing successfully.');
    
  } catch (error) {
    console.error('❌ Error during retry process:', error);
  } finally {
    await connection.quit();
    process.exit(0);
  }
}

// Run the retry process
retryFailedJobs();