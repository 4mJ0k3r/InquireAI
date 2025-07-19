const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

// Set the environment variable that GoogleGenerativeAIEmbeddings expects
process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/embedding-001"
});

module.exports = { embeddings };