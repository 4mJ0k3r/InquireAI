const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  maxRetriesPerRequest: null
}); // same Redis container

const siteQueue = new Queue('site-crawl', { connection });

module.exports = { siteQueue, connection };