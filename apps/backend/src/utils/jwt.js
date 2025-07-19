const jwt = require('jsonwebtoken');
const config = require('../config/env');

const sign = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: '24h'
  };
  
  return jwt.sign(payload, config.jwtSecret, { ...defaultOptions, ...options });
};

const verify = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = {
  sign,
  verify
};