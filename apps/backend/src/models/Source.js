const { Schema, model } = require('mongoose');

const SourceSchema = new Schema({
  provider:  { type: String, required: true },  // 'notion' | 'gdocs' | ...
  status:    { type: String, default: 'disconnected' },
  lastSynced:{ type: Date, default: null },
  tenantId:  { type: String, required: true },
});

module.exports = model('Source', SourceSchema);