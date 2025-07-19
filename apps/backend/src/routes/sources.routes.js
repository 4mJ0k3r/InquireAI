const express = require('express');
const Source = require('../models/Source');
const Job = require('../models/Job');
const { notionQueue } = require('../workers/notion.queue');

const router = express.Router();

// GET /sources/list
router.get('/list', async (req, res, next) => {
  try {
    const tenantId = req.tenant.tenantId;
    
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
    const tenantId = req.tenant.tenantId;
    const { provider } = req.params;
    
    if (provider === 'notion') {
      // Check if NOTION_TOKEN is configured
      if (!process.env.NOTION_TOKEN) {
        return res.status(400).json({ 
          error: 'Notion integration not configured. Please add NOTION_TOKEN to environment variables.' 
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
          startedAt: new Date()
        }
      });
      
      await job.save();
      
      // Update source status and queue sync job
      await Source.findOneAndUpdate(
        { tenantId, provider: 'notion' },
        { status: 'connected', lastSynced: null },
        { upsert: true, new: true }
      );
      
      // Queue the sync job
      const syncJob = await notionQueue.add('sync', { 
        tenantId, 
        jobId: job._id.toString() 
      });
      
      // Register repeatable job for automatic sync every 2 hours
      await notionQueue.add(
        'sync',
        { tenantId },          // data
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

// PATCH /sources/notion/schedule - Update sync schedule
router.patch('/notion/schedule', async (req, res, next) => {
  try {
    const tenantId = req.tenant.tenantId;
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