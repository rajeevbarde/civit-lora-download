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
const { createTimeoutMiddleware } = require('../../middleware/timeout');

// Create a longer timeout for the register endpoint
const registerTimeout = createTimeoutMiddleware(1200000); // 20 minutes

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

// Scan for unique loras
router.post('/scan-unique-loras', async (req, res) => {
    try {
        const paths = await pathService.readSavedPaths();
        
        if (!paths.length) {
            return res.status(400).json({ error: 'No saved paths to scan.' });
        }
        
        const dbFileNames = await databaseService.getAllFileNames();
        const result = await fileService.scanUniqueLoras(paths, dbFileNames);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register unregistered files in batch
router.post('/register-unregistered', registerTimeout, async (req, res) => {
    try {
        const { files } = req.body;
        if (!Array.isArray(files) || files.length === 0) {
            console.log('[Register] No files provided.');
            return res.status(400).json({ error: 'No files provided.' });
        }
        console.log(`[Register] Received request to register ${files.length} files.`);
        const result = await databaseService.batchRegisterUnregisteredFiles(files);
        console.log(`[Register] Updated: ${result.updated}, Errors: ${result.errors.length}`);
        res.json(result);
    } catch (error) {
        console.error('[Register] Error during registration:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get filename by modelVersionId
router.get('/filename/:modelVersionId', async (req, res) => {
    try {
        const { modelVersionId } = req.params;
        const result = await databaseService.getFileNameByModelVersionId(modelVersionId);
        
        if (!result) {
            return res.status(404).json({ error: 'Model not found' });
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rename file as duplicate
router.post('/rename-duplicate', validateFilePath, async (req, res) => {
    try {
        const { filePath } = req.body;
        const result = await fileService.renameFileAsDuplicate(filePath);
        res.json(result);
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

// Register lora in database
router.post('/register-lora', async (req, res) => {
    try {
        const { modelId, modelVersionId, fileName, fullPath } = req.body;
        
        if (!modelId || !modelVersionId || !fileName || !fullPath) {
            return res.status(400).json({ error: 'Missing required fields: modelId, modelVersionId, fileName, fullPath' });
        }
        
        const result = await databaseService.registerLoraInDatabase(modelId, modelVersionId, fileName, fullPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify DB file, table, schema, and indexes
router.post('/verify-db', async (req, res) => {
    try {
        const { dbPath } = req.body;
        if (!dbPath) {
            return res.status(400).json({ error: 'dbPath is required' });
        }
        const result = await databaseService.verifyAllCivitDataSchemaAndIndexes(dbPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get safetensor counts for saved paths
router.get('/safetensor-counts', async (req, res) => {
    try {
        const paths = await pathService.readSavedPaths();
        
        if (!paths.length) {
            return res.status(400).json({ error: 'No saved paths to scan.' });
        }
        
        const result = await fileService.getSafetensorCounts(paths);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 