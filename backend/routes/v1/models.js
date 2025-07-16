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
        const searchQuery = req.query.searchQuery || null;

        const result = await databaseService.getModels(page, limit, filters, searchQuery);
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

// Get metadata statistics
router.get('/metadata-statistics', async (req, res) => {
    try {
        const result = await databaseService.getMetadataStatistics();
        res.json(result);
    } catch (error) {
        logger.error('Error getting metadata statistics:', error);
        res.status(500).json({ error: 'Failed to get metadata statistics' });
    }
});

// Fetch and save metadata from CivitAI API (Step 1)
router.post('/fetch-metadata', async (req, res) => {
    try {
        const { forceUpdate = false } = req.body;
        const metadataService = require('../../services/metadataService');
        const result = await metadataService.fetchAndSaveMetadata(forceUpdate);
        res.json(result);
    } catch (error) {
        logger.error('Error fetching metadata:', error);
        res.status(500).json({ error: 'Failed to fetch metadata' });
    }
});

// Get registered LoRAs that need metadata
router.get('/registered-loras', async (req, res) => {
    try {
        const { forceUpdate = false } = req.query;
        const metadataService = require('../../services/metadataService');
        const result = await metadataService.getRegisteredLoras(forceUpdate === 'true');
        res.json(result);
    } catch (error) {
        logger.error('Error getting registered LoRAs:', error);
        res.status(500).json({ error: 'Failed to get registered LoRAs' });
    }
});

// Fetch metadata for a single LoRA
router.post('/fetch-metadata-single', async (req, res) => {
    try {
        const { modelId, modelVersionId, forceUpdate = false } = req.body;
        if (!modelId || !modelVersionId) {
            return res.status(400).json({ error: 'modelId and modelVersionId are required' });
        }
        
        const metadataService = require('../../services/metadataService');
        const result = await metadataService.fetchSingleLoRAMetadata(modelId, modelVersionId, forceUpdate);
        res.json(result);
    } catch (error) {
        logger.error('Error fetching single LoRA metadata:', error);
        res.status(500).json({ error: 'Failed to fetch single LoRA metadata' });
    }
});

// Create model folders for metadata (Step 2)
router.post('/create-model-folders', async (req, res) => {
    try {
        const metadataService = require('../../services/metadataService');
        const result = await metadataService.createModelFolders();
        res.json(result);
    } catch (error) {
        logger.error('Error creating model folders:', error);
        res.status(500).json({ error: 'Failed to create model folders' });
    }
});

// Get latest updated checkpoints
router.get('/latest-updated-checkpoints', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await databaseService.getLatestUpdatedCheckpoints(limit);
        res.json(result);
    } catch (error) {
        logger.error('Error getting latest updated checkpoints:', error);
        res.status(500).json({ error: 'Failed to get latest updated checkpoints' });
    }
});

// Get total row count from ALLCivitData
router.get('/row-count', async (req, res) => {
    try {
        const total = await databaseService.getAllCivitDataRowCount();
        res.json({ total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get related LoRA by modelId
router.get('/related-lora/:modelId', async (req, res) => {
    try {
        const { modelId } = req.params;
        if (!modelId || modelId.trim() === '') {
            return res.status(400).json({ error: 'modelId is required' });
        }
        const result = await databaseService.getRelatedLoraByModelId(modelId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark model as ignored
router.post('/ignore', async (req, res) => {
    try {
        const { modelVersionId } = req.body;
        if (!modelVersionId) {
            return res.status(400).json({ error: 'modelVersionId is required' });
        }
        await databaseService.markModelAsIgnored(modelVersionId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download JSON metadata without updating database
router.post('/download-json-metadata', async (req, res) => {
    try {
        const { modelId, modelVersionId, updateDatabase = false } = req.body;
        
        if (!modelId || !modelVersionId) {
            return res.status(400).json({ error: 'modelId and modelVersionId are required' });
        }
        
        const metadataService = require('../../services/metadataService');
        const result = await metadataService.downloadJsonMetadataOnly(modelId, modelVersionId, updateDatabase);
        res.json(result);
    } catch (error) {
        logger.error('Error downloading JSON metadata:', error);
        res.status(500).json({ error: 'Failed to download JSON metadata' });
    }
});

module.exports = router; 