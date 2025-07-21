const axios = require('axios');

async function testChat() {
  try {
    console.log('🧪 Testing chat functionality...');
    
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'password123';
    
    // Register a new test user
    try {
      console.log('📝 Registering test user...');
      await axios.post('http://localhost:4000/auth/register', {
        email: testEmail,
        password: testPassword
      });
      console.log('✅ Test user registered');
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.data || error.message);
      return;
    }
    
    // Login to get a valid token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/auth/login', {
      email: testEmail,
      password: testPassword
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Test chat endpoint
    console.log('💬 Testing chat...');
    const response = await axios.post('http://localhost:4000/chat/ask', {
      question: 'What is cryptography?'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Chat response:', response.data);
    
  } catch (error) {
    console.error('❌ Chat test failed:', error.response?.data || error.message);
  }
}

testChat();