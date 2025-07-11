const express = require('express');
const router = express.Router();

// Import v1 route modules
const modelsRoutes = require('./models');
const pathsRoutes = require('./paths');
const filesRoutes = require('./files');
const downloadsRoutes = require('./downloads');
const cacheRoutes = require('./cache');

// Mount v1 routes
router.use('/models', modelsRoutes);
router.use('/paths', pathsRoutes);
router.use('/files', filesRoutes);
router.use('/downloads', downloadsRoutes);
router.use('/cache', cacheRoutes);

// V1 API info endpoint
router.get('/', (req, res) => {
    res.json({
        version: 'v1',
        status: 'active',
        description: 'CivitAI Lora Download Manager API v1',
        endpoints: {
            models: '/api/v1/models',
            paths: '/api/v1/paths',
            files: '/api/v1/files',
            downloads: '/api/v1/downloads',
            cache: '/api/v1/cache'
        },
        documentation: 'API documentation available at /api/v1/docs'
    });
});

// V1 API documentation endpoint
router.get('/docs', (req, res) => {
    res.json({
        version: 'v1',
        title: 'CivitAI Lora Download Manager API v1 Documentation',
        description: 'API for managing CivitAI Lora model downloads and file organization',
        endpoints: {
            models: {
                description: 'Model management endpoints',
                routes: {
                    'GET /models': 'Get models with pagination and filters',
                    'GET /models/:modelVersionId': 'Get model detail by modelVersionId',
                    'GET /models/base-models': 'Get all base models'
                }
            },
            paths: {
                description: 'Path management endpoints',
                routes: {
                    'GET /paths': 'Get saved paths',
                    'POST /paths': 'Add a new path',
                    'DELETE /paths': 'Delete a path'
                }
            },
            files: {
                description: 'File management endpoints',
                routes: {
                    'POST /files/scan': 'Scan directories for files',
                    'POST /files/check': 'Check files against database',
                    'POST /files/mark-downloaded': 'Mark files as downloaded',
                    'POST /files/validate': 'Validate downloaded files',
                    'POST /files/find-missing': 'Find missing files',
                    'POST /files/compute-hash': 'Compute file hash',
                    'POST /files/fix': 'Fix file naming'
                }
            },
            downloads: {
                description: 'Download management endpoints',
                routes: {
                    'GET /downloads': 'Get download queue status',
                    'POST /downloads': 'Add model to download queue',
                    'DELETE /downloads/:modelVersionId': 'Remove model from download queue',
                    'GET /files': 'Get all file names from database',
                    'POST /files/scan': 'Scan and register unregistered files',
                    'GET /paths': 'Get saved paths',
                    'POST /paths': 'Save path'
                }
            },
            cache: {
                description: 'Cache management endpoints',
                routes: {
                    'POST /cache/images': 'Scan and cache image metadata from modeljson directory'
                }
            }
        }
    });
});

module.exports = router; 