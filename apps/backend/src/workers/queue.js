const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

const fileQueue = new Queue('file-process', { connection });

module.exports = { fileQueue, connection };