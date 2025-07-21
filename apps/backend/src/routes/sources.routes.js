const express = require('express');
const Source = require('../models/Source');
const Job = require('../models/Job');
const { notionQueue } = require('../workers/notion.queue');

const router = express.Router();

// GET /sources/list
router.get('/list', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    
    let rows = await Source.find({ tenantId });
    
    // If no sources exist, create default ones
    if (rows.length === 0) {
      const defaultRows = [
        { provider: 'notion', status: 'disconnected', tenantId },
        { provider: 'gdocs', status: 'disconnected', tenantId },
        { provider: 'site-docs', status: 'disconnected', tenantId },
        { provider: 'uploads', status: 'disconnected', tenantId }
      ];
      
      rows = await Source.insertMany(defaultRows);
    }
    
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// POST /sources/:provider/connect
router.post('/:provider/connect', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { provider } = req.params;
    
    if (provider === 'notion') {
      const { apiKey } = req.body;
      
      // Check if user provided API key or if NOTION_TOKEN is configured
      if (!apiKey && !process.env.NOTION_TOKEN) {
        return res.status(400).json({ 
          error: 'Notion API key is required. Please provide your Notion API key.' 
        });
      }
      
      // Validate API key format
      const notionApiKey = apiKey || process.env.NOTION_TOKEN;
      if (!notionApiKey.startsWith('ntn_') && !notionApiKey.startsWith('secret_')) {
        return res.status(400).json({ 
          error: 'Invalid Notion API key format. Please check your API key.' 
        });
      }
      
      // Create a job to track the sync progress
      const job = new Job({
        tenantId,
        type: 'notion-sync',
        status: 'queued',
        progress: 0,
        metadata: {
          provider: 'notion',
          startedAt: new Date(),
          apiKey: notionApiKey // Store the API key for the worker
        }
      });
      
      await job.save();
      
      // Update source status and queue sync job
      await Source.findOneAndUpdate(
        { tenantId, provider: 'notion' },
        { 
          status: 'connected', 
          lastSynced: null,
          metadata: { apiKey: notionApiKey } // Store API key in source metadata
        },
        { upsert: true, new: true }
      );
      
      // Queue the sync job
      const syncJob = await notionQueue.add('sync', { 
        tenantId, 
        jobId: job._id.toString(),
        apiKey: notionApiKey
      });
      
      // Register repeatable job for automatic sync every 2 hours
      await notionQueue.add(
        'sync',
        { tenantId, apiKey: notionApiKey },          // data
        { repeat: { cron: '0 */2 * * *' } }  // every 2 hours
      );
      
      console.log(`🚀 Queued Notion sync job ${syncJob.id} for tenant ${tenantId}`);
      console.log(`⏰ Registered repeatable sync job (every 2 hours) for tenant ${tenantId}`);
      
      res.json({ 
        message: 'sync_started', 
        jobId: job._id.toString(),
        bullJobId: syncJob.id 
      });
      
    } else if (provider === 'gdocs') {
      // Update Google Docs source status to connected
      await Source.findOneAndUpdate(
        { tenantId, provider: 'gdocs' },
        { status: 'connected', lastSynced: null },
        { upsert: true, new: true }
      );
      
      res.json({ message: 'ready' });
      
    } else if (provider === 'site-docs') {
    // Handle site docs connection
    const { url, jobId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required for site docs connection' });
    }

    // Update the source status to connected
    const updatedSource = await Source.findOneAndUpdate(
      { tenantId, provider: 'site-docs' },
      { 
        status: 'connected',
        lastSync: new Date(),
        metadata: { url, jobId }
      },
      { new: true, upsert: true }
    );

    res.json({ 
       message: 'Site docs connection successful',
       source: updatedSource
     });
   } else if (provider === 'uploads') {
     // Handle manual file uploads connection
     // Update the source status to connected
     const updatedSource = await Source.findOneAndUpdate(
       { tenantId, provider: 'uploads' },
       { 
         status: 'connected',
         lastSync: new Date()
       },
       { new: true, upsert: true }
     );

     res.json({ 
       message: 'Uploads connection successful',
       source: updatedSource
     });
   } else if (provider === 'google-docs') {
      // Update Site Docs source status to connected
      await Source.findOneAndUpdate(
        { tenantId, provider: 'site-docs' },
        { status: 'connected', lastSynced: null },
        { upsert: true, new: true }
      );
      
      res.json({ message: 'ready' });
      
    } else {
      // For other providers, just update status (stub behavior)
      await Source.findOneAndUpdate(
        { tenantId, provider },
        { status: 'connected' },
        { upsert: true, new: true }
      );
      
      res.json({ message: 'queued' });
    }
  } catch (error) {
    next(error);
  }
});

// POST /sources/:provider/disconnect - Disconnect a source
router.post('/:provider/disconnect', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { provider } = req.params;
    
    if (provider === 'notion') {
      // Remove repeatable jobs for this tenant
      const repeatableJobs = await notionQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name === 'sync' && job.data?.tenantId === tenantId) {
          await notionQueue.removeRepeatable('sync', job.opts.repeat);
          console.log(`🗑️ Removed repeatable job for tenant ${tenantId}`);
        }
      }
      
      // Update source status to disconnected and clear metadata
      await Source.findOneAndUpdate(
        { tenantId, provider: 'notion' },
        { 
          status: 'disconnected', 
          lastSynced: null,
          metadata: {} // Clear stored API key
        },
        { upsert: true, new: true }
      );
      
      console.log(`🔌 Disconnected Notion for tenant ${tenantId}`);
      res.json({ message: 'disconnected' });
      
    } else {
      // For other providers, just update status to disconnected
      await Source.findOneAndUpdate(
        { tenantId, provider },
        { status: 'disconnected', lastSynced: null },
        { upsert: true, new: true }
      );
      
      res.json({ message: 'disconnected' });
    }
  } catch (error) {
    next(error);
  }
});

// PATCH /sources/notion/schedule - Update sync schedule
router.patch('/notion/schedule', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { cron } = req.body;  // e.g. "0 */4 * * *"
    
    if (!cron) {
      return res.status(400).json({ error: 'cron parameter is required' });
    }
    
    // Remove existing repeatable job
    const repeatableJobs = await notionQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'sync' && job.data?.tenantId === tenantId) {
        await notionQueue.removeRepeatable('sync', job.opts.repeat);
        console.log(`🗑️ Removed existing repeatable job for tenant ${tenantId}`);
      }
    }
    
    // Add new repeatable job with updated cron
    await notionQueue.add('sync', { tenantId }, { repeat: { cron } });
    console.log(`⏰ Updated repeatable sync job for tenant ${tenantId} with cron: ${cron}`);
    
    res.json({ message: 'cron updated', cron });
  } catch (error) {
    next(error);
  }
});

module.exports = router;