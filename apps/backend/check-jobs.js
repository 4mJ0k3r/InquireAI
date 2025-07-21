const mongoose = require('mongoose');
const Job = require('./src/models/Job');

// Connect to MongoDB
const MONGO_URI = 'mongodb+srv://mrlavish369:JPrKtZTjAQIRiGKN@cluster0.x8lstpb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkJobs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check the two latest job IDs we uploaded
    const job1 = await Job.findById('687e42cdc7850e25ce4697b1');
    const job2 = await Job.findById('687e42f7c7850e25ce4697c0');
    
    console.log('\n=== JOB 1 (test-file-1.txt) ===');
    if (job1) {
      console.log('Status:', job1.status);
      console.log('Progress:', job1.progress);
      console.log('Created:', job1.createdAt);
      console.log('Metadata:', JSON.stringify(job1.metadata, null, 2));
      if (job1.error) console.log('Error:', job1.error);
    } else {
      console.log('Job not found');
    }
    
    console.log('\n=== JOB 2 (test-file-2.txt) ===');
    if (job2) {
      console.log('Status:', job2.status);
      console.log('Progress:', job2.progress);
      console.log('Created:', job2.createdAt);
      console.log('Metadata:', JSON.stringify(job2.metadata, null, 2));
      if (job2.error) console.log('Error:', job2.error);
    } else {
      console.log('Job not found');
    }
    
    // Check all recent jobs for this tenant
    console.log('\n=== ALL RECENT JOBS ===');
    const recentJobs = await Job.find({ tenantId: '687e38afd23832c7a8245068' })
      .sort({ createdAt: -1 })
      .limit(10);
    
    recentJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job._id} - ${job.status} (${job.progress}%) - ${job.metadata?.originalName || 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkJobs();