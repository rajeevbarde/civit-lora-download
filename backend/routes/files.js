const express = require('express');
const router = express.Router();
const path = require('path');
const fileService = require('../services/fileService');
const databaseService = require('../services/databaseService');
const pathService = require('../services/pathService');

// Start file scan
router.post('/start-scan', async (req, res) => {
    try {
        const paths = await pathService.readSavedPaths();
        
        if (!paths.length) {
            return res.status(400).json({ error: 'No saved paths to scan.' });
        }
        
        const results = await fileService.scanDirectories(paths);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check files in database
router.post('/check-files-in-db', async (req, res) => {
    try {
        const { files } = req.body;
        if (!Array.isArray(files)) {
            return res.status(400).json({ error: 'files must be an array' });
        }
        
        const dbFileNames = await databaseService.getAllFileNames();
        const results = await fileService.checkFilesInDatabase(files, dbFileNames);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark files as downloaded
router.post('/mark-downloaded', async (req, res) => {
    try {
        const { files } = req.body;
        if (!Array.isArray(files)) {
            return res.status(400).json({ error: 'files must be an array' });
        }
        
        const dbFileNamesToUpdate = [];
        files.forEach(f => {
            let isDownloaded = 0;
            let dbFileName = null;
            if (f.status === 'Present') {
                isDownloaded = 1;
                dbFileName = f.baseName;
            }
            if (isDownloaded && dbFileName) {
                dbFileNamesToUpdate.push({ dbFileName, isDownloaded, fullPath: f.fullPath });
            }
        });
        
        if (dbFileNamesToUpdate.length === 0) {
            return res.json({ updated: 0, errors: [] });
        }
        
        const result = await databaseService.batchUpdateFilesAsDownloaded(dbFileNamesToUpdate);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Validate downloaded files
router.post('/validate-downloaded-files', async (req, res) => {
    try {
        const downloadedFiles = await databaseService.getDownloadedFiles();
        const result = await fileService.validateDownloadedFiles(downloadedFiles);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Find missing files
router.post('/find-missing-files', async (req, res) => {
    try {
        const paths = await pathService.readSavedPaths();
        const dbFileNames = await databaseService.getAllFileNames();
        const result = await fileService.findMissingFiles(paths, dbFileNames);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Compute file hash
router.post('/compute-file-hash', async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'filePath is required' });
        }
        
        const result = await fileService.computeFileHash(filePath);
        res.json(result);
    } catch (error) {
        if (error.message.includes('File not found')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Fix file by renaming and updating database
router.post('/fix-file', async (req, res) => {
    try {
        const { modelVersionId, filePath } = req.body;
        
        if (!modelVersionId || !filePath) {
            return res.status(400).json({ error: 'modelVersionId and filePath are required' });
        }
        
        // Get the DB filename for this modelVersionId
        const dbRecord = await databaseService.getFileNameByModelVersionId(modelVersionId);
        
        if (!dbRecord || !dbRecord.fileName) {
            return res.status(404).json({ error: 'Model not found in database' });
        }
        
        const dbFileName = dbRecord.fileName;
        
        // Fix the file
        const fixResult = await fileService.fixFile(modelVersionId, filePath, dbFileName);
        
        // Update the database
        await databaseService.updateModelAsDownloaded(modelVersionId, fixResult.newPath);
        
        res.json(fixResult);
    } catch (error) {
        if (error.message.includes('File not found')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('already exists')) {
            res.status(409).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router; 