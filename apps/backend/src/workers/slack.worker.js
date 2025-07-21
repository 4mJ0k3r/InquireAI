const { Worker } = require('bullmq');
const { WebClient } = require('@slack/web-api');
const { connection } = require('./queue');
const Source = require('../models/Source');
const ChatLog = require('../models/ChatLog');
const { embeddings } = require('../services/embed.service');
const qdrantClient = require('../services/qdrant.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store active Slack clients by tenant
const slackClients = new Map();

// Simplified Slack bot that will be triggered by webhook or polling
// For now, we'll just validate the connection and store the client
async function initializeSlackClient(tenantId, apiKey, channelName, channelId) {
  try {
    console.log(`🚀 Initializing Slack client for tenant ${tenantId}`);
    console.log(`   - Channel Name: ${channelName}`);
    console.log(`   - Channel ID: ${channelId}`);
    console.log(`   - API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING'}`);
    
    const client = new WebClient(apiKey);
    
    // Test the connection
    const authTest = await client.auth.test();
    console.log(`🤖 Slack client initialized for tenant ${tenantId} (bot: ${authTest.user_id})`);
    
    // Store the client with metadata
    slackClients.set(tenantId, {
      client,
      channelName,
      channelId,
      botUserId: authTest.user_id,
      apiKey,
      lastMessageTimestamp: Date.now() / 1000 // Start from current time
    });
    
    console.log(`💾 Stored Slack client data for tenant ${tenantId}:`, {
      channelName,
      channelId,
      botUserId: authTest.user_id,
      lastMessageTimestamp: Date.now() / 1000
    });
    
    // Start polling for messages
    startMessagePolling(tenantId);
    
    return client;
  } catch (error) {
    console.error(`Failed to initialize Slack client for tenant ${tenantId}:`, error);
    throw error;
  }
}

// Function to poll for new messages in the channel
async function startMessagePolling(tenantId) {
  const slackData = slackClients.get(tenantId);
  if (!slackData) return;

  const { client, channelId, botUserId } = slackData;
  
  console.log(`🔄 Starting message polling for tenant ${tenantId}, channel: ${channelId}, bot: ${botUserId}`);
  
  // Poll every 5 seconds for new messages
  const pollInterval = setInterval(async () => {
    try {
      const slackDataCurrent = slackClients.get(tenantId);
      if (!slackDataCurrent) {
        console.log(`❌ Slack data not found for tenant ${tenantId}, stopping polling`);
        clearInterval(pollInterval);
        return;
      }

      console.log(`🔍 Polling for messages in channel ${channelId} since timestamp ${slackDataCurrent.lastMessageTimestamp}`);

      // Get messages from the channel since last check
      const result = await client.conversations.history({
        channel: channelId,
        oldest: slackDataCurrent.lastMessageTimestamp,
        limit: 10
      });

      console.log(`📊 Polling result: ${result.messages?.length || 0} messages found`);
      
      if (result.messages && result.messages.length > 0) {
        console.log(`📨 Raw messages received:`, result.messages.map(m => ({
          user: m.user,
          text: m.text,
          ts: m.ts,
          subtype: m.subtype,
          bot_id: m.bot_id
        })));

        // Process messages in reverse order (oldest first)
        const newMessages = result.messages.reverse();
        
        for (const message of newMessages) {
          console.log(`🔍 Processing message:`, {
            user: message.user,
            text: message.text,
            ts: message.ts,
            subtype: message.subtype,
            bot_id: message.bot_id,
            isBotMessage: message.user === botUserId,
            hasSubtype: !!message.subtype,
            hasText: !!message.text
          });

          // Skip bot's own messages and system messages
          if (message.user === botUserId || message.subtype || !message.text) {
            console.log(`⏭️ Skipping message: bot=${message.user === botUserId}, subtype=${!!message.subtype}, noText=${!message.text}`);
            continue;
          }

          console.log(`✅ Processing user message from ${message.user}: "${message.text}"`);

          // Check if message mentions the bot
          if (message.text.includes(`<@${botUserId}>`)) {
            // Remove the bot mention and process the question
            const cleanQuestion = message.text.replace(`<@${botUserId}>`, '').trim();
            if (cleanQuestion) {
              console.log(`📩 Received mention from user ${message.user}: ${cleanQuestion}`);
              await processSlackQuestion(tenantId, cleanQuestion);
            }
          } else {
            // For now, let's respond to all messages in the channel
            console.log(`📩 Received message from user ${message.user}: ${message.text}`);
            await processSlackQuestion(tenantId, message.text);
          }
        }

        // Update last message timestamp
        const newTimestamp = parseFloat(newMessages[newMessages.length - 1].ts);
        console.log(`⏰ Updating last message timestamp from ${slackDataCurrent.lastMessageTimestamp} to ${newTimestamp}`);
        slackClients.get(tenantId).lastMessageTimestamp = newTimestamp;
      } else {
        console.log(`📭 No new messages found in channel ${channelId}`);
      }
    } catch (error) {
      console.error(`❌ Error polling messages for tenant ${tenantId}:`, error);
      // Don't clear interval on error, just log and continue
    }
  }, 5000); // Poll every 5 seconds

  // Store interval reference for cleanup
  slackClients.get(tenantId).pollInterval = pollInterval;
  
  console.log(`🔄 Started message polling for tenant ${tenantId}`);
}

// Function to send message to Slack channel
async function sendSlackMessage(tenantId, message) {
  try {
    const slackData = slackClients.get(tenantId);
    if (!slackData) {
      throw new Error(`No Slack client found for tenant ${tenantId}`);
    }

    const { client, channelId } = slackData;
    
    const result = await client.chat.postMessage({
      channel: channelId,
      text: message
    });

    console.log(`✅ Sent message to Slack channel ${channelId}`);
    return result;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}

// Function to process user question and send AI response to Slack
async function processSlackQuestion(tenantId, question) {
  try {
    // Create a chat log entry
    const chatLog = new ChatLog({
      tenantId,
      question,
      answer: '',
      status: 'pending'
    });
    await chatLog.save();

    console.log(`📩 Processing Slack question for tenant ${tenantId}: ${question}`);

    // Send typing indicator (optional - shows bot is thinking)
    try {
      const slackData = slackClients.get(tenantId);
      if (slackData) {
        await slackData.client.chat.postMessage({
          channel: slackData.channelId,
          text: "🤔 Let me think about that..."
        });
      }
    } catch (typingError) {
      // Don't fail the whole process if typing indicator fails
      console.log('Could not send typing indicator:', typingError.message);
    }

    // 1. Generate embedding for the question
    const questionEmbedding = await embeddings.embedQuery(question);
    
    // 2. Search for relevant context in Qdrant
    const searchResults = await qdrantClient.search('chunks', {
      vector: questionEmbedding,
      filter: {
        must: [{ key: 'tenantId', match: { value: tenantId } }]
      },
      limit: 5,
      with_payload: true
    });

    // 3. Build context from search results
    let context = '';
    const sources = new Set();
    
    if (searchResults.length > 0) {
      context = searchResults
        .map((result, index) => {
          sources.add(result.payload.source);
          return `[${index + 1}] ${result.payload.text}`;
        })
        .join('\n\n');
    }

    // 4. Generate AI response
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = context ? 
      `Based on the following context, answer the user's question. Keep your response concise and helpful for a Slack chat environment.

Context:
${context}

Question: ${question}

Answer:` : 
      `I don't have any specific information about "${question}" in my knowledge base. Could you provide more context or ask about something else I might be able to help with?`;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    // 5. Update chat log with the response
    await ChatLog.findByIdAndUpdate(chatLog._id, {
      answer: aiResponse,
      status: 'done'
    });

    // 6. Format and send response to Slack
    let fullResponse = `🤖 *AI Assistant:*\n${aiResponse}`;
    
    // Add sources if any were found
    if (sources.size > 0) {
      fullResponse += `\n\n📚 *Sources:* ${Array.from(sources).join(', ')}`;
    }

    await sendSlackMessage(tenantId, fullResponse);
    console.log(`✅ Processed Slack question for tenant ${tenantId}`);

  } catch (error) {
    console.error('Error processing Slack question:', error);
    
    // Try to send error message to Slack
    try {
      await sendSlackMessage(tenantId, "❌ Sorry, I encountered an error processing your question. Please try again later.");
    } catch (slackError) {
      console.error('Error sending error message to Slack:', slackError);
    }
  }
}

// Function to start Slack bot for a tenant
async function startSlackBot(tenantId) {
  try {
    console.log(`🔍 Starting Slack bot for tenant ${tenantId}`);
    
    const source = await Source.findOne({ tenantId, provider: 'slack-bot', status: 'connected' });
    
    console.log(`📋 Source lookup result:`, {
      found: !!source,
      status: source?.status,
      provider: source?.provider,
      tenantId: source?.tenantId
    });
    
    if (source && source.metadata) {
      console.log(`📊 Source metadata:`, {
        apiKey: source.metadata.apiKey ? `${source.metadata.apiKey.substring(0, 10)}...` : 'MISSING',
        channelName: source.metadata.channelName || 'MISSING',
        channelId: source.metadata.channelId || 'MISSING'
      });
    } else {
      console.log(`❌ No metadata found in source`);
    }
    
    if (!source || !source.metadata?.apiKey || !source.metadata?.channelName) {
      console.log(`❌ Missing required fields:`);
      console.log(`   - source exists: ${!!source}`);
      console.log(`   - metadata exists: ${!!source?.metadata}`);
      console.log(`   - apiKey exists: ${!!source?.metadata?.apiKey}`);
      console.log(`   - channelName exists: ${!!source?.metadata?.channelName}`);
      console.log(`   - channelId exists: ${!!source?.metadata?.channelId}`);
      throw new Error('Slack bot not properly configured for this tenant');
    }

    const { apiKey, channelName, channelId } = source.metadata;
    
    console.log(`✅ All required fields found, proceeding with initialization`);
    
    // Stop existing client if running
    if (slackClients.has(tenantId)) {
      await stopSlackBot(tenantId);
    }

    // Initialize new Slack client
    await initializeSlackClient(tenantId, apiKey, channelName, channelId);
    
    console.log(`🚀 Slack bot started for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error(`Failed to start Slack bot for tenant ${tenantId}:`, error);
    throw error;
  }
}

// Function to stop Slack bot for a tenant
async function stopSlackBot(tenantId) {
  try {
    const slackData = slackClients.get(tenantId);
    if (slackData) {
      // Clear polling interval if it exists
      if (slackData.pollInterval) {
        clearInterval(slackData.pollInterval);
        console.log(`🔄 Stopped message polling for tenant ${tenantId}`);
      }
      
      slackClients.delete(tenantId);
      console.log(`🛑 Slack bot stopped for tenant ${tenantId}`);
    }
  } catch (error) {
    console.error(`Error stopping Slack bot for tenant ${tenantId}:`, error);
  }
}

// Create worker
const slackWorker = new Worker(
  'slack-bot',
  async (job) => {
    const { action, tenantId, question } = job.data;
    
    console.log(`🔧 Processing Slack bot job: ${action} for tenant ${tenantId} (Job ID: ${job.id})`);
    
    switch (action) {
      case 'start':
        console.log(`🚀 Worker received START command for tenant ${tenantId}`);
        await startSlackBot(tenantId);
        break;
      case 'stop':
        console.log(`🛑 Worker received STOP command for tenant ${tenantId}`);
        await stopSlackBot(tenantId);
        break;
      case 'process-question':
        console.log(`❓ Worker received PROCESS-QUESTION command for tenant ${tenantId}`);
        await processSlackQuestion(tenantId, question);
        break;
      case 'test':
        console.log(`🧪 Worker received TEST command for tenant ${tenantId} - worker is functioning!`);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
  { connection }
);

// Start all existing Slack bots on worker startup
async function initializeExistingSlackBots() {
  try {
    const connectedSources = await Source.find({ 
      provider: 'slack-bot', 
      status: 'connected' 
    });
    
    let successCount = 0;
    for (const source of connectedSources) {
      try {
        // Check if the source has proper metadata before trying to start
        if (!source.metadata?.apiKey || !source.metadata?.channelName) {
          console.log(`⚠️ Slack bot for tenant ${source.tenantId} has missing metadata, skipping...`);
          // Optionally mark as disconnected
          await Source.findByIdAndUpdate(source._id, { status: 'disconnected' });
          continue;
        }
        
        await startSlackBot(source.tenantId);
        successCount++;
      } catch (error) {
        console.error(`Failed to start Slack bot for tenant ${source.tenantId}:`, error);
        // Optionally mark as disconnected on failure
        await Source.findByIdAndUpdate(source._id, { status: 'disconnected' });
      }
    }
    
    console.log(`🤖 Initialized ${successCount}/${connectedSources.length} Slack bots`);
  } catch (error) {
    console.error('Error initializing existing Slack bots:', error);
  }
}

// Initialize on startup
initializeExistingSlackBots();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Slack worker...');
  
  // Stop all Slack bots
  for (const tenantId of slackClients.keys()) {
    await stopSlackBot(tenantId);
  }
  
  await slackWorker.close();
  process.exit(0);
});

slackWorker.on('completed', (job) => {
  console.log(`✅ Slack bot job ${job.id} completed`);
});

slackWorker.on('failed', (job, err) => {
  console.error(`❌ Slack bot job ${job?.id} failed:`, err);
});

slackWorker.on('error', (err) => {
  console.error(`🚨 Slack worker error:`, err);
});

// Test Redis connection
connection.ping().then(() => {
  console.log('🔗 Slack worker Redis connection successful');
  
  // Test if worker can process jobs by adding a simple test job
  const { slackQueue } = require('./slack.queue');
  setTimeout(async () => {
    try {
      console.log('🧪 Adding test job to verify worker functionality...');
      const testJob = await slackQueue.add('test-job', { action: 'test', tenantId: 'test-tenant' });
      console.log(`🧪 Test job added with ID: ${testJob.id}`);
    } catch (error) {
      console.error('❌ Failed to add test job:', error);
    }
  }, 2000);
  
}).catch((err) => {
  console.error('❌ Slack worker Redis connection failed:', err);
});

console.log('🤖 Slack bot worker started');

module.exports = { slackWorker, startSlackBot, stopSlackBot, processSlackQuestion, sendSlackMessage };