/**
 * Validation Middleware Tests
 * Tests for all validation functions in middleware/validation.js
 */

const validation = require('../middleware/validation');

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      query: {},
      params: {},
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('validatePagination', () => {
    test('should pass with valid pagination parameters', () => {
      mockReq.query = { page: '1', limit: '10' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should pass with only page parameter', () => {
      mockReq.query = { page: '5' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should pass with only limit parameter', () => {
      mockReq.query = { limit: '20' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should pass with no pagination parameters', () => {
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should fail with invalid page (negative)', () => {
      mockReq.query = { page: '-1' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Page must be a positive integer' });
    });

    test('should fail with invalid page (zero)', () => {
      mockReq.query = { page: '0' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Page must be a positive integer' });
    });

    test('should fail with invalid page (non-numeric)', () => {
      mockReq.query = { page: 'abc' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Page must be a positive integer' });
    });

    test('should fail with invalid limit (negative)', () => {
      mockReq.query = { limit: '-5' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Limit must be between 1 and 100' });
    });

    test('should fail with invalid limit (zero)', () => {
      mockReq.query = { limit: '0' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Limit must be between 1 and 100' });
    });

    test('should fail with invalid limit (exceeds max)', () => {
      mockReq.query = { limit: '150' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Limit must be between 1 and 100' });
    });

    test('should fail with invalid limit (non-numeric)', () => {
      mockReq.query = { limit: 'xyz' };
      
      validation.validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Limit must be between 1 and 100' });
    });
  });

  describe('validateModelVersionId', () => {
    test('should pass with valid numeric id', () => {
      mockReq.params = { id: '123' };
      
      validation.validateModelVersionId(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should pass with valid string id that can be parsed as number', () => {
      mockReq.params = { id: '456' };
      
      validation.validateModelVersionId(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should fail with missing id', () => {
      validation.validateModelVersionId(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid modelVersionId is required' });
    });

    test('should fail with empty id', () => {
      mockReq.params = { id: '' };
      
      validation.validateModelVersionId(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid modelVersionId is required' });
    });

    test('should fail with non-numeric id', () => {
      mockReq.params = { id: 'abc' };
      
      validation.validateModelVersionId(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid modelVersionId is required' });
    });

    test('should fail with undefined id', () => {
      mockReq.params = { id: undefined };
      
      validation.validateModelVersionId(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid modelVersionId is required' });
    });
  });

  describe('validateFilePath', () => {
    test('should pass with valid file path', () => {
      mockReq.body = { filePath: '/path/to/file.safetensors' };
      
      validation.validateFilePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should pass with relative file path', () => {
      mockReq.body = { filePath: './models/model.safetensors' };
      
      validation.validateFilePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should fail with missing filePath', () => {
      validation.validateFilePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid filePath is required' });
    });

    test('should fail with non-string filePath', () => {
      mockReq.body = { filePath: 123 };
      
      validation.validateFilePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid filePath is required' });
    });

    test('should fail with empty filePath', () => {
      mockReq.body = { filePath: '' };
      
      validation.validateFilePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'filePath cannot be empty' });
    });

    test('should fail with whitespace-only filePath', () => {
      mockReq.body = { filePath: '   ' };
      
      validation.validateFilePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'filePath cannot be empty' });
    });
  });

  describe('validateDownloadRequest', () => {
    test('should pass with valid download request', () => {
      mockReq.body = {
        url: 'https://civitai.com/api/download/123',
        fileName: 'model.safetensors',
        baseModel: 'SD 1.5',
        modelVersionId: '456'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should fail with missing url', () => {
      mockReq.body = {
        fileName: 'model.safetensors',
        baseModel: 'SD 1.5',
        modelVersionId: '456'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid URL is required' });
    });

    test('should fail with non-string url', () => {
      mockReq.body = {
        url: 123,
        fileName: 'model.safetensors',
        baseModel: 'SD 1.5',
        modelVersionId: '456'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid URL is required' });
    });

    test('should fail with missing fileName', () => {
      mockReq.body = {
        url: 'https://civitai.com/api/download/123',
        baseModel: 'SD 1.5',
        modelVersionId: '456'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid fileName is required' });
    });

    test('should fail with non-string fileName', () => {
      mockReq.body = {
        url: 'https://civitai.com/api/download/123',
        fileName: 123,
        baseModel: 'SD 1.5',
        modelVersionId: '456'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid fileName is required' });
    });

    test('should fail with missing baseModel', () => {
      mockReq.body = {
        url: 'https://civitai.com/api/download/123',
        fileName: 'model.safetensors',
        modelVersionId: '456'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid baseModel is required' });
    });

    test('should fail with non-string baseModel', () => {
      mockReq.body = {
        url: 'https://civitai.com/api/download/123',
        fileName: 'model.safetensors',
        baseModel: 123,
        modelVersionId: '456'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid baseModel is required' });
    });

    test('should fail with missing modelVersionId', () => {
      mockReq.body = {
        url: 'https://civitai.com/api/download/123',
        fileName: 'model.safetensors',
        baseModel: 'SD 1.5'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid modelVersionId is required' });
    });

    test('should fail with non-numeric modelVersionId', () => {
      mockReq.body = {
        url: 'https://civitai.com/api/download/123',
        fileName: 'model.safetensors',
        baseModel: 'SD 1.5',
        modelVersionId: 'abc'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid modelVersionId is required' });
    });

    test('should fail with invalid URL format', () => {
      mockReq.body = {
        url: 'not-a-valid-url',
        fileName: 'model.safetensors',
        baseModel: 'SD 1.5',
        modelVersionId: '456'
      };
      
      validation.validateDownloadRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid URL format' });
    });
  });

  describe('validateFilesArray', () => {
    test('should pass with valid files array', () => {
      mockReq.body = {
        files: [
          { status: 'Present' },
          { status: 'Missing' },
          { status: 'Unknown' }
        ]
      };
      
      validation.validateFilesArray(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should pass with files array without status', () => {
      mockReq.body = {
        files: [
          { name: 'file1.safetensors' },
          { name: 'file2.safetensors' }
        ]
      };
      
      validation.validateFilesArray(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should fail with missing files array', () => {
      validation.validateFilesArray(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'files must be an array' });
    });

    test('should fail with non-array files', () => {
      mockReq.body = { files: 'not-an-array' };
      
      validation.validateFilesArray(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'files must be an array' });
    });

    test('should fail with empty files array', () => {
      mockReq.body = { files: [] };
      
      validation.validateFilesArray(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'files array cannot be empty' });
    });

    test('should fail with invalid file object (null)', () => {
      mockReq.body = { files: [null] };
      
      validation.validateFilesArray(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid file object at index 0' });
    });

    test('should fail with invalid file object (string)', () => {
      mockReq.body = { files: ['not-an-object'] };
      
      validation.validateFilesArray(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid file object at index 0' });
    });

    test('should fail with invalid file status', () => {
      mockReq.body = {
        files: [
          { status: 'InvalidStatus' }
        ]
      };
      
      validation.validateFilesArray(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid file status at index 0' });
    });
  });

  describe('validatePath', () => {
    test('should pass with valid path', () => {
      mockReq.body = { path: '/valid/path' };
      
      validation.validatePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should pass with relative path', () => {
      mockReq.body = { path: './relative/path' };
      
      validation.validatePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should fail with missing path', () => {
      validation.validatePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid path is required' });
    });

    test('should fail with non-string path', () => {
      mockReq.body = { path: 123 };
      
      validation.validatePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid path is required' });
    });

    test('should fail with empty path', () => {
      mockReq.body = { path: '' };
      
      validation.validatePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Path cannot be empty' });
    });

    test('should fail with whitespace-only path', () => {
      mockReq.body = { path: '   ' };
      
      validation.validatePath(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Path cannot be empty' });
    });
  });

  describe('validateFixFileRequest', () => {
    test('should pass with valid fix file request', () => {
      mockReq.body = {
        modelVersionId: '123',
        filePath: '/path/to/file.safetensors'
      };
      
      validation.validateFixFileRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should fail with missing modelVersionId', () => {
      mockReq.body = { filePath: '/path/to/file.safetensors' };
      
      validation.validateFixFileRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid modelVersionId is required' });
    });

    test('should fail with non-numeric modelVersionId', () => {
      mockReq.body = {
        modelVersionId: 'abc',
        filePath: '/path/to/file.safetensors'
      };
      
      validation.validateFixFileRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid modelVersionId is required' });
    });

    test('should fail with missing filePath', () => {
      mockReq.body = { modelVersionId: '123' };
      
      validation.validateFixFileRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid filePath is required' });
    });

    test('should fail with non-string filePath', () => {
      mockReq.body = {
        modelVersionId: '123',
        filePath: 123
      };
      
      validation.validateFixFileRequest(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Valid filePath is required' });
    });
  });
}); 