const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { embeddings } = require('../services/embed.service');
const { qdrant, COLLECTION } = require('../services/qdrant.service');
const ChatLog = require('../models/ChatLog');

// Initialize Redis publisher
const publisher = new Redis({
  host: 'localhost',
  port: 6379,
});

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chatWorker = new Worker('chat', async (job) => {
  const { chatId, tenantId, question } = job.data;
  
  try {
    console.log(`Processing chat job: ${chatId} for tenant: ${tenantId}`);
    
    // Update status to streaming
    await ChatLog.findByIdAndUpdate(chatId, { status: 'streaming' });

    // Step 1: Search for relevant context using vector similarity
    console.log('Searching for relevant context...');
    
    // Create embedding for the question
    const questionEmbedding = await embeddings.embedQuery(question);
    
    // Search in Qdrant with tenant filter
    const searchResults = await qdrant.search(COLLECTION, {
      vector: questionEmbedding,
      limit: 3,
      filter: {
        must: [
          {
            key: "tenantId",
            match: { value: tenantId }
          }
        ]
      }
    });

    // Extract context from search results
    let context = '';
    if (searchResults.length > 0) {
      context = searchResults.map(result => {
        const payload = result.payload;
        return `Document: ${payload.filename || 'Unknown'}\nContent: ${payload.chunk || ''}`;
      }).join('\n\n---\n\n');
    }

    console.log(`Found ${searchResults.length} relevant chunks`);
    
    // Debug: Log the first search result to see available fields
    if (searchResults.length > 0) {
      console.log('First search result payload:', JSON.stringify(searchResults[0].payload, null, 2));
    }

    // Step 2: Generate streaming response with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create context with citation markers
    let contextWithCitations = '';
    const citationMap = new Map(); // Map to track which chunks to cite
    
    if (searchResults.length > 0) {
      contextWithCitations = searchResults.map((result, index) => {
        const payload = result.payload;
        const chunkId = payload.chunkId;
        citationMap.set(index, chunkId);
        return `[Source ${index + 1}] Document: ${payload.filename || 'Unknown'}\nContent: ${payload.chunk || ''}`;
      }).join('\n\n---\n\n');
    }

    const prompt = contextWithCitations 
      ? `You are a helpful document assistant. Answer the user's question based on the provided context. When you use information from a source, reference it as [Source X] where X is the source number (e.g., [Source 1], [Source 2], etc.).

Context:
${contextWithCitations}

Question: ${question}

Answer:`
      : `You are a helpful assistant. The user asked: "${question}". Please provide a helpful response. Note: No specific document context was found for this question.`;

    console.log('Generating streaming response...');

    // Retry logic for Gemini API call
    let result;
    let geminiRetry = 0;
    const geminiMaxRetries = 5;
    let geminiDelay = 5000;
    while (geminiRetry < geminiMaxRetries) {
      try {
        result = await model.generateContentStream(prompt);
        break; // Success
      } catch (err) {
        geminiRetry++;
        if (err.status === 503 || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || err.message.includes('overloaded')) {
          console.warn(`⚠️ Gemini API error (attempt ${geminiRetry}/${geminiMaxRetries}): ${err.message}`);
          if (geminiRetry < geminiMaxRetries) {
            await new Promise(resolve => setTimeout(resolve, geminiDelay));
            geminiDelay *= 2; // Exponential backoff
            continue;
          }
        }
        throw err;
      }
    }
    
    let fullAnswer = '';
    const channelName = `chat:${chatId}`;

    // Stream each chunk
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        // Replace [Source X] references with citation markers
        let processedText = chunkText;
        
        // Look for [Source X] patterns and replace with citation markers
        for (let i = 0; i < searchResults.length; i++) {
          const sourcePattern = new RegExp(`\\[Source ${i + 1}\\]`, 'g');
          const chunkId = citationMap.get(i);
          if (chunkId) {
            processedText = processedText.replace(sourcePattern, `[[${chunkId}]]`);
          }
        }
        
        // Also handle patterns like "Source 1", "Source 2" without brackets
        for (let i = 0; i < searchResults.length; i++) {
          const sourcePattern = new RegExp(`Source ${i + 1}(?![\\d])`, 'g');
          const chunkId = citationMap.get(i);
          if (chunkId) {
            processedText = processedText.replace(sourcePattern, `[[${chunkId}]]`);
          }
        }
        
        fullAnswer += processedText;
        
        // Publish the processed text chunk
        await publisher.publish(channelName, processedText);
      }
    }

    // Step 3: Save the complete answer and mark as done
    await ChatLog.findByIdAndUpdate(chatId, {
      answer: fullAnswer,
      status: 'done'
    });

    // Send end signal
    await publisher.publish(channelName, '[END]');

    console.log(`Chat job completed: ${chatId}`);

  } catch (error) {
    console.error(`Error processing chat job ${chatId}:`, error);
    
    // Update status to failed
    await ChatLog.findByIdAndUpdate(chatId, {
      status: 'failed',
      answer: 'Sorry, an error occurred while processing your question.'
    });

    // Send error message and end signal
    const channelName = `chat:${chatId}`;
    await publisher.publish(channelName, 'Sorry, an error occurred while processing your question.');
    await publisher.publish(channelName, '[END]');
  }
}, {
  connection: {
    host: 'localhost',
    port: 6379,
  },
  concurrency: 2, // Allow 2 concurrent chat jobs for better responsiveness
  limiter: {
    max: 3, // Max 3 jobs per second
    duration: 1000
  }
});

chatWorker.on('completed', (job) => {
  console.log(`Chat job ${job.id} completed`);
});

chatWorker.on('failed', (job, err) => {
  console.error(`Chat job ${job.id} failed:`, err);
});

console.log('💬 Chat worker started and listening for jobs...');

module.exports = chatWorker;