const express = require('express');
const Redis = require('ioredis');
const ChatLog = require('../models/ChatLog');
const Source = require('../models/Source');
const { chatQueue } = require('../workers/chat.queue');

const router = express.Router();

// POST /chat/ask - Submit a question
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const tenantId = req.user.tenantId;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Create a new ChatLog document
    const chatLog = new ChatLog({
      tenantId,
      question: question.trim(),
      status: 'pending'
    });

    await chatLog.save();

    // Add job to the chat queue
    await chatQueue.add('processChat', {
      chatId: chatLog._id.toString(),
      tenantId,
      question: question.trim()
    });

    res.json({ chatId: chatLog._id });
  } catch (error) {
    console.error('Error in /chat/ask:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chat/stream/:chatId - Stream chat responses via SSE
router.get('/stream/:chatId', async (req, res) => {
  const { chatId } = req.params;
  const tenantId = req.user.tenantId;

  try {
    // Verify the chat belongs to this tenant
    const chatLog = await ChatLog.findOne({ _id: chatId, tenantId });
    if (!chatLog) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Create Redis subscriber
    const subscriber = new Redis({
      host: 'localhost',
      port: 6379,
    });

    const channelName = `chat:${chatId}`;

    // Subscribe to the chat channel
    await subscriber.subscribe(channelName);

    subscriber.on('message', (channel, message) => {
      if (channel === channelName) {
        if (message === '[END]') {
          res.write(`event: end\ndata: Chat completed\n\n`);
          res.end();
        } else {
          res.write(`data: ${message}\n\n`);
        }
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      subscriber.unsubscribe(channelName);
      subscriber.disconnect();
    });

    // Connection established - no initial message needed

  } catch (error) {
    console.error('Error in /chat/stream:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chat/history - Get chat history for the tenant
router.get('/history', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { limit = 20, skip = 0 } = req.query;

    const chats = await ChatLog.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('question answer status createdAt');

    res.json({ chats });
  } catch (error) {
    console.error('Error in /chat/history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;