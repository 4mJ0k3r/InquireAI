#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testSlackIntegration() {
  try {
    console.log('🧪 Testing Slack Bot Integration...\n');

    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');

    // Step 2: Get sources list
    console.log('\n2️⃣ Getting sources list...');
    const sourcesResponse = await axios.get(`${BASE_URL}/sources/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Sources retrieved:', sourcesResponse.data.map(s => `${s.provider}: ${s.status}`));

    // Step 3: Test Slack bot connection (this will fail without real Slack credentials, but will test the endpoint)
    console.log('\n3️⃣ Testing Slack bot connection endpoint...');
    try {
      const slackConnectResponse = await axios.post(`${BASE_URL}/sources/slack-bot/connect`, {
        apiKey: 'xoxb-test-invalid-key',
        channelName: 'general'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Slack connection response:', slackConnectResponse.data);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Slack connection endpoint working (expected validation error):', error.response.data.error);
      } else {
        throw error;
      }
    }

    // Step 4: Test chat/slack endpoint
    console.log('\n4️⃣ Testing chat/slack endpoint...');
    try {
      const slackChatResponse = await axios.post(`${BASE_URL}/chat/slack`, {
        question: 'Test question for Slack bot'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Slack chat response:', slackChatResponse.data);
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.error.includes('not connected')) {
        console.log('✅ Slack chat endpoint working (expected not connected error):', error.response.data.error);
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All Slack integration endpoints are working correctly!');
    console.log('\n📝 To test with real Slack:');
    console.log('   1. Create a Slack app at https://api.slack.com/apps');
    console.log('   2. Get the Bot User OAuth Token (xoxb-...)');
    console.log('   3. Use the frontend to connect via the Connections page');
    console.log('   4. Test sending messages through the chat interface');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSlackIntegration();