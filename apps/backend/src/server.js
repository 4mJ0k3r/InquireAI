const express = require('express');
const mongoose = require('mongoose');
const corsMiddleware = require('./middlewares/cors.middleware');
const errorMiddleware = require('./middlewares/error.middleware');
const authMiddleware = require('./middlewares/auth.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const protectedTestRoutes = require('./routes/protected-test.routes');
const sourcesRoutes = require('./routes/sources.routes');
const docsRoutes = require('./routes/docs.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();

// Middleware setup
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the backend directory
app.use(express.static(__dirname + '/../'));

// Routes
app.use('/auth', authRoutes);
app.use('/protected-test', authMiddleware, protectedTestRoutes);
app.use('/sources', authMiddleware, sourcesRoutes);
app.use('/docs', authMiddleware, docsRoutes);
app.use('/chat', authMiddleware, chatRoutes);

// Health check route (keeping the existing one)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Connect to MongoDB
const { MONGO_URI } = process.env;

mongoose.connect(MONGO_URI)
  .then(() => console.log('🌿 MongoDB connected'))
  .catch(err => console.error('Mongo error', err));

// Initialize Qdrant collection
const { ensureCollection } = require('./services/qdrant.service');
ensureCollection()
  .then(() => console.log('🗃️ Qdrant collection ready'))
  .catch(err => console.error('Qdrant error', err));

// Start upload worker
require('./workers/upload.worker');

// Start chat worker
require('./workers/chat.worker');

// Start notion worker
require('./workers/notion.worker');

// Start Google Docs worker
require('./workers/gdoc.worker');

// Start site crawler worker
require('./workers/crawler.worker');

module.exports = app;