require('dotenv').config();

const config = {
  jwtSecret: process.env.JWT_SECRET || 'changeme_dev',
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;