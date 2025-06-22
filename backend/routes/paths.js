const express = require('express');
const router = express.Router();
const pathService = require('../services/pathService');

// Save directory path
router.post('/save', async (req, res) => {
    try {
        const { path: dirPath } = req.body;
        const result = await pathService.addPath(dirPath);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get saved paths
router.get('/saved', async (req, res) => {
    try {
        const result = await pathService.getSavedPaths();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a saved path
router.delete('/delete', async (req, res) => {
    try {
        const { path: pathToDelete } = req.body;
        const result = await pathService.deletePath(pathToDelete);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 