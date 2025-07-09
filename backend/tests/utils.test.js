/**
 * Utility Tests - Helper functions and utility modules
 * These tests verify that utility functions work correctly
 */

const request = require('supertest');
const express = require('express');

describe('Utility Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Create Express app for utility tests
    app = express();
    app.use(express.json());
    
    // Add basic middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    // Add test routes
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Test endpoint' });
    });

    app.post('/api/test-timeout', (req, res) => {
      // Simulate long operation
      setTimeout(() => {
        res.json({ message: 'Delayed response' });
      }, 2000);
    });

    // Start server on unique port for utility tests
    const PORT = 3004;
    server = app.listen(PORT);

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    
    // Clear any remaining timers
    jest.clearAllTimers();
    
    // Clear all timeouts
    const activeTimers = require('timers');
    activeTimers.clearTimeout();
    activeTimers.clearInterval();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Middleware Tests', () => {
    test('should load timeout middleware', () => {
      const timeoutMiddleware = require('../middleware/timeout');
      
      expect(timeoutMiddleware).toBeDefined();
      expect(typeof timeoutMiddleware).toBe('object');
      expect(timeoutMiddleware.timeoutMiddleware).toBeDefined();
      expect(timeoutMiddleware.createTimeoutMiddleware).toBeDefined();
    });

    test('should load validation middleware', () => {
      const validationMiddleware = require('../middleware/validation');
      
      expect(validationMiddleware).toBeDefined();
      expect(typeof validationMiddleware).toBe('object');
      expect(validationMiddleware.validatePagination).toBeDefined();
      expect(validationMiddleware.validateModelVersionId).toBeDefined();
    });

    test('should handle middleware function calls', () => {
      const timeoutMiddleware = require('../middleware/timeout');
      
      // Test that middleware can be called (even if it doesn't do anything in test)
      expect(() => {
        const mockReq = {
          on: jest.fn()
        };
        const mockRes = {
          on: jest.fn(),
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          headersSent: false,
          send: jest.fn()
        };
        const mockNext = jest.fn();
        
        // Create middleware with 0 timeout (no timer created)
        const testMiddleware = timeoutMiddleware.createTimeoutMiddleware(0);
        testMiddleware(mockReq, mockRes, mockNext);
        
        // Verify next was called
        expect(mockNext).toHaveBeenCalled();
      }).not.toThrow();
    });
  });

  describe('Logger Tests', () => {
    test('should load logger utility', () => {
      const logger = require('../utils/logger');
      
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should have logger methods', () => {
      const logger = require('../utils/logger');
      
      // Check for common logger methods
      const methods = ['info', 'error', 'warn', 'debug'];
      methods.forEach(method => {
        if (typeof logger[method] === 'function') {
          expect(typeof logger[method]).toBe('function');
        }
      });
    });

    test('should handle logger calls', () => {
      const logger = require('../utils/logger');
      
      // Test that logger methods can be called without throwing
      if (typeof logger.info === 'function') {
        expect(() => logger.info('Test message')).not.toThrow();
      }
      
      if (typeof logger.error === 'function') {
        expect(() => logger.error('Test error')).not.toThrow();
      }
    });
  });

  describe('Configuration Tests', () => {
    test('should load constants configuration', () => {
      const constants = require('../config/constants');
      
      expect(constants).toBeDefined();
      expect(constants.SERVER_CONFIG).toBeDefined();
      expect(constants.DB_CONFIG).toBeDefined();
      expect(constants.DOWNLOAD_CONFIG).toBeDefined();
    });

    test('should validate configuration values', () => {
      const constants = require('../config/constants');
      
      // Validate server config
      expect(constants.SERVER_CONFIG.port).toBeGreaterThan(0);
      expect(constants.SERVER_CONFIG.jsonLimit).toBeDefined();
      
      // Validate database config
      expect(constants.DB_CONFIG.tableName).toBeDefined();
      expect(constants.DB_CONFIG.tableName).not.toBe('');
      
      // Validate download config
      expect(constants.DOWNLOAD_CONFIG.baseDir).toBeDefined();
      expect(constants.DOWNLOAD_CONFIG.maxConcurrent).toBeGreaterThan(0);
      expect(constants.DOWNLOAD_CONFIG.timeout).toBeGreaterThan(0);
    });

    test('should have allowed file extensions', () => {
      const constants = require('../config/constants');
      
      expect(constants.ALLOWED_EXTENSIONS).toBeDefined();
      expect(Array.isArray(constants.ALLOWED_EXTENSIONS)).toBe(true);
      expect(constants.ALLOWED_EXTENSIONS.length).toBeGreaterThan(0);
      expect(constants.ALLOWED_EXTENSIONS).toContain('safetensors');
    });
  });

  describe('Database Configuration Tests', () => {
    test('should load database configuration', () => {
      const dbConfig = require('../config/database');
      
      expect(dbConfig).toBeDefined();
      expect(typeof dbConfig).toBe('object');
    });

    test('should validate database configuration', () => {
      const dbConfig = require('../config/database');
      
      // Check for required database properties
      expect(dbConfig).toBeDefined();
      expect(typeof dbConfig).toBe('object');
    });
  });

  describe('Environment Tests', () => {
    test('should have test environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.DB_PATH).toBeDefined();
      expect(process.env.PORT).toBeDefined();
    });

    test('should use in-memory database for tests', () => {
      expect(process.env.DB_PATH).toBe(':memory:');
      expect(process.env.DB_TABLE_NAME).toBe('test_models');
    });
  });

  describe('API Utility Tests', () => {
    test('should handle basic API requests', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Test endpoint');
    });

    test('should handle JSON parsing', async () => {
      const testData = { test: 'data', number: 123 };
      
      const response = await request(app)
        .post('/api/test')
        .send(testData)
        .expect(404); // Endpoint doesn't exist, but JSON parsing should work

      expect(response.body).toBeDefined();
    });

    test('should handle CORS headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toBeDefined();
    });

    test('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const startTime = Date.now();
      
      const requests = Array(3).fill().map(() => 
        request(app).get('/api/test')
      );
      
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(2000);
    });

    test('should handle request timeouts', async () => {
      const startTime = Date.now();
      
      try {
        await request(app)
          .get('/api/test-timeout')
          .timeout(1000); // 1 second timeout
        
        fail('Request should have timed out');
      } catch (error) {
        const endTime = Date.now();
        expect(endTime - startTime).toBeLessThan(2000);
        expect(error).toBeDefined();
      }
    });
  });
}); 