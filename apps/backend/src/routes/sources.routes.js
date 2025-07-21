const express = require('express');
const Source = require('../models/Source');
const Job = require('../models/Job');
const { notionQueue } = require('../workers/notion.queue');
const { slackQueue } = require('../workers/slack.queue');

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
        { provider: 'uploads', status: 'disconnected', tenantId },
        { provider: 'slack-bot', status: 'disconnected', tenantId }
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
   } else if (provider === 'slack-bot') {
     // Handle Slack bot connection
     const { apiKey, channelName } = req.body;
     
     if (!apiKey || !channelName) {
       return res.status(400).json({ 
         error: 'Both API key and channel name are required for Slack bot connection' 
       });
     }
     
     // Validate API key format (should start with 'xoxb-')
     if (!apiKey.startsWith('xoxb-')) {
       return res.status(400).json({ 
         error: 'Invalid Slack Bot API key format. Please check your API key.' 
       });
     }
     
     try {
       // Test the Slack API connection
       const { WebClient } = require('@slack/web-api');
       const slackClient = new WebClient(apiKey);
       
       // Test auth and get bot info
       const authTest = await slackClient.auth.test();
       
       // Verify channel exists and bot has access by trying to send a test message
       let channelInfo;
       let finalChannelName = channelName;
       
       try {
         // Try to send a test message to verify access
         const testMessage = await slackClient.chat.postMessage({
           channel: channelName,
           text: '🤖 Bot connected successfully! This message confirms the connection is working.',
           as_user: true
         });
         
         // Create a mock channel info object since we can't get the actual info
         channelInfo = {
           channel: {
             id: testMessage.channel,
             name: channelName
           }
         };
         finalChannelName = channelName;
         
       } catch (error) {
         // Handle specific Slack API errors for message sending
         if (error.data?.error === 'channel_not_found') {
           throw new Error('Channel not found. Please make sure the channel exists.');
         } else if (error.data?.error === 'not_in_channel') {
           throw new Error('Bot is not invited to the channel. Please invite the bot to the channel first.');
         } else if (error.data?.error === 'missing_scope') {
           throw new Error('Bot is missing required permissions. Please add chat:write scope to your bot.');
         } else {
           throw new Error('Channel not found or bot not invited to channel');
         }
       }
       
       // Update source status to connected
       const updatedSource = await Source.findOneAndUpdate(
         { tenantId, provider: 'slack-bot' },
         { 
           status: 'connected',
           lastSync: new Date(),
           metadata: { 
             apiKey: apiKey,
             channelName: finalChannelName,
             botUserId: authTest.user_id,
             channelId: channelInfo.channel.id
           }
         },
         { new: true, upsert: true }
       );

       console.log(`🤖 Connected Slack bot for tenant ${tenantId} to channel #${finalChannelName}`);
       
       // Start the Slack bot worker
       console.log(`🔄 Queuing Slack bot worker job for tenant ${tenantId}`);
       const job = await slackQueue.add('start-slack-bot', { action: 'start', tenantId });
       console.log(`✅ Slack bot worker job queued with ID: ${job.id}`);
       
       res.json({ 
         message: 'Slack bot connection successful',
         source: updatedSource
       });
       
     } catch (error) {
       console.error('Slack connection error:', error);
       
       // Handle specific Slack API errors
       let errorMessage = 'Failed to connect to Slack. Please check your API key and channel name.';
       if (error.data?.error === 'invalid_auth') {
         errorMessage = 'Invalid Slack API key. Please check your token.';
       } else if (error.data?.error === 'channel_not_found') {
         errorMessage = 'Channel not found. Please make sure the channel exists and the bot is invited to it.';
       } else if (error.data?.error === 'not_in_channel') {
         errorMessage = 'Bot is not in the channel. Please invite the bot to the channel first.';
       } else if (error.data?.error === 'missing_scope') {
         errorMessage = 'Bot is missing required permissions. Please add chat:write and channels:read scopes.';
       } else if (error.message === 'Channel not found or bot not invited to channel') {
         errorMessage = 'Channel not found or bot not invited. Please check:\n1. Channel name is correct\n2. Bot is invited to the channel\n3. You have permission to access the channel';
       }
       
       return res.status(400).json({ error: errorMessage });
     }
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
      
    } else if (provider === 'slack-bot') {
      // Update Slack bot source status to disconnected and clear metadata
      await Source.findOneAndUpdate(
        { tenantId, provider: 'slack-bot' },
        { 
          status: 'disconnected', 
          lastSynced: null,
          metadata: {} // Clear stored API key and channel info
        },
        { upsert: true, new: true }
      );
      
      console.log(`🤖 Disconnected Slack bot for tenant ${tenantId}`);
      
      // Stop the Slack bot worker
      await slackQueue.add('stop-slack-bot', { action: 'stop', tenantId });
      
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