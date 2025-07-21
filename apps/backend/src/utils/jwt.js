const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

const sign = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: '24h'
  };
  
  return jwt.sign(payload, config.jwtSecret, { ...defaultOptions, ...options });
};

const signRefreshToken = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: '7d'
  };
  
  return jwt.sign(payload, config.jwtRefreshSecret || config.jwtSecret, { ...defaultOptions, ...options });
};

const verify = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret || config.jwtSecret);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

const generateTokenPair = (payload) => {
  const accessToken = sign(payload, { expiresIn: '24h' });
  const refreshToken = signRefreshToken(payload, { expiresIn: '7d' });
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
    refreshExpiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
  };
};

const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  sign,
  signRefreshToken,
  verify,
  verifyRefreshToken,
  generateTokenPair,
  generateSecureToken
};