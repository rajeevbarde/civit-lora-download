const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Database configuration
const DB_PATH = process.env.DB_PATH || 'F:/Projects/AI/BigFiles/Misc/civitai DB/models/models.db';

// Create database connection
const db = new sqlite3.Database(DB_PATH);

// Validate database connection and file existence
async function validateDatabase() {
    return new Promise((resolve, reject) => {
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

        // Test database connection
        db.get('SELECT 1', (err) => {
            if (err) {
                logger.error('Database connection failed', { error: err.message });
                reject(err);
                return;
            }
            
            logger.info('Database connected successfully', { path: DB_PATH });
            resolve(db);
        });
    });
}

module.exports = { db, validateDatabase }; 