const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

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
            console.error('Database validation failed:', error.message);
            reject(error);
            return;
        }

        // Check if database file is readable
        try {
            fs.accessSync(DB_PATH, fs.constants.R_OK);
        } catch (err) {
            const error = new Error(`Database file not readable: ${DB_PATH}`);
            console.error('Database validation failed:', error.message);
            reject(error);
            return;
        }

        // Test database connection
        db.get('SELECT 1', (err) => {
            if (err) {
                console.error('Database connection failed:', err.message);
                reject(err);
                return;
            }
            
            console.log('Database connected successfully');
            resolve(db);
        });
    });
}

module.exports = { db, validateDatabase }; 