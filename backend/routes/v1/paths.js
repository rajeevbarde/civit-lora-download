const express = require('express');
const router = express.Router();
const pathService = require('../../services/pathService');
const { validatePath } = require('../../middleware/validation');

// Get all saved paths
router.get('/', async (req, res) => {
    try {
        const result = await pathService.getSavedPaths();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new path
router.post('/', validatePath, async (req, res) => {
    try {
        const { path: dirPath } = req.body;
        const result = await pathService.addPath(dirPath);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a path
router.delete('/', validatePath, async (req, res) => {
    try {
        const { path: pathToDelete } = req.body;
        const result = await pathService.deletePath(pathToDelete);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 