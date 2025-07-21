require('dotenv').config();
const { embeddings } = require('./src/services/embed.service');
const { qdrant, ensureCollection, COLLECTION } = require('./src/services/qdrant.service');
const mongoose = require('mongoose');

async function testServices() {
  console.log('🧪 Testing services...\n');

  try {
    // Test 1: MongoDB Connection
    console.log('1️⃣ Testing MongoDB connection...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Test 2: Qdrant Connection
    console.log('\n2️⃣ Testing Qdrant connection...');
    const collections = await qdrant.getCollections();
    console.log(`✅ Qdrant connected - Found ${collections.collections.length} collections`);

    // Test 3: Ensure Collection
    console.log('\n3️⃣ Testing Qdrant collection...');
    await ensureCollection();
    console.log('✅ Qdrant collection ready');

    // Test 4: Embedding Service
    console.log('\n4️⃣ Testing embedding service...');
    const testText = ['Hello world', 'This is a test'];
    const vectors = await embeddings.embedDocuments(testText);
    console.log(`✅ Embeddings generated - ${vectors.length} vectors of dimension ${vectors[0].length}`);

    // Test 5: Qdrant Storage
    console.log('\n5️⃣ Testing Qdrant storage...');
    const testPoints = [{
      id: Date.now(),
      vector: vectors[0],
      payload: {
        tenantId: 'test',
        docId: 'test-doc',
        chunk: 'Hello world',
        test: true
      }
    }];
    
    await qdrant.upsert(COLLECTION, { points: testPoints });
    console.log('✅ Qdrant storage successful');

    // Test 6: Cleanup test data
    console.log('\n6️⃣ Cleaning up test data...');
    await qdrant.delete(COLLECTION, {
      filter: {
        must: [{ key: 'test', match: { value: true } }]
      }
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All services are working correctly!');

  } catch (error) {
    console.error('\n❌ Service test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from services');
  }
}

testServices();