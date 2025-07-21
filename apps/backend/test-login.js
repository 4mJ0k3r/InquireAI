require('dotenv').config();
const axios = require('axios');

async function testLogin() {
  const baseURL = 'http://localhost:4000';
  
  try {
    console.log('🧪 Testing login endpoint...\n');

    const uniqueEmail = `testuser${Date.now()}@example.com`;
    const password = 'testpassword123';

    console.log('👤 Registering test user...');
    console.log('📧 Email:', uniqueEmail);
    
    const registerResponse = await axios.post(`${baseURL}/auth/register`, {
      name: 'Test User',
      email: uniqueEmail,
      password: password
    });
    
    console.log('✅ Registration response:', registerResponse.data);

    console.log('\n🔐 Logging in...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: uniqueEmail,
      password: password
    });

    console.log('✅ Login response:', loginResponse.data);
    console.log('🔍 Access token:', loginResponse.data.accessToken ? 'Present' : 'Missing');
    console.log('🔍 Token length:', loginResponse.data.accessToken ? loginResponse.data.accessToken.length : 0);

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testLogin();