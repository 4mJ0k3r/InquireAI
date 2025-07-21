const { Queue } = require('bullmq');
const { connection } = require('./queue');

const slackQueue = new Queue('slack-bot', { connection });

module.exports = { slackQueue };