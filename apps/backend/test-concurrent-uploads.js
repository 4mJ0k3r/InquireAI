require('dotenv').config();
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testMultipleUploads() {
  const baseURL = 'http://localhost:4000';
  
  try {
    console.log('🧪 Testing multiple file uploads for concurrent processing...\n');

    // First, register and login to get a token
    const uniqueEmail = `testuser${Date.now()}@example.com`;
    const password = 'testpassword123';

    console.log('👤 Registering test user...');
    await axios.post(`${baseURL}/auth/register`, {
      name: 'Test User',
      email: uniqueEmail,
      password: password
    });

    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: uniqueEmail,
      password: password
    });

    const token = loginResponse.data.token;
    console.log('✅ Got authentication token');
    console.log('🔍 Token length:', token ? token.length : 0);
    console.log('🔍 Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('');

    // Create test files
    const testFiles = [
      {
        name: 'test-file-1.txt',
        content: 'This is test file 1 for concurrent processing. It contains sample content about artificial intelligence and machine learning algorithms.'
      },
      {
        name: 'test-file-2.txt', 
        content: 'This is test file 2 for concurrent processing. It discusses natural language processing and deep learning techniques.'
      },
      {
        name: 'test-file-3.txt',
        content: 'This is test file 3 for concurrent processing. It covers computer vision and neural network architectures.'
      }
    ];

    const uploadsDir = path.join(__dirname, 'uploads');
    
    console.log('📁 Creating test files...');
    for (const file of testFiles) {
      const filePath = path.join(uploadsDir, file.name);
      fs.writeFileSync(filePath, file.content);
      console.log(`✅ Created: ${file.name}`);
    }

    console.log('\n🚀 Uploading files concurrently...');
    const uploadPromises = testFiles.map(async (file, index) => {
      const filePath = path.join(uploadsDir, file.name);
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      const startTime = Date.now();
      try {
        console.log(`🚀 Uploading file ${index + 1}: ${file.name}`);
        console.log(`🔑 Using token: ${token.substring(0, 20)}...`);
        
        const response = await axios.post(`${baseURL}/docs/upload`, form, {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${token}`
          }
        });
        const endTime = Date.now();
        console.log(`✅ File ${index + 1} uploaded successfully in ${endTime - startTime}ms`);
        console.log(`   Response: ${JSON.stringify(response.data)}`);
        return response.data;
      } catch (error) {
        const endTime = Date.now();
        console.error(`❌ File ${index + 1} upload failed after ${endTime - startTime}ms:`);
        console.error(`   Status: ${error.response?.status}`);
        console.error(`   Error: ${JSON.stringify(error.response?.data) || error.message}`);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(r => r !== null).length;
    
    console.log(`\n📊 Upload Results: ${successCount}/${testFiles.length} files uploaded successfully`);
    console.log('\n💡 Now check the monitor-jobs.js output to see concurrent processing!');
    console.log('🔍 You should see multiple jobs being processed simultaneously');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testMultipleUploads();