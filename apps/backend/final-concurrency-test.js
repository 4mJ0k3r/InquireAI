require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function finalConcurrencyTest() {
  console.log('🎯 Final Concurrency Test - 5 Files\n');

  try {
    // Step 1: Register and login
    console.log('1️⃣ Setting up authentication...');
    let loginResponse;
    let token;
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 2000; // 2 seconds

    while (attempts < maxAttempts) {
      try {
        const registerResponse = await axios.post('http://localhost:4000/auth/register', {
          email: `final-test-${Date.now()}@example.com`,
          password: 'testpassword123',
          name: 'Final Test User'
        });

        loginResponse = await axios.post('http://localhost:4000/auth/login', {
          email: registerResponse.data.user.email,
          password: 'testpassword123'
        });
        
        token = loginResponse.data.token;
        if (token) {
          console.log('✅ Authentication ready');
          break;
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        console.log(`Auth failed, attempt ${attempts}/${maxAttempts}. Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }

    if (!token) {
      throw new Error('Could not authenticate after multiple attempts.');
    }



    // Step 2: Create 5 test files
    console.log('\n2️⃣ Creating 5 test files...');
    const files = [];
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (let i = 1; i <= 5; i++) {
      const fileName = `final-test-${i}-${Date.now()}.txt`;
      const filePath = path.join(uploadsDir, fileName);
      const content = `This is final test file ${i}. It contains sample content for testing concurrent processing. File created at ${new Date().toISOString()}.`;
      
      fs.writeFileSync(filePath, content);
      files.push({ name: fileName, path: filePath });
      console.log(`✅ Created: ${fileName}`);
    }

    // Step 3: Upload all files concurrently
    console.log('\n3️⃣ Uploading 5 files concurrently...');
    const startTime = Date.now();
    
    const uploadPromises = files.map(async (file, index) => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.path));

      const uploadStart = Date.now();
      try {
        const response = await axios.post('http://localhost:4000/docs/upload', formData, {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${token}`
          }
        });
        
        const uploadTime = Date.now() - uploadStart;
        console.log(`✅ File ${index + 1} uploaded in ${uploadTime}ms - JobID: ${response.data.jobId}`);
        return { success: true, jobId: response.data.jobId, file: file.name, uploadTime };
      } catch (error) {
        console.log(`❌ File ${index + 1} failed: ${error.message}`);
        return { success: false, error: error.message, file: file.name };
      }
    });

    const results = await Promise.all(uploadPromises);
    const totalTime = Date.now() - startTime;
    
    console.log(`\n📊 Upload Results (Total time: ${totalTime}ms):`);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}/5`);
    console.log(`❌ Failed: ${failed.length}/5`);
    
    if (successful.length > 0) {
      console.log('\n🎉 Successfully uploaded files:');
      successful.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.file} (${result.uploadTime}ms) - Job: ${result.jobId}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n💥 Failed uploads:');
      failed.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.file} - Error: ${result.error}`);
      });
    }

    console.log('\n🔍 Check server logs to see concurrent job processing!');
    console.log('💡 The jobs should be processed simultaneously with interleaved progress updates.');

  } catch (error) {
    console.error('\n❌ Final test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

finalConcurrencyTest();