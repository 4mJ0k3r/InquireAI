require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSingleUpload() {
  console.log('🧪 Testing single file upload...\n');

  try {
    // Step 1: Register a test user
    console.log('1️⃣ Registering test user...');
    const registerResponse = await axios.post('http://localhost:4000/auth/register', {
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Test User'
    });
    console.log('✅ User registered successfully');

    // Step 2: Login to get token
    console.log('\n2️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/auth/login', {
      email: registerResponse.data.user.email,
      password: 'testpassword123'
    });
    
    const token = loginResponse.data.token;
    console.log(`✅ Login successful, token length: ${token.length}`);

    // Step 3: Create a test file
    console.log('\n3️⃣ Creating test file...');
    const testContent = 'This is a test file for debugging upload issues. It contains some sample text to be processed.';
    const testFileName = `debug-test-${Date.now()}.txt`;
    const testFilePath = path.join(__dirname, 'uploads', testFileName);
    
    // Ensure uploads directory exists
    const uploadsDir = path.dirname(testFilePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    fs.writeFileSync(testFilePath, testContent);
    console.log(`✅ Test file created: ${testFileName}`);

    // Step 4: Upload the file
    console.log('\n4️⃣ Uploading file...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));

    const uploadResponse = await axios.post('http://localhost:4000/docs/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Upload successful!');
    console.log('Response:', JSON.stringify(uploadResponse.data, null, 2));

    const jobId = uploadResponse.data.jobId;
    console.log(`\n📋 Job ID: ${jobId}`);

    // Step 5: Monitor the job
    console.log('\n5️⃣ Monitoring job progress...');
    const Job = require('./src/models/Job');
    const mongoose = require('mongoose');
    
    await mongoose.connect(process.env.MONGO_URI);
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
      const job = await Job.findById(jobId);
      if (!job) {
        console.log('❌ Job not found in database');
        break;
      }
      
      console.log(`📊 Job Status: ${job.status} | Progress: ${job.progress}%`);
      
      if (job.status === 'done') {
        console.log('🎉 Job completed successfully!');
        console.log('Job metadata:', JSON.stringify(job.metadata, null, 2));
        break;
      } else if (job.status === 'failed') {
        console.log('❌ Job failed!');
        console.log('Error:', job.error);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Timeout waiting for job completion');
    }
    
    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('Stack trace:', error.stack);
  }
}

testSingleUpload();