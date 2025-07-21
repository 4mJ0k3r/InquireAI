const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

const siteQueue = new Queue('site-crawl', { connection });

module.exports = { siteQueue, connection };