/**
 * DownloadQueue Tests
 * Tests for the download queue service that manages concurrent downloads
 */

// Mock the logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock the constants to control test environment
jest.mock('../config/constants', () => ({
  DOWNLOAD_CONFIG: {
    maxConcurrent: 3
  }
}));

describe('DownloadQueue', () => {
  let DownloadQueue;
  let downloadQueue;
  let logger;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Clear module cache to get fresh instances
    jest.resetModules();
    
    // Get the logger mock
    logger = require('../utils/logger');
    
    // Import the actual DownloadQueue class
    const downloadQueueModule = require('../services/downloadQueue');
    
    // Since the module exports a singleton, we need to access the class differently
    // We'll test the singleton instance directly
    downloadQueue = downloadQueueModule;
  });

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(downloadQueue).toBeDefined();
      expect(downloadQueue.active).toBe(0);
      expect(downloadQueue.maxConcurrent).toBe(3);
      expect(downloadQueue.queue).toEqual([]);
      expect(downloadQueue.errors).toEqual([]);
    });

    test('should be a singleton instance', () => {
      const instance1 = require('../services/downloadQueue');
      const instance2 = require('../services/downloadQueue');
      expect(instance1).toBe(instance2);
    });
  });

  describe('add() method', () => {
    test('should execute task immediately when under concurrent limit', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');
      
      await downloadQueue.add(mockTask);
      
      expect(mockTask).toHaveBeenCalledTimes(1);
      expect(downloadQueue.active).toBe(0); // Should be back to 0 after completion
      expect(downloadQueue.queue.length).toBe(0);
    });

    test('should queue task when at concurrent limit', async () => {
      // Create a task that never resolves to keep active count high
      const blockingTask = () => new Promise(() => {});
      const queuedTask = jest.fn().mockResolvedValue('queued');
      
      // Fill up the queue to max concurrent
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      
      // Wait a bit for the tasks to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Now try to add another task - should be queued
      await downloadQueue.add(queuedTask);
      
      expect(downloadQueue.active).toBe(3);
      expect(downloadQueue.queue.length).toBe(1);
      expect(queuedTask).not.toHaveBeenCalled(); // Should not be called yet
    });

    test('should handle task errors and log them', async () => {
      const errorMessage = 'Test error';
      const mockTask = jest.fn().mockRejectedValue(new Error(errorMessage));
      
      await downloadQueue.add(mockTask);
      
      expect(logger.error).toHaveBeenCalledWith('Download task failed', {
        error: errorMessage
      });
      expect(downloadQueue.errors.length).toBe(1);
      expect(downloadQueue.errors[0].error).toBe(errorMessage);
      expect(downloadQueue.errors[0].timestamp).toBeDefined();
      expect(downloadQueue.errors[0].stack).toBeDefined();
    });

    test('should maintain active count correctly after error', async () => {
      const mockTask = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await downloadQueue.add(mockTask);
      
      expect(downloadQueue.active).toBe(0); // Should be back to 0 after error
    });

    test('should limit error history to 10 entries', async () => {
      // Add 12 tasks that all fail
      for (let i = 0; i < 12; i++) {
        const mockTask = jest.fn().mockRejectedValue(new Error(`Error ${i}`));
        await downloadQueue.add(mockTask);
      }
      
      expect(downloadQueue.errors.length).toBe(10);
      expect(downloadQueue.errors[0].error).toBe('Error 2'); // First error should be from index 2
      expect(downloadQueue.errors[9].error).toBe('Error 11'); // Last error should be from index 11
    });

    test('should process next queued task after completion', async () => {
      let resolveBlockingTask;
      const blockingTask = () => new Promise(resolve => {
        resolveBlockingTask = resolve;
      });
      
      const queuedTask = jest.fn().mockResolvedValue('queued');
      
      // Fill up the queue
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      
      // Wait a bit for tasks to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add a task to queue
      downloadQueue.add(queuedTask);
      
      expect(downloadQueue.queue.length).toBe(1);
      expect(queuedTask).not.toHaveBeenCalled();
      
      // Complete one of the blocking tasks
      resolveBlockingTask();
      
      // Wait for the queued task to be processed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(queuedTask).toHaveBeenCalledTimes(1);
      expect(downloadQueue.queue.length).toBe(0);
    });
  });

  describe('processNext() method', () => {
    test('should process next task when under concurrent limit', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');
      
      // Add task to queue
      downloadQueue.queue.push(mockTask);
      
      expect(downloadQueue.queue.length).toBe(1);
      expect(downloadQueue.active).toBe(0);
      
      // Process next
      downloadQueue.processNext();
      
      // Wait for task to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockTask).toHaveBeenCalledTimes(1);
      expect(downloadQueue.queue.length).toBe(0);
      expect(downloadQueue.active).toBe(0);
    });

    test('should not process next task when at concurrent limit', async () => {
      // Create blocking tasks to fill up concurrent limit
      const blockingTask = () => new Promise(() => {});
      
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      
      // Wait for tasks to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const queuedTask = jest.fn().mockResolvedValue('success');
      downloadQueue.queue.push(queuedTask);
      
      expect(downloadQueue.active).toBe(3);
      expect(downloadQueue.queue.length).toBe(1);
      
      // Try to process next
      downloadQueue.processNext();
      
      // Task should not be processed
      expect(queuedTask).not.toHaveBeenCalled();
      expect(downloadQueue.queue.length).toBe(1);
    });

    test('should do nothing when queue is empty', () => {
      expect(downloadQueue.queue.length).toBe(0);
      expect(downloadQueue.active).toBe(0);
      
      // Should not throw
      expect(() => downloadQueue.processNext()).not.toThrow();
    });
  });

  describe('getStatus() method', () => {
    test('should return correct status when idle', () => {
      const status = downloadQueue.getStatus();
      
      expect(status).toEqual({
        active: 0,
        queued: 0,
        maxConcurrent: 3,
        recentErrors: []
      });
    });

    test('should return correct status with active downloads', async () => {
      const blockingTask = () => new Promise(() => {});
      
      downloadQueue.add(blockingTask);
      
      // Wait for task to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const status = downloadQueue.getStatus();
      
      expect(status.active).toBe(1);
      expect(status.queued).toBe(0);
      expect(status.maxConcurrent).toBe(3);
    });

    test('should return correct status with queued downloads', async () => {
      const blockingTask = () => new Promise(() => {});
      
      // Fill up concurrent limit
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      
      // Wait for tasks to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add to queue
      downloadQueue.add(blockingTask);
      
      const status = downloadQueue.getStatus();
      
      expect(status.active).toBe(3);
      expect(status.queued).toBe(1);
      expect(status.maxConcurrent).toBe(3);
    });

    test('should return only last 5 errors', async () => {
      // Add 7 tasks that fail
      for (let i = 0; i < 7; i++) {
        const mockTask = jest.fn().mockRejectedValue(new Error(`Error ${i}`));
        await downloadQueue.add(mockTask);
      }
      
      const status = downloadQueue.getStatus();
      
      expect(status.recentErrors.length).toBe(5);
      expect(status.recentErrors[0].error).toBe('Error 2'); // First error in recent 5
      expect(status.recentErrors[4].error).toBe('Error 6'); // Last error in recent 5
    });
  });

  describe('clearErrors() method', () => {
    test('should clear all errors', async () => {
      // Add some errors
      const mockTask = jest.fn().mockRejectedValue(new Error('Test error'));
      await downloadQueue.add(mockTask);
      
      expect(downloadQueue.errors.length).toBe(1);
      
      downloadQueue.clearErrors();
      
      expect(downloadQueue.errors.length).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('Download queue errors cleared');
    });

    test('should work when no errors exist', () => {
      expect(downloadQueue.errors.length).toBe(0);
      
      expect(() => downloadQueue.clearErrors()).not.toThrow();
      
      expect(downloadQueue.errors.length).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('Download queue errors cleared');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle null or undefined tasks gracefully', async () => {
      // Test with null task - should be handled gracefully
      await downloadQueue.add(null);
      
      expect(logger.error).toHaveBeenCalledWith('Download task failed', {
        error: 'downloadTask is not a function'
      });
      expect(downloadQueue.errors.length).toBe(1);
      expect(downloadQueue.active).toBe(0);
      
      // Test with undefined task - should be handled gracefully
      await downloadQueue.add(undefined);
      
      expect(downloadQueue.errors.length).toBe(2);
      expect(downloadQueue.active).toBe(0);
    });

    test('should handle tasks that throw synchronously', async () => {
      const syncErrorTask = () => {
        throw new Error('Synchronous error');
      };
      
      await downloadQueue.add(syncErrorTask);
      
      expect(logger.error).toHaveBeenCalledWith('Download task failed', {
        error: 'Synchronous error'
      });
      expect(downloadQueue.errors.length).toBe(1);
      expect(downloadQueue.active).toBe(0);
    });

    test('should handle multiple rapid additions', async () => {
      const tasks = [];
      const results = [];
      
      // Create 10 tasks that resolve with their index
      for (let i = 0; i < 10; i++) {
        const task = jest.fn().mockResolvedValue(`result-${i}`);
        tasks.push(task);
        downloadQueue.add(task).then(result => results.push(result));
      }
      
      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // All tasks should have been executed
      tasks.forEach(task => {
        expect(task).toHaveBeenCalledTimes(1);
      });
      
      expect(downloadQueue.active).toBe(0);
      expect(downloadQueue.queue.length).toBe(0);
    });

    test('should handle tasks that return non-promise values', async () => {
      const syncTask = jest.fn().mockReturnValue('sync result');
      
      await downloadQueue.add(syncTask);
      
      expect(syncTask).toHaveBeenCalledTimes(1);
      expect(downloadQueue.active).toBe(0);
    });

    test('should maintain queue order under high load', async () => {
      const executionOrder = [];
      const tasks = [];
      
      // Create 5 tasks that record their execution order
      for (let i = 0; i < 5; i++) {
        const task = jest.fn().mockImplementation(() => {
          executionOrder.push(i);
          return Promise.resolve(`task-${i}`);
        });
        tasks.push(task);
      }
      
      // Add all tasks rapidly
      const promises = tasks.map(task => downloadQueue.add(task));
      
      // Wait for all to complete
      await Promise.all(promises);
      
      // First 3 should execute immediately, last 2 should be queued
      expect(executionOrder.length).toBe(5);
      expect(executionOrder.slice(0, 3)).toEqual([0, 1, 2]); // First 3 should be in order
      expect(executionOrder.slice(3)).toEqual([3, 4]); // Last 2 should be in order
    });
  });

  describe('Concurrent limit behavior', () => {
    test('should respect maxConcurrent limit', async () => {
      const activeCounts = [];
      const blockingTask = () => new Promise(resolve => {
        activeCounts.push(downloadQueue.active);
        setTimeout(resolve, 50);
      });
      
      // Add more tasks than the concurrent limit
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(downloadQueue.add(blockingTask));
      }
      
      // Wait for all to complete
      await Promise.all(promises);
      
      // Check that active count never exceeded maxConcurrent
      activeCounts.forEach(count => {
        expect(count).toBeLessThanOrEqual(3);
      });
      
      // Should have had some counts at the maximum
      expect(activeCounts.some(count => count === 3)).toBe(true);
    });

    test('should process queue when active count drops', async () => {
      let resolveFirstTask;
      const firstTask = () => new Promise(resolve => {
        resolveFirstTask = resolve;
      });
      
      const secondTask = jest.fn().mockResolvedValue('second');
      
      // Add first task (should start immediately)
      downloadQueue.add(firstTask);
      
      // Wait for it to start
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(downloadQueue.active).toBe(1);
      
      // Fill up the queue to max concurrent
      const blockingTask = () => new Promise(() => {});
      downloadQueue.add(blockingTask);
      downloadQueue.add(blockingTask);
      
      // Wait for tasks to start
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(downloadQueue.active).toBe(3);
      
      // Add second task (should be queued)
      downloadQueue.add(secondTask);
      expect(downloadQueue.queue.length).toBe(1);
      expect(secondTask).not.toHaveBeenCalled();
      
      // Complete first task
      resolveFirstTask();
      
      // Wait for second task to be processed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(secondTask).toHaveBeenCalledTimes(1);
      expect(downloadQueue.queue.length).toBe(0);
    });
  });
}); 