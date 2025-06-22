const express = require('express');
const router = express.Router();

// Import v1 route modules
const modelsRoutes = require('./models');
const pathsRoutes = require('./paths');
const filesRoutes = require('./files');
const downloadsRoutes = require('./downloads');

// Mount v1 routes
router.use('/models', modelsRoutes);
router.use('/paths', pathsRoutes);
router.use('/files', filesRoutes);
router.use('/downloads', downloadsRoutes);

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
            downloads: '/api/v1/downloads'
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
                    'GET /models/detail/:id': 'Get model detail by modelVersionId',
                    'GET /models/basemodels': 'Get all base models',
                    'GET /models/summary-matrix': 'Get summary matrix',
                    'GET /models/summary-matrix-downloaded': 'Get downloaded summary matrix'
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
                    'POST /downloads': 'Queue a download',
                    'GET /downloads/status': 'Get download status',
                    'POST /downloads/clear-errors': 'Clear download errors'
                }
            }
        }
    });
});

module.exports = router; 