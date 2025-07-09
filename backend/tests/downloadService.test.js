const fs = require('fs');
const path = require('path');
const axios = require('axios');
const downloadService = require('../services/downloadService');

// Mock all dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('axios');
jest.mock('../config/agents', () => ({
  httpAgent: {},
  httpsAgent: {}
}));
jest.mock('../config/constants', () => ({
  DOWNLOAD_CONFIG: {
    baseDir: './test-downloads',
    timeout: 300000,
    userAgent: 'Test User Agent'
  }
}));
jest.mock('../services/databaseService', () => ({
  updateModelAsInProgress: jest.fn(),
  updateModelAsDownloaded: jest.fn(),
  markModelAsFailed: jest.fn()
}));
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  userAction: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  download: jest.fn(),
  logTimeTaken: jest.fn()
}));

const databaseService = require('../services/databaseService');
const logger = require('../utils/logger');

describe('DownloadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment
    delete process.env.CIVITAI_TOKEN;
    
    // Mock path.join to return predictable paths
    path.join.mockImplementation((...args) => args.join('/'));
    
    // Mock fs.existsSync
    fs.existsSync.mockReturnValue(false);
    
    // Mock fs.mkdirSync
    fs.mkdirSync.mockImplementation(() => {});
    
    // Mock fs.createWriteStream
    const mockWriteStream = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn(),
      pipe: jest.fn()
    };
    fs.createWriteStream.mockReturnValue(mockWriteStream);
    
    // Mock fs.unlinkSync
    fs.unlinkSync.mockImplementation(() => {});
    
    // Mock database service methods
    databaseService.updateModelAsInProgress.mockResolvedValue();
    databaseService.updateModelAsDownloaded.mockResolvedValue();
    databaseService.markModelAsFailed.mockResolvedValue();
  });

  describe('downloadModelFile', () => {
    const validParams = {
      url: 'https://example.com/model.safetensors',
      fileName: 'test-model.safetensors',
      baseModel: 'SD15',
      modelVersionId: 123
    };

    it('should throw error for missing required parameters', async () => {
      await expect(downloadService.downloadModelFile()).rejects.toThrow('Missing required parameters: url, fileName, baseModel, modelVersionId');
      await expect(downloadService.downloadModelFile('url')).rejects.toThrow('Missing required parameters: url, fileName, baseModel, modelVersionId');
      await expect(downloadService.downloadModelFile('url', 'file')).rejects.toThrow('Missing required parameters: url, fileName, baseModel, modelVersionId');
      await expect(downloadService.downloadModelFile('url', 'file', 'model')).rejects.toThrow('Missing required parameters: url, fileName, baseModel, modelVersionId');
    });

    it('should handle directory creation failure', async () => {
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      )).rejects.toThrow('Failed to create directory ./test-downloads/SD15: Permission denied');

      expect(databaseService.markModelAsFailed).toHaveBeenCalledWith(123);
    });

    it('should handle existing file in subfolder', async () => {
      // Mock file exists in main directory first, then in subfolder
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath === './test-downloads/SD15/test-model.safetensors') {
          return true; // File exists in main directory
        }
        if (filePath === './test-downloads/SD15/123') {
          return false; // Subfolder doesn't exist yet
        }
        if (filePath === './test-downloads/SD15/123/test-model.safetensors') {
          return true; // File exists in subfolder
        }
        return false;
      });

      await downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      // Should not download, just update DB
      expect(axios).not.toHaveBeenCalled();
      expect(databaseService.updateModelAsDownloaded).toHaveBeenCalledWith(123, './test-downloads/SD15/123/test-model.safetensors');
      expect(logger.info).toHaveBeenCalledWith('File already exists in subfolder', {
        fileName: 'test-model.safetensors',
        modelVersionId: 123
      });
    });

    it('should append CivitAI token to URLs', async () => {
      process.env.CIVITAI_TOKEN = 'test-token-123';
      
      const civitaiUrl = 'https://civitai.com/api/download/models/123';
      
      // Mock successful download with simple approach
      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            // Call callback immediately to complete the promise
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            // Call callback immediately
            setImmediate(() => callback(Buffer.alloc(1024)));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await downloadService.downloadModelFile(
        civitaiUrl,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://civitai.com/api/download/models/123?token=test-token-123'
      }));
    });

    it('should append CivitAI token to URLs with existing query parameters', async () => {
      process.env.CIVITAI_TOKEN = 'test-token-123';
      
      const civitaiUrl = 'https://civitai.com/api/download/models/123?type=model';
      
      // Mock successful download
      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setImmediate(() => callback(Buffer.alloc(1024)));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await downloadService.downloadModelFile(
        civitaiUrl,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://civitai.com/api/download/models/123?type=model&token=test-token-123'
      }));
    });

    it('should handle write stream error', async () => {
      // Mock file doesn't exist initially, so filePath gets defined
      fs.existsSync.mockImplementation((filePath) => {
        return false;
      });

      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            setImmediate(() => callback(new Error('Write error')));
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockReturnThis(),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await expect(downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      )).rejects.toThrow('File write error: Write error');

      expect(databaseService.markModelAsFailed).toHaveBeenCalledWith(123);
    });

    it('should handle download stream error', async () => {
      // Mock file doesn't exist initially, so filePath gets defined
      fs.existsSync.mockImplementation((filePath) => {
        return false;
      });

      const mockWriteStream = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            setImmediate(() => callback(new Error('Network error')));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await expect(downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      )).rejects.toThrow('Download error: Network error');

      expect(databaseService.markModelAsFailed).toHaveBeenCalledWith(123);
    });

    it('should handle axios request failure', async () => {
      axios.mockRejectedValue(new Error('Request failed'));

      await expect(downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      )).rejects.toThrow('Request failed');

      expect(databaseService.markModelAsFailed).toHaveBeenCalledWith(123);
    });

    it('should handle database update failure during download', async () => {
      databaseService.updateModelAsInProgress.mockRejectedValue(new Error('DB error'));

      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setImmediate(() => callback(Buffer.alloc(1024)));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      expect(logger.error).toHaveBeenCalledWith('Failed to set model as in progress', {
        modelVersionId: 123,
        error: 'DB error'
      });
    });

    it('should handle database update failure after download', async () => {
      databaseService.updateModelAsDownloaded.mockRejectedValue(new Error('DB update failed'));

      // Mock file doesn't exist initially, so filePath gets defined
      fs.existsSync.mockImplementation((filePath) => {
        return false;
      });

      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setImmediate(() => callback(Buffer.alloc(1024)));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await expect(downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      )).rejects.toThrow('DB update failed');
    });

    it('should handle database mark as failed error', async () => {
      axios.mockRejectedValue(new Error('Request failed'));
      databaseService.markModelAsFailed.mockRejectedValue(new Error('DB mark failed error'));

      await expect(downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      )).rejects.toThrow('Request failed');

      expect(logger.error).toHaveBeenCalledWith('Failed to mark model as failed in DB', {
        modelVersionId: 123,
        error: 'DB mark failed error'
      });
    });

    it('should handle file cleanup error', async () => {
      // Mock file doesn't exist initially, so filePath gets defined
      fs.existsSync.mockImplementation((filePath) => {
        return false;
      });

      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            setImmediate(() => callback(new Error('Write error')));
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockReturnThis(),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      await expect(downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      )).rejects.toThrow('File write error: Write error');

      expect(databaseService.markModelAsFailed).toHaveBeenCalledWith(123);
    });

    it('should handle download without content-length header', async () => {
      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setImmediate(() => callback(Buffer.alloc(1024)));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: {}, // No content-length
        data: mockDataStream
      });

      await downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      // Should not log progress without content-length
      expect(logger.download).not.toHaveBeenCalled();
    });

    it('should handle directory already exists', async () => {
      fs.existsSync.mockImplementation((dirPath) => {
        return dirPath === './test-downloads/SD15';
      });

      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setImmediate(() => callback(Buffer.alloc(1024)));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(axios).toHaveBeenCalled();
    });

    it('should handle existing file without subfolder', async () => {
      // Mock file exists in main directory
      fs.existsSync.mockImplementation((filePath) => {
        return filePath === './test-downloads/SD15/test-model.safetensors';
      });

      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setImmediate(() => callback(Buffer.alloc(1024)));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      // Should create subfolder
      expect(fs.mkdirSync).toHaveBeenCalledWith('./test-downloads/SD15/123');
      expect(axios).toHaveBeenCalled();
    });

    it('should successfully download a file', async () => {
      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            setImmediate(() => callback(Buffer.alloc(1024)));
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      // Verify directory creation
      expect(fs.mkdirSync).toHaveBeenCalledWith('./test-downloads/SD15', { recursive: true });
      
      // Verify axios call
      expect(axios).toHaveBeenCalledWith({
        method: 'get',
        url: validParams.url,
        responseType: 'stream',
        timeout: 300000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Test User Agent'
        },
        httpAgent: {},
        httpsAgent: {}
      });

      // Verify database updates
      expect(databaseService.updateModelAsInProgress).toHaveBeenCalledWith(123);
      expect(databaseService.updateModelAsDownloaded).toHaveBeenCalledWith(123, './test-downloads/SD15/test-model.safetensors');
      
      // Verify logging
      expect(logger.userAction).toHaveBeenCalledWith('Download started', {
        fileName: 'test-model.safetensors',
        baseModel: 'SD15',
        modelVersionId: 123
      });
      expect(logger.userAction).toHaveBeenCalledWith('Download completed', expect.objectContaining({
        fileName: 'test-model.safetensors'
      }));
    });

    it('should track download progress correctly', async () => {
      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback());
          }
          return mockWriteStream;
        }),
        close: jest.fn(),
        pipe: jest.fn()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      const mockDataStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            // Simulate multiple data chunks to trigger progress logging
            setImmediate(() => callback(Buffer.alloc(300000))); // ~28%
            setImmediate(() => callback(Buffer.alloc(300000))); // ~57%
            setImmediate(() => callback(Buffer.alloc(448576))); // 100%
          }
          return mockDataStream;
        }),
        pipe: jest.fn()
      };
      
      axios.mockResolvedValue({
        headers: { 'content-length': '1048576' },
        data: mockDataStream
      });

      await downloadService.downloadModelFile(
        validParams.url,
        validParams.fileName,
        validParams.baseModel,
        validParams.modelVersionId
      );

      // Check that progress logging was called multiple times
      expect(logger.download).toHaveBeenCalledTimes(3);
      
      // Check that the calls contain the expected data structure
      expect(logger.download).toHaveBeenCalledWith('test-model.safetensors', expect.objectContaining({
        percent: expect.any(Number),
        downloaded: expect.any(String),
        total: expect.any(String),
        speed: expect.any(String)
      }));
    });
  });
}); 