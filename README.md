# InquireAI - Intelligent Document Chatbot

A powerful AI-powered chatbot that can process documents, sync with Notion, crawl websites, and provide intelligent responses based on your knowledge base using RAG (Retrieval-Augmented Generation).

## 🚀 Features

- **📄 Document Processing**: Upload and process PDF, DOCX, and text files
- **🔗 Notion Integration**: Sync with Notion workspaces automatically
- **🕷️ Website Crawling**: Extract content from websites and sitemaps
- **💬 Intelligent Chat**: AI-powered responses using your document knowledge base
- **🔍 Vector Search**: Advanced semantic search using Qdrant vector database
- **⚡ Real-time Processing**: Background job processing with Redis queues
- **🔐 Secure Authentication**: JWT-based user authentication
- **📊 Multi-tenant**: Support for multiple users with data isolation

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for document and user data storage
- **Qdrant** vector database for semantic search
- **Redis** for job queues and caching
- **Bull** for background job processing
- **OpenAI/Gemini** for AI responses
- **JWT** for authentication

### Frontend
- **React** with modern hooks
- **Tailwind CSS** for styling
- **Socket.io** for real-time chat
- **Axios** for API communication

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Redis
- Qdrant vector database
- OpenAI API key or Google Gemini API key

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/4mJ0k3r/InquireAI.git
   cd InquireAI/chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd apps/backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```
   
   Configure your `.env` file with:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/inquireai
   REDIS_URL=redis://localhost:6379
   QDRANT_URL=http://localhost:6333
   
   # AI Services
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   
   # Authentication
   JWT_SECRET=your_jwt_secret_key
   
   # Server
   PORT=4000
   NODE_ENV=development
   ```

4. **Start the services**
   
   Make sure you have the required services running:
   - MongoDB
   - Redis
   - Qdrant
   
   You can use Docker for easy setup:
   ```bash
   # Start Qdrant
   docker run -p 6333:6333 qdrant/qdrant
   
   # Start Redis
   docker run -p 6379:6379 redis:alpine
   ```

5. **Run the application**
   ```bash
   # Start backend (from chatbot directory)
   npm run dev
   
   # Start frontend (in another terminal)
   cd apps/frontend
   npm start
   ```

## 🎯 Usage

### 1. Authentication
- Register a new account or login
- JWT tokens are used for secure API access

### 2. Document Upload
- Upload PDF, DOCX, or text files
- Files are automatically processed and embedded into the vector database
- Concurrent uploads are supported with intelligent job queue management

### 3. Notion Integration
- Connect your Notion workspace
- Automatic syncing every 2 hours
- Manual sync available
- Pages are processed and made searchable

### 4. Website Crawling
- Enter a website URL to crawl
- Automatic sitemap detection
- Content extraction and processing
- Configurable crawl limits

### 5. Chat Interface
- Ask questions about your documents
- Real-time streaming responses
- Source citations included
- Context-aware answers using RAG

## 🏗️ Architecture

### Job Queue System
The application uses a sophisticated job queue system with Redis and Bull:

- **Upload Worker**: Processes file uploads and text extraction
- **Chat Worker**: Handles AI chat responses with streaming
- **Notion Worker**: Syncs Notion workspace content
- **Crawler Worker**: Processes website crawling jobs
- **Google Docs Worker**: Handles Google Docs imports

### Garbage Job Management
A unique feature that ensures job queue stability during concurrent operations:
- Garbage jobs are inserted at even positions to maintain odd positioning for real jobs
- Prevents race conditions during high-concurrency uploads
- Ensures 100% success rate for concurrent file processing

### Vector Search Pipeline
1. **Text Extraction**: PDF/DOCX → Raw text
2. **Chunking**: Split into semantic chunks
3. **Embedding**: Generate vector embeddings
4. **Storage**: Store in Qdrant with metadata
5. **Search**: Semantic similarity search for chat responses

## 📁 Project Structure

```
chatbot/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── models/          # MongoDB schemas
│   │   │   ├── routes/          # API endpoints
│   │   │   ├── services/        # Business logic
│   │   │   ├── workers/         # Background job processors
│   │   │   ├── middlewares/     # Express middlewares
│   │   │   └── utils/           # Utility functions
│   │   ├── uploads/             # File upload directory
│   │   └── server.js            # Express server
│   └── frontend/
│       ├── src/
│       │   ├── components/      # React components
│       │   ├── pages/           # Page components
│       │   ├── services/        # API services
│       │   └── utils/           # Utility functions
│       └── public/              # Static assets
├── package.json                 # Root package.json
└── README.md                    # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Documents
- `POST /docs/upload` - Upload files
- `GET /docs` - List user documents
- `DELETE /docs/:id` - Delete document
- `GET /docs/search` - Search documents

### Sources
- `POST /sources/notion/connect` - Connect Notion
- `POST /sources/notion/sync` - Manual Notion sync
- `POST /sources/crawl` - Crawl website
- `GET /sources` - List connected sources

### Chat
- `POST /chat` - Start new chat
- `GET /chat/stream/:chatId` - Stream chat responses

## 🚀 Deployment

### Using Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Using Docker
```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment
1. Set up production environment variables
2. Build the frontend: `npm run build`
3. Start the backend: `npm start`
4. Configure reverse proxy (nginx/Apache)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- Google for Gemini AI
- Qdrant for vector database
- The open-source community for amazing tools and libraries

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/4mJ0k3r/InquireAI/issues) page
2. Create a new issue with detailed description
3. Join our community discussions

---

**Built with ❤️ for the AI Agent Hackathon**