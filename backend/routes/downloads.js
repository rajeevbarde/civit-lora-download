const express = require('express');
const router = express.Router();
const downloadService = require('../services/downloadService');
const downloadQueue = require('../services/downloadQueue');

// Download model file
router.post('/model-file', async (req, res) => {
    try {
        const { url, fileName, baseModel, modelVersionId } = req.body;
        
        if (!url || !fileName || !baseModel || !modelVersionId) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        
        // Return immediately and process download in background
        res.json({ success: true, message: 'Download queued' });
        
        // Add download task to queue
        downloadQueue.add(async () => {
            await downloadService.downloadModelFile(url, fileName, baseModel, modelVersionId);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get download status
router.get('/status', (req, res) => {
    try {
        const status = downloadQueue.getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 