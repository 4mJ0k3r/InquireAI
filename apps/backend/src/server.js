const express = require('express');
const corsMiddleware = require('./middlewares/cors.middleware');
const errorMiddleware = require('./middlewares/error.middleware');
const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/protected-test.routes');

const app = express();

// Middleware setup
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/auth', authRoutes);
app.use('/protected-test', protectedRoutes);

// Health check route (keeping the existing one)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware (must be last)
app.use(errorMiddleware);

module.exports = app;