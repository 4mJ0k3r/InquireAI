const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  maxRetriesPerRequest: null
}); // localhost:6379

const fileQueue = new Queue('file-process', { connection });

module.exports = { fileQueue, connection };