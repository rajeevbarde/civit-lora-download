// Load environment variables if not already loaded
if (!process.env.DB_PATH) {
    require('dotenv').config();
}

const path = require('path');

// Configuration validation
function validateConfig() {
    const requiredVars = [
        'DB_PATH',
        'DB_POOL_MIN',
        'DB_POOL_MAX', 
        'DB_ACQUIRE_TIMEOUT',
        'DB_IDLE_TIMEOUT',
        'DB_RETRY_DELAY',
        'DOWNLOAD_BASE_DIR',
        'DOWNLOAD_MAX_CONCURRENT',
        'DOWNLOAD_TIMEOUT',
        'PORT',
        'JSON_LIMIT'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file.`);
    }
}

// Validate configuration on module load
validateConfig();

// File scanning configuration
const ALLOWED_EXTENSIONS = ['safetensors'];

// Download configuration
const DOWNLOAD_CONFIG = {
    baseDir: process.env.DOWNLOAD_BASE_DIR,
    maxConcurrent: parseInt(process.env.DOWNLOAD_MAX_CONCURRENT),
    timeout: parseInt(process.env.DOWNLOAD_TIMEOUT), // 5 minutes
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Server configuration
const SERVER_CONFIG = {
    port: parseInt(process.env.PORT),
    jsonLimit: process.env.JSON_LIMIT
};

// File paths
const PATHS = {
    savedPathFile: process.env.SAVED_PATH_FILE || path.join(__dirname, '..', 'saved_path.json')
};

module.exports = {
    ALLOWED_EXTENSIONS,
    DOWNLOAD_CONFIG,
    SERVER_CONFIG,
    PATHS
}; 