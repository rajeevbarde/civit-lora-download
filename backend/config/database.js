// Load environment variables if not already loaded
if (!process.env.DB_PATH) {
    require('dotenv').config();
}

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Database configuration validation
function validateDatabaseConfig() {
    if (!process.env.DB_PATH) {
        throw new Error('DB_PATH environment variable is required');
    }
    
    const requiredPoolVars = ['DB_POOL_MIN', 'DB_POOL_MAX', 'DB_ACQUIRE_TIMEOUT', 'DB_IDLE_TIMEOUT', 'DB_RETRY_DELAY'];
    const missingVars = requiredPoolVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required database pool environment variables: ${missingVars.join(', ')}`);
    }
    
    // Validate numeric values
    const poolMin = parseInt(process.env.DB_POOL_MIN);
    const poolMax = parseInt(process.env.DB_POOL_MAX);
    
    if (isNaN(poolMin) || isNaN(poolMax) || poolMin < 1 || poolMax < poolMin) {
        throw new Error('Invalid database pool configuration: DB_POOL_MIN and DB_POOL_MAX must be valid numbers with DB_POOL_MAX >= DB_POOL_MIN >= 1');
    }
}

// Validate configuration on module load
validateDatabaseConfig();

// Database configuration
const DB_PATH = process.env.DB_PATH;

// Connection pool configuration
const POOL_CONFIG = {
    min: parseInt(process.env.DB_POOL_MIN),
    max: parseInt(process.env.DB_POOL_MAX),
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT), // 60 seconds
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT), // 5 minutes
    retryDelay: parseInt(process.env.DB_RETRY_DELAY) // 1 second
};

class DatabasePool {
    constructor() {
        this.connections = [];
        this.available = [];
        this.inUse = new Set();
        this.waiting = [];
        this.stats = {
            created: 0,
            acquired: 0,
            released: 0,
            errors: 0
        };
    }

    // Create a new database connection
    createConnection() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    logger.error('Failed to create database connection', { error: err.message });
                    reject(err);
                    return;
                }
                
                // Configure connection with valid options
                db.configure('busyTimeout', 30000); // 30 second busy timeout
                
                // Enable WAL mode using PRAGMA
                db.run('PRAGMA journal_mode = WAL', (err) => {
                    if (err) {
                        logger.warn('Failed to enable WAL mode', { error: err.message });
                    } else {
                        logger.debug('WAL mode enabled for database connection');
                    }
                });
                
                logger.debug('Database connection created', { 
                    totalConnections: this.connections.length + 1 
                });
                resolve(db);
            });
        });
    }

    // Get a connection from the pool
    async getConnection() {
        this.stats.acquired++;
        
        // If there's an available connection, use it
        if (this.available.length > 0) {
            const connection = this.available.pop();
            this.inUse.add(connection);
            logger.debug('Connection acquired from pool', { 
                available: this.available.length, 
                inUse: this.inUse.size 
            });
            return connection;
        }

        // If we can create a new connection, do so
        if (this.connections.length < POOL_CONFIG.max) {
            try {
                const connection = await this.createConnection();
                this.connections.push(connection);
                this.inUse.add(connection);
                this.stats.created++;
                
                logger.debug('New connection created and acquired', { 
                    totalConnections: this.connections.length, 
                    inUse: this.inUse.size 
                });
                return connection;
            } catch (error) {
                this.stats.errors++;
                logger.error('Failed to create new connection', { error: error.message });
                throw error;
            }
        }

        // Wait for a connection to become available
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waiting.findIndex(w => w.resolve === resolve);
                if (index !== -1) {
                    this.waiting.splice(index, 1);
                }
                reject(new Error('Connection acquisition timeout'));
            }, POOL_CONFIG.acquireTimeout);

            this.waiting.push({ resolve, reject, timeout });
            logger.debug('Connection request queued', { 
                waiting: this.waiting.length, 
                inUse: this.inUse.size 
            });
        });
    }

    // Release a connection back to the pool
    releaseConnection(connection) {
        if (!this.inUse.has(connection)) {
            logger.warn('Attempted to release connection not in use');
            return;
        }

        this.inUse.delete(connection);
        this.stats.released++;

        // Check if there are waiting requests
        if (this.waiting.length > 0) {
            const { resolve, reject, timeout } = this.waiting.shift();
            clearTimeout(timeout);
            this.inUse.add(connection);
            logger.debug('Connection given to waiting request');
            resolve(connection);
        } else {
            this.available.push(connection);
            logger.debug('Connection returned to pool', { 
                available: this.available.length, 
                inUse: this.inUse.size 
            });
        }
    }

    // Execute a query with automatic connection management
    async executeQuery(query, params = []) {
        let connection;
        try {
            connection = await this.getConnection();
            return await this.runQuery(connection, query, params);
        } finally {
            if (connection) {
                this.releaseConnection(connection);
            }
        }
    }

    // Run a query on a specific connection
    runQuery(connection, query, params = []) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            connection.all(query, params, (err, rows) => {
                const duration = Date.now() - startTime;
                
                if (err) {
                    logger.error('Query execution failed', { 
                        query: query.substring(0, 100) + '...', 
                        error: err.message, 
                        duration 
                    });
                    reject(err);
                    return;
                }
                
                logger.db('SELECT', 'ALLCivitData', duration);
                resolve(rows);
            });
        });
    }

    // Run a single row query
    runQuerySingle(connection, query, params = []) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            connection.get(query, params, (err, row) => {
                const duration = Date.now() - startTime;
                
                if (err) {
                    logger.error('Query execution failed', { 
                        query: query.substring(0, 100) + '...', 
                        error: err.message, 
                        duration 
                    });
                    reject(err);
                    return;
                }
                
                logger.db('SELECT', 'ALLCivitData', duration);
                resolve(row);
            });
        });
    }

    // Run an update/insert/delete query
    runUpdate(connection, query, params = []) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            connection.run(query, params, function(err) {
                const duration = Date.now() - startTime;
                
                if (err) {
                    logger.error('Update query failed', { 
                        query: query.substring(0, 100) + '...', 
                        error: err.message, 
                        duration 
                    });
                    reject(err);
                    return;
                }
                
                logger.db('UPDATE', 'ALLCivitData', duration);
                resolve(this);
            });
        });
    }

    // Get pool statistics
    getStats() {
        return {
            ...this.stats,
            totalConnections: this.connections.length,
            availableConnections: this.available.length,
            inUseConnections: this.inUse.size,
            waitingRequests: this.waiting.length,
            poolConfig: POOL_CONFIG
        };
    }

    // Close all connections
    async close() {
        logger.info('Closing database pool', { 
            totalConnections: this.connections.length 
        });
        
        const closePromises = this.connections.map(connection => {
            return new Promise((resolve) => {
                connection.close((err) => {
                    if (err) {
                        logger.error('Error closing connection', { error: err.message });
                    }
                    resolve();
                });
            });
        });
        
        await Promise.all(closePromises);
        this.connections = [];
        this.available = [];
        this.inUse.clear();
        this.waiting = [];
        
        logger.info('Database pool closed');
    }
}

// Create singleton pool instance
const dbPool = new DatabasePool();

// Validate database connection and file existence
async function validateDatabase() {
    return new Promise(async (resolve, reject) => {
        try {
            // Check if database file exists
            if (!fs.existsSync(DB_PATH)) {
                const error = new Error(`Database file not found: ${DB_PATH}`);
                logger.error('Database validation failed', { error: error.message });
                reject(error);
                return;
            }

            // Check if database file is readable
            try {
                fs.accessSync(DB_PATH, fs.constants.R_OK);
            } catch (err) {
                const error = new Error(`Database file not readable: ${DB_PATH}`);
                logger.error('Database validation failed', { error: error.message });
                reject(error);
                return;
            }

            // Test database connection using pool
            const connection = await dbPool.getConnection();
            try {
                await dbPool.runQuerySingle(connection, 'SELECT 1');
                logger.info('Database connected successfully', { path: DB_PATH });
                resolve(dbPool);
            } finally {
                dbPool.releaseConnection(connection);
            }
        } catch (error) {
            logger.error('Database validation failed', { error: error.message });
            reject(error);
        }
    });
}

module.exports = { dbPool, validateDatabase }; 