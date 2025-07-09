// Test setup file for Jest
const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env.test');

// Load test environment variables
try {
  require('dotenv').config({ path: dotenvPath });
  console.log('✅ Loaded .env.test from:', dotenvPath);
} catch (error) {
  console.log('⚠️ Could not load .env.test, using defaults');
}

// Set test environment variables if not already set
process.env.NODE_ENV = 'test';
process.env.DB_PATH = process.env.DB_PATH || ':memory:'; // Use in-memory database for tests
process.env.PORT = process.env.PORT || '3001';
process.env.DOWNLOAD_BASE_DIR = process.env.DOWNLOAD_BASE_DIR || './test-downloads';
process.env.DB_TABLE_NAME = process.env.DB_TABLE_NAME || 'test_models';
process.env.DB_POOL_MIN = process.env.DB_POOL_MIN || '1';
process.env.DB_POOL_MAX = process.env.DB_POOL_MAX || '5';
process.env.DB_ACQUIRE_TIMEOUT = process.env.DB_ACQUIRE_TIMEOUT || '30000';
process.env.DB_IDLE_TIMEOUT = process.env.DB_IDLE_TIMEOUT || '30000';
process.env.DB_RETRY_DELAY = process.env.DB_RETRY_DELAY || '1000';
process.env.DOWNLOAD_MAX_CONCURRENT = process.env.DOWNLOAD_MAX_CONCURRENT || '3';
process.env.DOWNLOAD_TIMEOUT = process.env.DOWNLOAD_TIMEOUT || '300000';
process.env.JSON_LIMIT = process.env.JSON_LIMIT || '10mb';

// Log the environment variables for debugging
console.log('🔧 Environment Variables Set:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  DB_PATH:', process.env.DB_PATH);
console.log('  PORT:', process.env.PORT);
console.log('  DB_TABLE_NAME:', process.env.DB_TABLE_NAME);

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore console output
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock request objects
  createMockRequest: (method = 'GET', url = '/', body = {}, headers = {}) => ({
    method,
    url,
    body,
    headers,
    query: {},
    params: {}
  }),

  // Helper to create mock response objects
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.on = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to create mock next function
  createMockNext: () => jest.fn(),

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Global teardown function to clean up resources
global.afterAll(async () => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Close any remaining database connections
  try {
    const databaseService = require('../services/databaseService');
    if (databaseService && typeof databaseService.close === 'function') {
      await databaseService.close();
    }
  } catch (error) {
    // Ignore errors during teardown
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
}); 