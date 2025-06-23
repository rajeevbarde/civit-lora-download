const express = require('express');
const router = express.Router();
const fileService = require('../../services/fileService');
const pathService = require('../../services/pathService');
const databaseService = require('../../services/databaseService');
const { 
    validateFilePath, 
    validateFilesArray, 
    validateFixFileRequest 
} = require('../../middleware/validation');

// Scan directories for files
router.post('/scan', async (req, res) => {
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

// Check files against database
router.post('/check', validateFilesArray, async (req, res) => {
    try {
        const { files } = req.body;
        const dbFileNames = await databaseService.getAllFileNames();
        const results = await fileService.checkFilesInDatabase(files, dbFileNames);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark files as downloaded
router.post('/mark-downloaded', validateFilesArray, async (req, res) => {
    try {
        const { files } = req.body;
        
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
router.post('/validate', async (req, res) => {
    try {
        const downloadedFiles = await databaseService.getDownloadedFiles();
        const result = await fileService.validateDownloadedFiles(downloadedFiles);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Find missing files
router.post('/find-missing', async (req, res) => {
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
router.post('/compute-hash', validateFilePath, async (req, res) => {
    try {
        const { filePath } = req.body;
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

// Fix file naming
router.post('/fix', validateFixFileRequest, async (req, res) => {
    try {
        const { modelVersionId, filePath } = req.body;
        
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