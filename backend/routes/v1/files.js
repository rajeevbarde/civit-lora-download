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
const fs = require('fs').promises;

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

// Scan for duplicate filenames across all folders
router.post('/scan-duplicate-filenames', async (req, res) => {
    try {
        const paths = await pathService.readSavedPaths();
        
        if (!paths.length) {
            return res.status(400).json({ error: 'No saved paths to scan.' });
        }
        
        const result = await fileService.scanDuplicateFilenames(paths);
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



// Get the latest publishedAt value
router.get('/latest-published-at', async (req, res) => {
    try {
        const latest = await databaseService.getLatestPublishedAt();
        res.json({ latest });
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

// Reset all rows in ALLCivitData
router.post('/reset-db', async (req, res) => {
    try {
        const result = await databaseService.resetAllCivitData();
        res.json({ success: true, message: 'Database reset successfully', changes: result.changes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete file and mark as failed (isdownloaded=3, file_path=null)
router.post('/delete-and-fail', async (req, res) => {
    try {
        const { modelVersionId, file_path } = req.body;
        if (!modelVersionId || !file_path) {
            return res.status(400).json({ error: 'modelVersionId and file_path are required' });
        }
        // Delete the file from disk
        const fs = require('fs');
        if (fs.existsSync(file_path)) {
            fs.unlinkSync(file_path);
        } else {
            return res.status(404).json({ error: 'File not found on disk' });
        }
        // Update the DB: isdownloaded=3, file_path=null
        await databaseService.runUpdateMarkAsFailed(modelVersionId);
        res.json({ success: true, message: 'File deleted and DB updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unregister file (set isdownloaded=0, file_path=null) - for files not found on disk
router.post('/unregister', async (req, res) => {
    try {
        const { modelVersionId } = req.body;
        if (!modelVersionId) {
            return res.status(400).json({ error: 'modelVersionId is required' });
        }
        // Update the DB: isdownloaded=0, file_path=null
        await databaseService.updateModelAsInProgress(modelVersionId);
        res.json({ success: true, message: 'File unregistered from database' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Read JSON file content
router.get('/read-json', async (req, res) => {
    try {
        const { path } = req.query;
        
        if (!path) {
            return res.status(400).json({ error: 'path parameter is required' });
        }
        
        const fs = require('fs');
        const pathModule = require('path');
        
        // Resolve path relative to project root (three levels up from routes/v1 directory)
        const projectRoot = pathModule.resolve(__dirname, '../../../');
        const fullPath = pathModule.join(projectRoot, path);
        
        // Validate the path to prevent directory traversal attacks
        const normalizedPath = pathModule.normalize(fullPath);
        

        
        // Ensure the path is within the project directory
        if (!normalizedPath.startsWith(projectRoot) || normalizedPath.includes('..')) {
            return res.status(400).json({ error: 'Invalid path' });
        }
        
        // Check if file exists
        if (!fs.existsSync(normalizedPath)) {
            console.log(`[read-json] File not found: ${normalizedPath}`);
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Check if it's a JSON file
        if (!normalizedPath.toLowerCase().endsWith('.json')) {
            return res.status(400).json({ error: 'File must be a JSON file' });
        }
        
        // Read and parse the JSON file
        const fileContent = fs.readFileSync(normalizedPath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        res.json(jsonData);
    } catch (error) {
        if (error instanceof SyntaxError) {
            res.status(400).json({ error: 'Invalid JSON file' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Add this endpoint to get file creation date
router.post('/file/created-date', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
    }
    try {
        const stats = await fs.stat(filePath);
        return res.json({ createdDate: stats.birthtime });
    } catch (err) {
        return res.status(500).json({ error: 'Could not get file creation date', details: err.message });
    }
});

module.exports = router; 