/**
 * Diagnostic Script - Helps identify issues with the backend setup
 * Run this to see what's working and what's not
 */

console.log('🔍 Running Backend Diagnostic...\n');

// Import required modules first
const fs = require('fs');
const path = require('path');

// Check .env.test file
const dotenvPath = path.join(__dirname, '..', '.env.test');
console.log('📄 .env.test path:', dotenvPath);
console.log('📄 .env.test exists:', fs.existsSync(dotenvPath));

// Try to load .env.test
try {
  require('dotenv').config({ path: dotenvPath });
  console.log('✅ .env.test loaded successfully');
} catch (error) {
  console.log('❌ Failed to load .env.test:', error.message);
}

// Check Node.js version
console.log('📋 Node.js Version:', process.version);

// Check environment
console.log('🌍 Environment:', process.env.NODE_ENV || 'not set');

console.log('📁 Current Directory:', process.cwd());
console.log('📁 Backend Directory:', __dirname);

// Check if key files exist
const keyFiles = [
  'package.json',
  'server.js',
  'config/constants.js',
  'config/database.js',
  'services/databaseService.js',
  'services/fileService.js',
  'services/downloadService.js',
  'services/pathService.js',
  'services/downloadQueue.js',
  'routes/v1/index.js',
  'routes/v1/models.js',
  'routes/v1/files.js',
  'routes/v1/downloads.js',
  'routes/v1/paths.js',
  'middleware/timeout.js',
  'middleware/validation.js',
  'utils/logger.js'
];

console.log('\n📂 Checking Key Files:');
keyFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check environment variables
console.log('\n🔧 Environment Variables:');
const requiredVars = [
  'DB_PATH',
  'DB_TABLE_NAME',
  'DOWNLOAD_BASE_DIR',
  'PORT',
  'DB_POOL_MIN',
  'DB_POOL_MAX',
  'DB_ACQUIRE_TIMEOUT',
  'DB_IDLE_TIMEOUT',
  'DB_RETRY_DELAY',
  'DOWNLOAD_MAX_CONCURRENT',
  'DOWNLOAD_TIMEOUT',
  'JSON_LIMIT'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`  ${value ? '✅' : '❌'} ${varName}: ${value || 'not set'}`);
});

// Try to load key modules
console.log('\n📦 Testing Module Loading:');

const modules = [
  { name: 'Express', module: 'express' },
  { name: 'CORS', module: 'cors' },
  { name: 'SQLite3', module: 'sqlite3' },
  { name: 'Axios', module: 'axios' },
  { name: 'Dotenv', module: 'dotenv' }
];

modules.forEach(({ name, module }) => {
  try {
    require(module);
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
  }
});

// Try to load local modules
console.log('\n🏠 Testing Local Modules:');

const localModules = [
  { name: 'Constants', path: '../config/constants' },
  { name: 'Database Config', path: '../config/database' },
  { name: 'Database Service', path: '../services/databaseService' },
  { name: 'File Service', path: '../services/fileService' },
  { name: 'Download Service', path: '../services/downloadService' },
  { name: 'Path Service', path: '../services/pathService' },
  { name: 'Download Queue', path: '../services/downloadQueue' },
  { name: 'Logger', path: '../utils/logger' },
  { name: 'Timeout Middleware', path: '../middleware/timeout' },
  { name: 'Validation Middleware', path: '../middleware/validation' }
];

localModules.forEach(({ name, path: modulePath }) => {
  try {
    const module = require(modulePath);
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
  }
});

// Check package.json
console.log('\n📋 Package.json Analysis:');
try {
  const packageJson = require('../package.json');
  console.log(`  ✅ Package name: ${packageJson.name}`);
  console.log(`  ✅ Version: ${packageJson.version}`);
  
  const scripts = Object.keys(packageJson.scripts || {});
  console.log(`  ✅ Scripts available: ${scripts.join(', ')}`);
  
  const dependencies = Object.keys(packageJson.dependencies || {});
  console.log(`  ✅ Dependencies: ${dependencies.length} packages`);
  
  const devDependencies = Object.keys(packageJson.devDependencies || {});
  console.log(`  ✅ Dev Dependencies: ${devDependencies.length} packages`);
} catch (error) {
  console.log(`  ❌ Package.json: ${error.message}`);
}

// Check Jest configuration
console.log('\n🧪 Jest Configuration:');
try {
  const packageJson = require('../package.json');
  if (packageJson.jest) {
    console.log('  ✅ Jest config found');
    console.log(`  ✅ Test environment: ${packageJson.jest.testEnvironment || 'node'}`);
    console.log(`  ✅ Test match: ${packageJson.jest.testMatch?.join(', ') || 'not set'}`);
  } else {
    console.log('  ❌ Jest config not found');
  }
} catch (error) {
  console.log(`  ❌ Jest config: ${error.message}`);
}

console.log('\n🎯 Diagnostic Complete!');
console.log('\n💡 Next Steps:');
console.log('1. If you see ❌ marks, those indicate issues to fix');
console.log('2. Run "npm install" if dependencies are missing');
console.log('3. Check your .env.test file exists and has correct values');
console.log('4. Try running "npm run test:smoke" again'); 