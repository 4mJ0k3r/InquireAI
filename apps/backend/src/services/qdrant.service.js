const { QdrantClient } = require("@qdrant/js-client-rest");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
});

const COLLECTION = "chunks";

// Make sure collection exists (run once on startup)
async function ensureCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION);
    
    if (!exists) {
      console.log(`🗃️ Creating Qdrant collection: ${COLLECTION}`);
      await qdrant.createCollection(COLLECTION, { 
        vectors: { 
          size: 768, 
          distance: "Cosine" 
        } 
      });
      console.log(`✅ Collection ${COLLECTION} created successfully`);
    } else {
      console.log(`✅ Collection ${COLLECTION} already exists`);
    }
  } catch (error) {
    console.error('❌ Error ensuring Qdrant collection:', error);
    throw error;
  }
}

module.exports = { qdrant, ensureCollection, COLLECTION };