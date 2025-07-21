require('dotenv').config();
const mongoose = require('mongoose');
const { QdrantClient } = require("@qdrant/js-client-rest");

// Import all models
const User = require('./src/models/User');
const Session = require('./src/models/Session');
const Chunk = require('./src/models/Chunk');
const ChatLog = require('./src/models/ChatLog');
const Job = require('./src/models/Job');
const Source = require('./src/models/Source');

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
});

const COLLECTION = "chunks";

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting database cleanup...\n');

    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!MONGO_URI) {
      throw new Error('MONGO_URI or MONGODB_URI environment variable is required');
    }

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');


    // 2. Clear all sessions
    console.log('\n🔐 Clearing all sessions...');
    const sessionCount = await Session.countDocuments();
    await Session.deleteMany({});
    console.log(`✅ Deleted ${sessionCount} sessions`);

    // 3. Clear all chunks
    console.log('\n📄 Clearing all chunks...');
    const chunkCount = await Chunk.countDocuments();
    await Chunk.deleteMany({});
    console.log(`✅ Deleted ${chunkCount} chunks`);

    // 4. Clear all chat logs
    console.log('\n💬 Clearing all chat logs...');
    const chatLogCount = await ChatLog.countDocuments();
    await ChatLog.deleteMany({});
    console.log(`✅ Deleted ${chatLogCount} chat logs`);

    // 5. Clear all jobs
    console.log('\n⚙️ Clearing all jobs...');
    const jobCount = await Job.countDocuments();
    await Job.deleteMany({});
    console.log(`✅ Deleted ${jobCount} jobs`);

    // 6. Clear all sources
    console.log('\n🔗 Clearing all sources...');
    const sourceCount = await Source.countDocuments();
    await Source.deleteMany({});
    console.log(`✅ Deleted ${sourceCount} sources`);

    // 7. Clear all vectors from Qdrant
    console.log('\n🗃️ Clearing all vectors from Qdrant...');
    try {
      // Check if collection exists
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION);
      
      if (exists) {
        // Get collection info to see how many vectors exist
        const collectionInfo = await qdrant.getCollection(COLLECTION);
        const vectorCount = collectionInfo.points_count || 0;
        
        // Delete the entire collection and recreate it (fastest way to clear all vectors)
        await qdrant.deleteCollection(COLLECTION);
        console.log(`✅ Deleted collection with ${vectorCount} vectors`);
        
        // Recreate the collection
        await qdrant.createCollection(COLLECTION, { 
          vectors: { 
            size: 768, 
            distance: "Cosine" 
          } 
        });
        console.log('✅ Recreated empty collection');
      } else {
        console.log('ℹ️ Collection does not exist, nothing to clear');
      }
    } catch (qdrantError) {
      console.error('❌ Error clearing Qdrant vectors:', qdrantError.message);
      console.log('⚠️ Continuing with MongoDB cleanup...');
    }

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Users: ${userCount} deleted`);
    console.log(`   • Sessions: ${sessionCount} deleted`);
    console.log(`   • Chunks: ${chunkCount} deleted`);
    console.log(`   • Chat logs: ${chatLogCount} deleted`);
    console.log(`   • Jobs: ${jobCount} deleted`);
    console.log(`   • Sources: ${sourceCount} deleted`);
    console.log(`   • Vectors: Collection recreated`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the cleanup
cleanupDatabase();