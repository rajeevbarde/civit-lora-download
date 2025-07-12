const fs = require('fs');
const path = require('path');

// Content for .env file
const envContent = `# Database Configuration
DB_PATH=./data/models_sample.db
DB_TABLE_NAME=ALLCivitData

# Database Pool Configuration
DB_POOL_MIN=1
DB_POOL_MAX=10
DB_ACQUIRE_TIMEOUT=60000
DB_IDLE_TIMEOUT=300000
DB_RETRY_DELAY=1000

# Database Connection Settings
DB_BUSY_TIMEOUT=30000

# Download Configuration
DOWNLOAD_BASE_DIR=./data/
DOWNLOAD_MAX_CONCURRENT=3
DOWNLOAD_TIMEOUT=300000

# Server Configuration
PORT=3000
JSON_LIMIT=50mb

# File Paths
SAVED_PATH_FILE=./saved_path.json

# Logging Configuration
LOG_LEVEL=INFO

# Timeout Configuration
DEFAULT_TIMEOUT=30000
TIMEOUT_QUICK=10000
TIMEOUT_NORMAL=30000
TIMEOUT_FILE=120000
TIMEOUT_DOWNLOAD=300000

# HTTP Agent Configuration
HTTP_KEEPALIVE_MSECS=1000
HTTP_MAX_SOCKETS=20
HTTP_MAX_FREE_SOCKETS=10
HTTP_TIMEOUT=60000
HTTPS_KEEPALIVE_MSECS=1000
HTTPS_MAX_SOCKETS=20
HTTPS_MAX_FREE_SOCKETS=10
HTTPS_TIMEOUT=60000

# Validation Configuration
MAX_PAGINATION_LIMIT=100

# New Configuration
CIVITAI_TOKEN=`;

// Content for saved_path.json file
const savedPathContent = `{
  "paths": [
    "Z:\\\\LoraFolders"
  ]
}`;

function createFileIfNotExists(filename, content) {
    if (fs.existsSync(filename)) {
        console.log(`File ${filename} already exists. Skipping creation.`);
        return false;
    }
    
    try {
        fs.writeFileSync(filename, content, 'utf8');
        console.log(`File ${filename} created successfully.`);
        return true;
    } catch (error) {
        console.error(`Error creating ${filename}:`, error.message);
        return false;
    }
}

function main() {
    console.log('Starting configuration file creation...\n');
    
    // Create .env file
    createFileIfNotExists('.env', envContent);
    
    // Create saved_path.json file
    createFileIfNotExists('saved_path.json', savedPathContent);
    
    console.log('\nConfiguration file creation completed.');
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { createFileIfNotExists, main }; 