import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Content for .env file
const envContent = `# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_VERSION=v1
VITE_CIVITAI_BASE_URL=https://civitai.com/api/v1

# Frontend Configuration
VITE_FRONTEND_BASE_URL=http://localhost:5173

# Timeout Configuration
VITE_API_TIMEOUT=30000
VITE_POLLING_STATUS_INTERVAL=2000
VITE_POLLING_MAX_POLLS=300
VITE_POLLING_CLEANUP_INTERVAL=30000

# Pagination Configuration
VITE_DEFAULT_PAGE_SIZE=50
VITE_MAX_PAGE_SIZE=100

# Retry Configuration
VITE_RETRY_MAX_ATTEMPTS=3
VITE_RETRY_BASE_DELAY=1000`;

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
    console.log('Starting frontend configuration file creation...\n');
    
    // Create .env file
    createFileIfNotExists('.env', envContent);
    
    console.log('\nFrontend configuration file creation completed.');
}

// Run the script
main(); 