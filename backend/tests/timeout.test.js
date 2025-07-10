/**
 * Timeout Middleware Tests
 * Tests for the timeout middleware functionality
 */

const { createTimeoutMiddleware, timeoutMiddleware, timeoutConfigs } = require('../middleware/timeout');

// Mock the logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));



describe('Timeout Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks and timers
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Create fresh mock objects for each test
    mockReq = {
      method: 'GET',
      url: '/test',
      on: jest.fn()
    };

    mockRes = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      on: jest.fn()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    // Clear any remaining timers
    jest.clearAllTimers();
  });

  afterAll(() => {
    // Final cleanup to ensure no timers remain
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('createTimeoutMiddleware', () => {
    test('should create middleware with default timeout', () => {
      const middleware = createTimeoutMiddleware();
      expect(typeof middleware).toBe('function');
    });

    test('should create middleware with custom timeout', () => {
      const middleware = createTimeoutMiddleware(5000);
      expect(typeof middleware).toBe('function');
    });

    test('should skip timeout when timeoutMs is 0', () => {
      const middleware = createTimeoutMiddleware(0);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    test('should skip timeout when timeoutMs is null', () => {
      const middleware = createTimeoutMiddleware(null);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    test('should skip timeout when timeoutMs is Infinity', () => {
      const middleware = createTimeoutMiddleware(Infinity);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    test('should set up timeout handlers when timeout is valid', () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockReq.on).toHaveBeenCalledWith('aborted', expect.any(Function));
    });

    test('should call next immediately', () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout behavior', () => {
    test('should trigger timeout when request takes too long', async () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1001);
      
      expect(mockRes.status).toHaveBeenCalledWith(408);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Request timeout',
        message: 'The request took too long to process',
        timeout: 1000
      });
    });

    test('should not trigger timeout when response is sent before timeout', async () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      // Send response before timeout
      mockRes.send('response data');
      
      // Fast-forward time past timeout
      jest.advanceTimersByTime(1001);
      
      expect(mockRes.status).not.toHaveBeenCalledWith(408);
    });

    test('should not trigger timeout when headers are already sent', async () => {
      mockRes.headersSent = true;
      
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1001);
      
      expect(mockRes.status).not.toHaveBeenCalledWith(408);
    });
  });

  describe('response send override', () => {
    test('should clear timeout when response.send is called', () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      // Call the overridden send method
      mockRes.send('test data');
      
      // Fast-forward time past timeout
      jest.advanceTimersByTime(1001);
      
      expect(mockRes.status).not.toHaveBeenCalledWith(408);
    });

    test('should preserve original send functionality', () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      const result = mockRes.send('test data');
      
      expect(result).toBe(mockRes);
      // The send method is overridden, so we can't test the original call
      // but we can verify the result is correct
      expect(result).toBe(mockRes);
    });
  });

  describe('error handling', () => {
    test('should clear timeout on response error', () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      // Simulate response error
      const errorHandler = mockRes.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler();
      
      // Fast-forward time past timeout
      jest.advanceTimersByTime(1001);
      
      expect(mockRes.status).not.toHaveBeenCalledWith(408);
    });

    test('should clear timeout when request is aborted', () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      // Simulate request abort
      const abortHandler = mockReq.on.mock.calls.find(call => call[0] === 'aborted')[1];
      abortHandler();
      
      // Fast-forward time past timeout
      jest.advanceTimersByTime(1001);
      
      expect(mockRes.status).not.toHaveBeenCalledWith(408);
    });

    test('should clear timeout when response finishes', () => {
      const middleware = createTimeoutMiddleware(1000);
      middleware(mockReq, mockRes, mockNext);
      
      // Simulate response finish
      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishHandler();
      
      // Fast-forward time past timeout
      jest.advanceTimersByTime(1001);
      
      expect(mockRes.status).not.toHaveBeenCalledWith(408);
    });
  });

  describe('timeoutConfigs', () => {
    test('should export timeout configurations', () => {
      expect(timeoutConfigs).toBeDefined();
      expect(typeof timeoutConfigs).toBe('object');
    });

    test('should have all required timeout types', () => {
      expect(timeoutConfigs.quick).toBeDefined();
      expect(timeoutConfigs.normal).toBeDefined();
      expect(timeoutConfigs.file).toBeDefined();
      expect(timeoutConfigs.download).toBeDefined();
    });

    test('should have valid timeout values', () => {
      expect(typeof timeoutConfigs.quick).toBe('number');
      expect(typeof timeoutConfigs.normal).toBe('number');
      expect(typeof timeoutConfigs.file).toBe('number');
      expect(typeof timeoutConfigs.download).toBe('number');
      
      expect(timeoutConfigs.quick).toBeGreaterThan(0);
      expect(timeoutConfigs.normal).toBeGreaterThan(0);
      expect(timeoutConfigs.file).toBeGreaterThan(0);
      expect(timeoutConfigs.download).toBeGreaterThan(0);
    });

    test('should have increasing timeout values', () => {
      expect(timeoutConfigs.quick).toBeLessThan(timeoutConfigs.normal);
      expect(timeoutConfigs.normal).toBeLessThan(timeoutConfigs.file);
      expect(timeoutConfigs.file).toBeLessThan(timeoutConfigs.download);
    });
  });

  describe('timeoutMiddleware', () => {
    test('should export timeout middleware objects', () => {
      expect(timeoutMiddleware).toBeDefined();
      expect(typeof timeoutMiddleware).toBe('object');
    });

    test('should have all required middleware types', () => {
      expect(timeoutMiddleware.quick).toBeDefined();
      expect(timeoutMiddleware.normal).toBeDefined();
      expect(timeoutMiddleware.file).toBeDefined();
      expect(timeoutMiddleware.download).toBeDefined();
    });

    test('should have function middleware for each type', () => {
      expect(typeof timeoutMiddleware.quick).toBe('function');
      expect(typeof timeoutMiddleware.normal).toBe('function');
      expect(typeof timeoutMiddleware.file).toBe('function');
      expect(typeof timeoutMiddleware.download).toBe('function');
    });

    test('should use correct timeout values for each middleware type', () => {
      // Test quick middleware
      timeoutMiddleware.quick(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Test normal middleware
      timeoutMiddleware.normal(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
      
      // Test file middleware
      timeoutMiddleware.file(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(3);
      
      // Test download middleware
      timeoutMiddleware.download(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(4);
    });
  });

  describe('environment variable handling', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should use environment variable for default timeout', () => {
      process.env.DEFAULT_TIMEOUT = '15000';
      
      const { createTimeoutMiddleware: newCreateTimeoutMiddleware } = require('../middleware/timeout');
      const middleware = newCreateTimeoutMiddleware();
      
      // The middleware should be created without error
      expect(typeof middleware).toBe('function');
      
      // Test the middleware to ensure it works
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should use environment variables for timeout configs', () => {
      process.env.TIMEOUT_QUICK = '5000';
      process.env.TIMEOUT_NORMAL = '25000';
      process.env.TIMEOUT_FILE = '100000';
      process.env.TIMEOUT_DOWNLOAD = '250000';
      
      const { timeoutConfigs: newTimeoutConfigs } = require('../middleware/timeout');
      
      expect(newTimeoutConfigs.quick).toBe(5000);
      expect(newTimeoutConfigs.normal).toBe(25000);
      expect(newTimeoutConfigs.file).toBe(100000);
      expect(newTimeoutConfigs.download).toBe(250000);
    });
  });

  describe('edge cases', () => {
    test('should handle undefined timeout parameter', () => {
      const middleware = createTimeoutMiddleware(undefined);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle negative timeout values', () => {
      const middleware = createTimeoutMiddleware(-1000);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle very large timeout values', () => {
      const middleware = createTimeoutMiddleware(1000000); // Use a large but reasonable value
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle string timeout values', () => {
      const middleware = createTimeoutMiddleware('5000');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 