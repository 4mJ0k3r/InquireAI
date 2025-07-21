const express = require('express');
const multer = require('multer');
const Job = require('../models/Job');
const Chunk = require('../models/Chunk');
const { fileQueue } = require('../workers/queue');
const { gdocQueue } = require('../workers/gdoc.queue');
const { siteQueue } = require('../queues/site.queue');
const sseMiddleware = require('../middlewares/sse.middleware');
const { embeddings } = require('../services/embed.service');
const { qdrant, COLLECTION } = require('../services/qdrant.service');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Job position counter to track even/odd positions
let jobPositionCounter = 0;

// POST /docs/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const tenantId = req.user.tenantId;
    const { originalname: originalName, path: filePath } = req.file;

    // Create job document in MongoDB
    const job = new Job({
      tenantId,
      status: 'pending',
      progress: 0,
      metadata: {
        originalName,
        filePath,
        uploadedAt: new Date()
      }
    });

    await job.save();

    // Add jobs to queue with position tracking
    jobPositionCounter++;
    
    // Add the actual job
    await fileQueue.add('process-file', {
      jobId: job._id.toString(),
      filePath,
      tenantId,
      provider: 'uploads',
      originalName
    });

    // If position is even and greater than 1, add garbage job to maintain odd positioning
    if (jobPositionCounter > 1 && jobPositionCounter % 2 === 0) {
      await fileQueue.add('garbage-job', {
        isGarbageJob: true,
        purpose: 'maintain-odd-positioning',
        position: jobPositionCounter + 1,
        createdAt: new Date()
      });
    }

    res.json({
      message: 'File uploaded successfully',
      jobId: job._id,
      filename: originalName
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /docs/crawl-site - Crawl a website/documentation site
router.post('/crawl-site', async (req, res, next) => {
  try {
    const { url } = req.body;
    const tenantId = req.user.tenantId;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ 
        error: 'URL must start with http:// or https://' 
      });
    }
    
    let host;
    try {
      host = new URL(url).host;
    } catch (urlError) {
      return res.status(400).json({ 
        error: 'Invalid URL format' 
      });
    }
    
    // Create a Job document in MongoDB
    const job = new Job({
      sourceId: null,
      status: 'pending',
      progress: 0,
      tenantId,
      type: 'site-crawl',
      metadata: {
        originalUrl: url,
        host,
        provider: 'site-docs'
      }
    });
    
    await job.save();
    
    // Add job to BullMQ queue
    await siteQueue.add('crawl', {
      jobId: job._id.toString(),
      url,
      host,
      tenantId,
      provider: 'site-docs'
    });
    
    res.json({ jobId: job._id });
    
  } catch (error) {
    console.error('Site crawl error:', error);
    next(error);
  }
});

// POST /docs/fetch-gdoc - Import Google Docs by URL
router.post('/fetch-gdoc', async (req, res, next) => {
  try {
    const { url } = req.body;
    const tenantId = req.user.tenantId;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Extract file ID from Google Docs URL
    let docId;
    let exportUrl;
    
    // Handle different Google Docs URL formats
    const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    
    if (docMatch) {
      // Format: https://docs.google.com/document/d/FILE_ID/edit
      docId = docMatch[1];
      exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    } else if (driveMatch) {
      // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
      docId = driveMatch[1];
      exportUrl = `https://drive.google.com/uc?export=download&id=${docId}`;
    } else {
      return res.status(400).json({ 
        error: 'Invalid Google Docs URL. Please provide a valid Google Docs or Drive link.' 
      });
    }
    
    // Create a Job document in MongoDB
    const job = new Job({
      sourceId: null,
      status: 'pending',
      progress: 0,
      tenantId,
      type: 'gdoc-fetch',
      metadata: {
        originalUrl: url,
        docId,
        exportUrl,
        provider: 'gdocs'
      }
    });
    
    await job.save();
    
    // Add job to BullMQ queue
    await gdocQueue.add('fetch-gdoc', {
      jobId: job._id.toString(),
      url: exportUrl,
      docId,
      tenantId,
      provider: 'gdocs'
    });
    
    res.json({ jobId: job._id });
    
  } catch (error) {
    console.error('Google Docs fetch error:', error);
    next(error);
  }
});

// GET /docs/jobs/:id/stream - Server-sent events for job progress
router.get('/jobs/:id/stream', sseMiddleware, async (req, res, next) => {
  try {
    res.initSSE();

    // Poll MongoDB Job document every 1 second
    const timer = setInterval(async () => {
      try {
        const job = await Job.findById(req.params.id);
        
        if (!job) {
          res.sseSend({ error: 'Job not found' });
          clearInterval(timer);
          res.end();
          return;
        }

        res.sseSend({ 
          progress: job.progress, 
          status: job.status,
          jobId: job._id
        });

        if (job.status === 'done' || job.status === 'failed') {
          clearInterval(timer);
          res.end();
        }
      } catch (error) {
        res.sseSend({ error: 'Error fetching job status' });
        clearInterval(timer);
        res.end();
      }
    }, 1000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(timer);
    });

  } catch (error) {
    next(error);
  }
});

// GET /docs/search - Quick search test route (temporary debugging tool)
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    const tenantId = req.user.tenantId;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Generate embedding for the query
    const queryVec = await embeddings.embedQuery(q);
    
    // Search in Qdrant
    const searchResults = await qdrant.search(COLLECTION, {
      vector: queryVec,
      limit: 3,
      filter: { 
        must: [{ 
          key: 'tenantId', 
          match: { value: tenantId } 
        }] 
      }
    });

    // Format results
    const results = searchResults.map(result => ({
      score: result.score,
      chunk: result.payload.chunk,
      filename: result.payload.filename,
      position: result.payload.position,
      docId: result.payload.docId
    }));

    res.json({ 
      query: q,
      results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    next(error);
  }
});

// GET /docs/snippet/:chunkId - Get snippet for a specific chunk
router.get('/snippet/:chunkId', async (req, res, next) => {
  try {
    const { chunkId } = req.params;
    const { docId } = req.query;
    const tenantId = req.user.tenantId;
    
    if (!chunkId) {
      return res.status(400).json({ error: 'Chunk ID is required' });
    }

    const chunk = await Chunk.findOne({
      tenantId: tenantId,
      docId: docId,
      chunkId: chunkId
    }).lean();

    if (!chunk) {
      return res.status(404).json({ error: 'Chunk not found' });
    }

    res.json({
      text: chunk.text,
      source: chunk.source,
      position: chunk.position,
      page: chunk.page,
      chunkId: chunk.chunkId
    });
    
  } catch (error) {
    console.error('Snippet fetch error:', error);
    next(error);
  }
});

module.exports = router;