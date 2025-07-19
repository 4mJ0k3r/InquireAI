const { Schema, model } = require('mongoose');

const ChunkSchema = new Schema({
  tenantId:  { type: String, required: true },
  docId:     { type: String, required: true },
  chunkId:   { type: String, required: true, unique: true },
  text:      { type: String, required: true },
  source:    { type: String, required: true },   // file name or URL
  position:  { type: Number, required: true },   // order index
  page:      { type: Number, default: null },    // if PDF
}, {
  timestamps: true
});

// Index for efficient queries
ChunkSchema.index({ tenantId: 1, docId: 1, chunkId: 1 });

module.exports = model('Chunk', ChunkSchema);