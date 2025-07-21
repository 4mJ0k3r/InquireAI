const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

const notionQueue = new Queue('notion-sync', { connection });

module.exports = { notionQueue, connection };