const { Schema, model } = require('mongoose');

const JobSchema = new Schema({
  sourceId:  { type: Schema.Types.ObjectId, ref: 'Source' },
  status:    { type: String, default: 'pending' },
  progress:  { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  tenantId:  { type: String, required: true },
  metadata:  { type: Schema.Types.Mixed, default: {} },
});

module.exports = model('Job', JobSchema);