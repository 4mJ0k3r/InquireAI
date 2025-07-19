const Job = require('../models/Job');
const Chunk = require('../models/Chunk');
const { splitter } = require('../utils/splitter');
const { embeddings } = require('./embed.service');
const { qdrant, COLLECTION } = require('./qdrant.service');

/**
 * Process raw text through the embedding pipeline
 * @param {Object} options - Processing options
 * @param {string} options.rawText - The text content to process
 * @param {string} options.tenantId - Tenant identifier
 * @param {string} options.docId - Document identifier
 * @param {string} options.provider - Source provider (notion, uploads, etc.)
 * @param {string} options.sourceName - Human readable source name
 * @param {string} options.jobId - Optional job ID for progress tracking
 * @param {Function} options.updateProgress - Optional progress callback
 */
async function processTextChunks(options) {
  const { 
    rawText, 
    tenantId, 
    docId, 
    provider, 
    sourceName, 
    jobId = null,
    updateProgress = () => {}
  } = options;

  console.log(`🚀 Processing text for ${provider}/${sourceName}`);

  try {
    // Step 1: Split into chunks
    console.log(`✂️ Splitting text into chunks...`);
    const chunks = await splitter.splitText(rawText);
    console.log(`📝 Created ${chunks.length} chunks`);
    
    updateProgress(20);

    // Step 2: Generate embeddings
    console.log(`🧠 Generating embeddings for ${chunks.length} chunks...`);
    const vectors = await embeddings.embedDocuments(chunks);
    console.log(`✨ Generated ${vectors.length} embeddings`);
    
    updateProgress(60);

    // Step 3: Prepare points for Qdrant and save chunks to MongoDB
    console.log(`🗃️ Preparing vector points for storage...`);
    const points = [];
    const chunkDocs = [];
    
    for (let i = 0; i < vectors.length; i++) {
      const chunkId = `${docId}_${i}`;
      
      // Prepare Qdrant point
      points.push({
        id: Date.now() * 1000 + i, // Generate unique numeric ID
        vector: vectors[i],
        payload: {
          tenantId: tenantId,
          source: provider,
          docId: docId,
          chunkId: chunkId,
          chunk: chunks[i],
          position: i,
          filename: sourceName,
          fileType: provider === 'notion' ? 'notion-page' : 'text'
        }
      });
      
      // Prepare MongoDB chunk document
      chunkDocs.push({
        tenantId: tenantId,
        docId: docId,
        chunkId: chunkId,
        text: chunks[i],
        source: sourceName,
        position: i,
        page: null
      });
    }
    
    updateProgress(70);

    // Step 4: Save chunks to MongoDB (delete existing chunks first to avoid duplicates)
    console.log(`💾 Saving ${chunkDocs.length} chunks to MongoDB...`);
    
    // Delete existing chunks for this document to avoid duplicates
    const deleteResult = await Chunk.deleteMany({ tenantId, docId });
    if (deleteResult.deletedCount > 0) {
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing chunks for document ${docId}`);
    }
    
    // Insert new chunks
    await Chunk.insertMany(chunkDocs);
    console.log(`✅ Chunks saved to MongoDB`);
    
    updateProgress(80);

    // Step 5: Store in Qdrant (delete existing vectors first to avoid duplicates)
    console.log(`💾 Storing ${points.length} vectors in Qdrant...`);
    
    // Delete existing vectors for this document
    try {
      await qdrant.delete(COLLECTION, {
        filter: {
          must: [
            { key: 'tenantId', match: { value: tenantId } },
            { key: 'docId', match: { value: docId } }
          ]
        }
      });
      console.log(`🗑️ Deleted existing vectors for document ${docId}`);
    } catch (deleteError) {
      console.log(`⚠️ No existing vectors to delete for document ${docId}`);
    }
    
    // Insert new vectors
    await qdrant.upsert(COLLECTION, { points });
    console.log(`✅ Vectors stored successfully`);
    
    updateProgress(90);

    console.log(`✅ Text processing completed - ${chunks.length} chunks embedded and stored`);
    
    return {
      chunksCount: chunks.length,
      vectorsStored: vectors.length
    };
    
  } catch (error) {
    console.error(`❌ Text processing failed:`, error);
    throw error;
  }
}

module.exports = { processTextChunks };