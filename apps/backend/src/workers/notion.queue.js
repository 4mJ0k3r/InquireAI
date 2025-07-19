const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  maxRetriesPerRequest: null
}); // same Redis container

const notionQueue = new Queue('notion-sync', { connection });

module.exports = { notionQueue, connection };