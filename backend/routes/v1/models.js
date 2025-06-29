const express = require('express');
const router = express.Router();
const databaseService = require('../../services/databaseService');
const { validatePagination, validateModelVersionId } = require('../../middleware/validation');
const logger = require('../../utils/logger');

// Get models with pagination and filters
router.get('/', validatePagination, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {
            basemodel: req.query.basemodel,
            isDownloaded: req.query.isDownloaded,
            modelNsfw: req.query.modelNsfw,
            versionNsfwLevelRange: req.query.versionNsfwLevelRange
        };

        const result = await databaseService.getModels(page, limit, filters);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get model detail by modelVersionId
router.get('/detail/:id', validateModelVersionId, async (req, res) => {
    try {
        const { id } = req.params;
        const model = await databaseService.getModelDetail(id);
        
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        
        res.json(model);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get base models
router.get('/base-models', async (req, res) => {
    try {
        const result = await databaseService.getBaseModels();
        res.json(result);
    } catch (error) {
        logger.error('Error getting base models:', error);
        res.status(500).json({ error: 'Failed to get base models' });
    }
});

// Search models by filename (case-insensitive)
router.get('/search-by-filename', async (req, res) => {
    try {
        const { filename } = req.query;
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename parameter is required' });
        }
        
        const result = await databaseService.searchModelsByFilename(filename);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get download matrix data
router.get('/download-matrix', async (req, res) => {
    try {
        const result = await databaseService.getDownloadMatrix();
        res.json(result);
    } catch (error) {
        logger.error('Error getting download matrix:', error);
        res.status(500).json({ error: 'Failed to get download matrix data' });
    }
});

module.exports = router; 