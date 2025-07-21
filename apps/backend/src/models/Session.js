const { Schema, model } = require('mongoose');

const SessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  refreshExpiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

// Index for performance and cleanup
// SessionSchema.index({ token: 1 }); // Removed duplicate - already handled by unique: true
// SessionSchema.index({ refreshToken: 1 }); // Removed duplicate - already handled by unique: true
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired sessions
SessionSchema.index({ isActive: 1 });

// Method to check if session is valid
SessionSchema.methods.isValid = function() {
  return this.isActive && this.expiresAt > new Date();
};

// Method to refresh session
SessionSchema.methods.refresh = function() {
  this.lastUsed = new Date();
  return this.save();
};

module.exports = model('Session', SessionSchema);