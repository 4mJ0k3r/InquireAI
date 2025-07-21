const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

const gdocQueue = new Queue('gdoc-fetch', { connection });

module.exports = { gdocQueue, connection };