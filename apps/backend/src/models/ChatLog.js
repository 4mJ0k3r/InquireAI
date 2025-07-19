const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'streaming', 'done', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
chatLogSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatLog', chatLogSchema);