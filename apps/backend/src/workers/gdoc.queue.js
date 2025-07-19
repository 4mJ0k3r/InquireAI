const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  maxRetriesPerRequest: null
}); // same Redis container

const gdocQueue = new Queue('gdoc-fetch', { connection });

module.exports = { gdocQueue, connection };