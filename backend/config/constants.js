const path = require('path');

// File scanning configuration
const ALLOWED_EXTENSIONS = ['safetensors'];

// Download configuration
const DOWNLOAD_CONFIG = {
    baseDir: process.env.DOWNLOAD_BASE_DIR || 'Z:/Projects/AI/BigFiles/SD/loras',
    maxConcurrent: parseInt(process.env.DOWNLOAD_MAX_CONCURRENT) || 3,
    timeout: parseInt(process.env.DOWNLOAD_TIMEOUT) || 300000, // 5 minutes
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Server configuration
const SERVER_CONFIG = {
    port: parseInt(process.env.PORT) || 3000,
    jsonLimit: process.env.JSON_LIMIT || '50mb'
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