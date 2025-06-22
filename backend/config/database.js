const sqlite3 = require('sqlite3').verbose();

// Database configuration
const DB_PATH = process.env.DB_PATH || 'F:/Projects/AI/BigFiles/Misc/civitai DB/models/models.db';

// Create database connection
const db = new sqlite3.Database(DB_PATH);

// Test database connection
db.get('SELECT 1', (err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Database connected successfully');
    }
});

module.exports = db; 