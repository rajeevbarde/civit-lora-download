/**
 * Logger Unit Tests
 * Tests for the logger utility module
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Mock fs module for file operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn()
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Logger Tests', () => {
  let mockConsoleLog;
  let mockConsoleError;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console methods
    mockConsoleLog = jest.fn();
    mockConsoleError = jest.fn();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    
    // Mock fs methods
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.appendFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Logger Instance', () => {
    test('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('should have required methods', () => {
      const requiredMethods = ['error', 'warn', 'info', 'debug', 'request', 'db', 'file', 'download', 'userAction', 'logTimeTaken'];
      
      requiredMethods.forEach(method => {
        expect(typeof logger[method]).toBe('function');
      });
    });
  });

  describe('Basic Logging Methods', () => {
    test('should log error messages', () => {
      const testMessage = 'Test error message';
      const testData = { error: 'test error' };
      
      logger.error(testMessage, testData);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('ERROR');
      expect(consoleCall).toContain(testMessage);
    });

    test('should log warning messages', () => {
      const testMessage = 'Test warning message';
      
      logger.warn(testMessage);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('WARN');
      expect(consoleCall).toContain(testMessage);
    });

    test('should log info messages', () => {
      const testMessage = 'Test info message';
      
      logger.info(testMessage);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('INFO');
      expect(consoleCall).toContain(testMessage);
    });

    test('should log debug messages', () => {
      const testMessage = 'Test debug message';
      
      logger.debug(testMessage);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('DEBUG');
      expect(consoleCall).toContain(testMessage);
    });
  });

  describe('Special Logging Methods', () => {
    test('should log HTTP requests', () => {
      const method = 'GET';
      const url = '/api/test';
      const statusCode = 200;
      const responseTime = 150;
      
      logger.request(method, url, statusCode, responseTime);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('GET /api/test - 200');
    });

    test('should log HTTP errors as warnings', () => {
      const method = 'POST';
      const url = '/api/error';
      const statusCode = 500;
      
      logger.request(method, url, statusCode);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('WARN');
      expect(consoleCall).toContain('POST /api/error - 500');
    });

    test('should log database operations', () => {
      const operation = 'SELECT';
      const table = 'models';
      const duration = 25;
      
      logger.db(operation, table, duration);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('DEBUG');
      expect(consoleCall).toContain('DB SELECT on models');
    });

    test('should log file operations', () => {
      const operation = 'READ';
      const filePath = '/path/to/file.txt';
      const result = 'success';
      
      logger.file(operation, filePath, result);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('DEBUG');
      expect(consoleCall).toContain('FILE READ: /path/to/file.txt');
    });

    test('should log download operations without progress', () => {
      const fileName = 'test-model.safetensors';
      
      logger.download(fileName);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('DOWNLOAD: test-model.safetensors');
    });

    test('should log download operations with progress', () => {
      const fileName = 'test-model.safetensors';
      const progress = {
        percent: 50,
        downloaded: 1024,
        total: 2048,
        speed: '1.2 MB/s'
      };
      
      logger.download(fileName, progress);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('DOWNLOAD: test-model.safetensors');
      expect(consoleCall).toContain('50%');
    });

    test('should log user actions', () => {
      const message = 'User downloaded model';
      const data = { modelId: 123 };
      
      logger.userAction(message, data);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('USER');
      expect(consoleCall).toContain('🚩 User downloaded model');
    });

    test('should log time taken for operations', () => {
      const action = 'Scan completed';
      const startTime = Date.now() - 1000; // 1 second ago
      const data = { filesScanned: 100 };
      
      logger.logTimeTaken(action, startTime, data);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
      
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('USER');
      expect(consoleCall).toContain('⏱️ Scan completed - Time taken:');
    });
  });

  describe('Data Formatting', () => {
    test('should handle string data', () => {
      const message = 'Test message';
      const data = 'string data';
      
      logger.info(message, data);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('string data');
    });

    test('should handle object data', () => {
      const message = 'Test message';
      const data = { key: 'value', number: 42 };
      
      logger.info(message, data);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('{"key":"value","number":42}');
    });

    test('should handle null data', () => {
      const message = 'Test message';
      
      logger.info(message, null);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain(message);
      expect(consoleCall).not.toContain('null');
    });
  });

  describe('File Operations', () => {
    test('should create log directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      // Re-require logger to trigger directory creation
      jest.resetModules();
      require('../utils/logger');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    test('should handle file write errors gracefully', () => {
      fs.appendFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });
      
      // Should not throw error
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
      
      // Should log error to console
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to write to log file:', 'File write error');
    });
  });

  describe('Log Level Filtering', () => {
    const originalLogLevel = process.env.LOG_LEVEL;

    afterEach(() => {
      // Restore original log level
      if (originalLogLevel) {
        process.env.LOG_LEVEL = originalLogLevel;
      } else {
        delete process.env.LOG_LEVEL;
      }
    });

    test('should respect ERROR log level', () => {
      process.env.LOG_LEVEL = 'ERROR';
      
      // Re-require logger to pick up new log level
      jest.resetModules();
      const testLogger = require('../utils/logger');
      
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warning message');
      testLogger.error('Error message');
      
      // Only error should be logged
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      expect(consoleCall).toContain('ERROR');
    });

    test('should respect WARN log level', () => {
      process.env.LOG_LEVEL = 'WARN';
      
      // Re-require logger to pick up new log level
      jest.resetModules();
      const testLogger = require('../utils/logger');
      
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warning message');
      testLogger.error('Error message');
      
      // Only warn and error should be logged
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      const calls = mockConsoleLog.mock.calls.map(call => call[0]);
      expect(calls.some(call => call.includes('WARN'))).toBe(true);
      expect(calls.some(call => call.includes('ERROR'))).toBe(true);
    });
  });

  describe('Timestamp Formatting', () => {
    test('should include ISO timestamp in logs', () => {
      const beforeLog = new Date();
      logger.info('Test message');
      const afterLog = new Date();
      
      expect(mockConsoleLog).toHaveBeenCalled();
      const consoleCall = mockConsoleLog.mock.calls[0][0];
      
      // Extract timestamp from log message
      const timestampMatch = consoleCall.match(/\[([^\]]+)\]/);
      expect(timestampMatch).toBeTruthy();
      
      const timestamp = new Date(timestampMatch[1]);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterLog.getTime());
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty message', () => {
      expect(() => {
        logger.info('');
      }).not.toThrow();
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should handle undefined message', () => {
      expect(() => {
        logger.info(undefined);
      }).not.toThrow();
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should handle circular reference in data', () => {
      const circularObj = {};
      circularObj.self = circularObj;
      
      expect(() => {
        logger.info('Test message', circularObj);
      }).not.toThrow();
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should handle very large data objects', () => {
      const largeData = {
        array: new Array(1000).fill('test'),
        nested: { deep: { value: 'test' } }
      };
      
      expect(() => {
        logger.info('Test message', largeData);
      }).not.toThrow();
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
}); 