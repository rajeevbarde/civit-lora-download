// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { SERVER_CONFIG, DB_CONFIG, DOWNLOAD_CONFIG } = require('./config/constants');
const { validateDatabase, dbPool } = require('./config/database');
const logger = require('./utils/logger');
const { timeoutMiddleware } = require('./middleware/timeout');
const fs = require('fs');
const dotenvPath = require('path').join(__dirname, '.env');

// Import services
const databaseService = require('./services/databaseService');

// Import versioned routes
const v1Routes = require('./routes/v1');

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

// API versioning middleware
app.use((req, res, next) => {
    // Add API version info to response headers
    res.set('X-API-Version', 'v1');
    res.set('X-API-Latest', 'v1');
    next();
});

// Versioned API routes
app.use('/api/v1', v1Routes);

// API root endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'CivitAI Lora Download Manager API',
        version: '1.0.0',
        description: 'API for managing CivitAI Lora model downloads and file organization',
        versions: {
            v1: {
                status: 'active',
                url: '/api/v1',
                docs: '/api/v1/docs'
            }
        }
    });
});

// Database pool statistics endpoint
app.get('/api/db-stats', timeoutMiddleware.quick, (req, res) => {
    try {
        const stats = databaseService.getPoolStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', timeoutMiddleware.quick, (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        api: {
            latest: 'v1',
            supported: ['v1']
        }
    });
});

// Settings endpoint for frontend
app.get('/api/v1/settings', (req, res) => {
    res.json({
        DB_PATH: process.env.DB_PATH,
        DOWNLOAD_BASE_DIR: process.env.DOWNLOAD_BASE_DIR
    });
});

// Update settings endpoint for frontend
app.post('/api/v1/settings', express.json(), (req, res) => {
    const { DB_PATH, DOWNLOAD_BASE_DIR } = req.body;
    if (!DB_PATH && !DOWNLOAD_BASE_DIR) {
        return res.status(400).json({ error: 'No values provided' });
    }
    try {
        let envContent = fs.readFileSync(dotenvPath, 'utf-8');
        if (DB_PATH) {
            envContent = envContent.replace(/DB_PATH=.*/g, `DB_PATH=${DB_PATH}`);
        }
        if (DOWNLOAD_BASE_DIR) {
            envContent = envContent.replace(/DOWNLOAD_BASE_DIR=.*/g, `DOWNLOAD_BASE_DIR=${DOWNLOAD_BASE_DIR}`);
        }
        fs.writeFileSync(dotenvPath, envContent, 'utf-8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Graceful shutdown handling
let server;

function gracefulShutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    if (server) {
        server.close(async (err) => {
            if (err) {
                logger.error('Error during server shutdown', { error: err.message });
                process.exit(1);
            }
            
            logger.info('HTTP server closed');
            
            // Close database pool
            try {
                await dbPool.close();
                logger.info('Database pool closed');
            } catch (dbError) {
                logger.error('Error closing database pool', { error: dbError.message });
            }
            
            logger.info('Graceful shutdown completed');
            process.exit(0);
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