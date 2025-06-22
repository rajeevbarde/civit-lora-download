// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { SERVER_CONFIG } = require('./config/constants');
const { validateDatabase, db } = require('./config/database');
const logger = require('./utils/logger');
const { timeoutMiddleware } = require('./middleware/timeout');
const { 
    validatePagination, 
    validateModelVersionId, 
    validateFilePath, 
    validateDownloadRequest, 
    validateFilesArray, 
    validatePath, 
    validateFixFileRequest 
} = require('./middleware/validation');

// Import services
const databaseService = require('./services/databaseService');
const fileService = require('./services/fileService');
const pathService = require('./services/pathService');
const downloadService = require('./services/downloadService');
const downloadQueue = require('./services/downloadQueue');

// Import routes
const modelsRoutes = require('./routes/models');
const pathsRoutes = require('./routes/paths');
const filesRoutes = require('./routes/files');
const downloadsRoutes = require('./routes/downloads');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: SERVER_CONFIG.jsonLimit }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.url, res.statusCode, duration);
    });
    
    next();
});

// Route handlers with appropriate timeouts
app.use('/api/models', timeoutMiddleware.normal, modelsRoutes);
app.use('/api/paths', timeoutMiddleware.normal, pathsRoutes);
app.use('/api/files', timeoutMiddleware.file, filesRoutes);
app.use('/api/downloads', timeoutMiddleware.download, downloadsRoutes);

// Legacy route mappings for backward compatibility with appropriate timeouts
app.get('/api/models', timeoutMiddleware.normal, validatePagination, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {
            basemodel: req.query.basemodel,
            isDownloaded: req.query.isDownloaded,
            modelVersionId: req.query.modelVersionId
        };
        const result = await databaseService.getModels(page, limit, filters);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/modeldetail/:id', timeoutMiddleware.normal, validateModelVersionId, async (req, res) => {
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

app.get('/api/basemodels', timeoutMiddleware.quick, async (req, res) => {
    try {
        const result = await databaseService.getBaseModels();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/summary-matrix', timeoutMiddleware.normal, async (req, res) => {
    try {
        const result = await databaseService.getSummaryMatrix();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/summary-matrix-downloaded', timeoutMiddleware.normal, async (req, res) => {
    try {
        const result = await databaseService.getDownloadedSummaryMatrix();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy path routes
app.post('/api/save-path', timeoutMiddleware.quick, validatePath, async (req, res) => {
    try {
        const { path: dirPath } = req.body;
        const result = await pathService.addPath(dirPath);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/saved-path', timeoutMiddleware.quick, async (req, res) => {
    try {
        const result = await pathService.getSavedPaths();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/saved-path', timeoutMiddleware.quick, validatePath, async (req, res) => {
    try {
        const { path: pathToDelete } = req.body;
        const result = await pathService.deletePath(pathToDelete);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Legacy file routes
app.post('/api/start-scan', timeoutMiddleware.file, async (req, res) => {
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

app.post('/api/check-files-in-db', timeoutMiddleware.file, validateFilesArray, async (req, res) => {
    try {
        const { files } = req.body;
        const dbFileNames = await databaseService.getAllFileNames();
        const results = await fileService.checkFilesInDatabase(files, dbFileNames);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/mark-downloaded', timeoutMiddleware.normal, validateFilesArray, async (req, res) => {
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

app.post('/api/validate-downloaded-files', timeoutMiddleware.file, async (req, res) => {
    try {
        const downloadedFiles = await databaseService.getDownloadedFiles();
        const result = await fileService.validateDownloadedFiles(downloadedFiles);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/find-missing-files', timeoutMiddleware.file, async (req, res) => {
    try {
        const paths = await pathService.readSavedPaths();
        const dbFileNames = await databaseService.getAllFileNames();
        const result = await fileService.findMissingFiles(paths, dbFileNames);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/compute-file-hash', timeoutMiddleware.file, validateFilePath, async (req, res) => {
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

app.post('/api/fix-file', timeoutMiddleware.file, validateFixFileRequest, async (req, res) => {
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

// Legacy download routes
app.post('/api/download-model-file', timeoutMiddleware.download, validateDownloadRequest, async (req, res) => {
    try {
        const { url, fileName, baseModel, modelVersionId } = req.body;
        
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

app.get('/api/download-status', timeoutMiddleware.quick, (req, res) => {
    try {
        const status = downloadQueue.getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/download-status/clear-errors', timeoutMiddleware.quick, (req, res) => {
    try {
        downloadQueue.clearErrors();
        res.json({ message: 'Download errors cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', timeoutMiddleware.quick, (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Graceful shutdown handling
let server;

function gracefulShutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    if (server) {
        server.close((err) => {
            if (err) {
                logger.error('Error during server shutdown', { error: err.message });
                process.exit(1);
            }
            
            logger.info('HTTP server closed');
            
            // Close database connection
            db.close((err) => {
                if (err) {
                    logger.error('Error closing database connection', { error: err.message });
                    process.exit(1);
                }
                
                logger.info('Database connection closed');
                logger.info('Graceful shutdown completed');
                process.exit(0);
            });
        });
        
        // Force close after 10 seconds
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
}

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server with database validation
async function startServer() {
    try {
        // Validate database connection before starting server
        await validateDatabase();
        
        const PORT = SERVER_CONFIG.port;
        server = app.listen(PORT, () => {
            logger.info('Server started successfully', { port: PORT });
        });
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

startServer(); 