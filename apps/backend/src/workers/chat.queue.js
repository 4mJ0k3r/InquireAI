const { Queue } = require('bullmq');

const chatQueue = new Queue('chat', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

module.exports = { chatQueue };