const request = require('supertest');
const express = require('express');

// Mock all dependencies before requiring the router
jest.mock('../services/fileService');
jest.mock('../services/pathService');
jest.mock('../services/databaseService');
jest.mock('../middleware/validation');
jest.mock('../middleware/timeout');
jest.mock('fs');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  userAction: jest.fn(),
  logTimeTaken: jest.fn()
}));

// Mock sqlite3 to prevent native binding issues
jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: jest.fn()
  })
}));

// Mock the database configuration
jest.mock('../config/database', () => ({
  validateDatabaseConfig: jest.fn(),
  DatabasePool: jest.fn().mockImplementation(() => ({
    executeQuery: jest.fn(),
    runQuery: jest.fn(),
    runQuerySingle: jest.fn(),
    runUpdate: jest.fn(),
    getStats: jest.fn(),
    close: jest.fn()
  })),
  validateDatabase: jest.fn()
}));

// Mock the services
const mockFileService = require('../services/fileService');
const mockPathService = require('../services/pathService');
const mockDatabaseService = require('../services/databaseService');
const mockValidation = require('../middleware/validation');
const mockTimeout = require('../middleware/timeout');

// Create express app for testing
const app = express();
app.use(express.json());

// Mock middleware to pass through
mockValidation.validateFilesArray = jest.fn((req, res, next) => next());
mockValidation.validateFilePath = jest.fn((req, res, next) => next());
mockValidation.validateFixFileRequest = jest.fn((req, res, next) => next());
mockTimeout.createTimeoutMiddleware = jest.fn(() => (req, res, next) => next());

// Import and use the router
const filesRouter = require('../routes/v1/files');
app.use('/api/v1/files', filesRouter);

describe('Files Routes', () => {
  let server;

  beforeAll(async () => {
    // Create a test server on a specific port to avoid conflicts
    server = app.listen(3004);
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mock implementations to default success responses
    mockFileService.checkFilesInDatabase.mockResolvedValue([
      { fileName: 'test.safetensors', status: 'Present' }
    ]);
    mockFileService.validateDownloadedFiles.mockResolvedValue({
      valid: 10,
      invalid: 2,
      errors: []
    });
    mockFileService.findMissingFiles.mockResolvedValue({
      missing: ['file1.safetensors'],
      found: ['file2.safetensors']
    });
    mockFileService.computeFileHash.mockResolvedValue({
      hash: 'abc123',
      filePath: '/test/file.safetensors'
    });
    mockFileService.fixFile.mockResolvedValue({
      success: true,
      oldPath: '/old/path',
      newPath: '/new/path'
    });
    mockFileService.scanUniqueLoras.mockResolvedValue({
      unique: 5,
      duplicates: 2,
      files: []
    });
    mockFileService.renameFileAsDuplicate.mockResolvedValue({
      success: true,
      oldPath: '/old/path',
      newPath: '/old/path.duplicate'
    });
    mockFileService.getSafetensorCounts.mockResolvedValue({
      total: 100,
      paths: []
    });
    
    mockPathService.readSavedPaths.mockResolvedValue(['/path1', '/path2']);
    
    mockDatabaseService.getAllFileNames.mockResolvedValue(['file1.safetensors', 'file2.safetensors']);
    mockDatabaseService.getDownloadedFiles.mockResolvedValue([
      { fileName: 'file1.safetensors', filePath: '/path1/file1.safetensors' }
    ]);
    mockDatabaseService.getFileNameByModelVersionId.mockResolvedValue({
      fileName: 'test.safetensors',
      modelVersionId: 123
    });
    mockDatabaseService.updateModelAsDownloaded.mockResolvedValue({ changes: 1 });
    mockDatabaseService.batchRegisterUnregisteredFiles.mockResolvedValue({
      updated: 5,
      errors: []
    });
    mockDatabaseService.registerLoraInDatabase.mockResolvedValue({
      success: true,
      modelVersionId: 123
    });
    mockDatabaseService.verifyAllCivitDataSchemaAndIndexes.mockResolvedValue({
      success: true,
      tables: ['table1', 'table2']
    });
    mockDatabaseService.getLatestPublishedAt.mockResolvedValue('2023-01-01');
    mockDatabaseService.resetAllCivitData.mockResolvedValue({ changes: 10 });
    mockDatabaseService.runUpdateMarkAsFailed.mockResolvedValue({ changes: 1 });
  });

  afterAll(async () => {
    // Close the server to clean up handles
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    
    // Clear any remaining timers
    jest.clearAllTimers();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Additional cleanup time
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  // Global teardown
  afterAll(async () => {
    // Ensure all handles are closed
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('POST /check', () => {
    it('should check files against database successfully', async () => {
      const files = ['file1.safetensors', 'file2.safetensors'];
      
      const response = await request(app)
        .post('/api/v1/files/check')
        .send({ files })
        .expect(200);

      expect(response.body).toEqual({
        results: [{ fileName: 'test.safetensors', status: 'Present' }]
      });
      expect(mockFileService.checkFilesInDatabase).toHaveBeenCalledWith(files, ['file1.safetensors', 'file2.safetensors']);
    });

    it('should handle errors in check endpoint', async () => {
      mockFileService.checkFilesInDatabase.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post('/api/v1/files/check')
        .send({ files: ['file1.safetensors'] })
        .expect(500);

      expect(response.body).toEqual({ error: 'Database error' });
    });
  });

  describe('POST /validate', () => {
    it('should validate downloaded files successfully', async () => {
      const response = await request(app)
        .post('/api/v1/files/validate')
        .expect(200);

      expect(response.body).toEqual({
        valid: 10,
        invalid: 2,
        errors: []
      });
      expect(mockFileService.validateDownloadedFiles).toHaveBeenCalledWith([
        { fileName: 'file1.safetensors', filePath: '/path1/file1.safetensors' }
      ]);
    });

    it('should handle errors in validate endpoint', async () => {
      mockFileService.validateDownloadedFiles.mockRejectedValue(new Error('Validation error'));
      
      const response = await request(app)
        .post('/api/v1/files/validate')
        .expect(500);

      expect(response.body).toEqual({ error: 'Validation error' });
    });
  });

  describe('POST /find-missing', () => {
    it('should find missing files successfully', async () => {
      const response = await request(app)
        .post('/api/v1/files/find-missing')
        .expect(200);

      expect(response.body).toEqual({
        missing: ['file1.safetensors'],
        found: ['file2.safetensors']
      });
      expect(mockFileService.findMissingFiles).toHaveBeenCalledWith(['/path1', '/path2'], ['file1.safetensors', 'file2.safetensors']);
    });

    it('should handle errors in find-missing endpoint', async () => {
      mockFileService.findMissingFiles.mockRejectedValue(new Error('File system error'));
      
      const response = await request(app)
        .post('/api/v1/files/find-missing')
        .expect(500);

      expect(response.body).toEqual({ error: 'File system error' });
    });
  });

  describe('POST /compute-hash', () => {
    it('should compute file hash successfully', async () => {
      const response = await request(app)
        .post('/api/v1/files/compute-hash')
        .send({ filePath: '/test/file.safetensors' })
        .expect(200);

      expect(response.body).toEqual({
        hash: 'abc123',
        filePath: '/test/file.safetensors'
      });
      expect(mockFileService.computeFileHash).toHaveBeenCalledWith('/test/file.safetensors');
    });

    it('should handle file not found error', async () => {
      mockFileService.computeFileHash.mockRejectedValue(new Error('File not found'));
      
      const response = await request(app)
        .post('/api/v1/files/compute-hash')
        .send({ filePath: '/nonexistent/file.safetensors' })
        .expect(404);

      expect(response.body).toEqual({ error: 'File not found' });
    });

    it('should handle other errors in compute-hash endpoint', async () => {
      mockFileService.computeFileHash.mockRejectedValue(new Error('Hash computation error'));
      
      const response = await request(app)
        .post('/api/v1/files/compute-hash')
        .send({ filePath: '/test/file.safetensors' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Hash computation error' });
    });
  });

  describe('POST /fix', () => {
    it('should fix file naming successfully', async () => {
      const response = await request(app)
        .post('/api/v1/files/fix')
        .send({ 
          modelVersionId: 123, 
          filePath: '/old/path/file.safetensors' 
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        oldPath: '/old/path',
        newPath: '/new/path'
      });
      expect(mockFileService.fixFile).toHaveBeenCalledWith(123, '/old/path/file.safetensors', 'test.safetensors');
      expect(mockDatabaseService.updateModelAsDownloaded).toHaveBeenCalledWith(123, '/new/path');
    });

    it('should handle model not found error', async () => {
      mockDatabaseService.getFileNameByModelVersionId.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/v1/files/fix')
        .send({ 
          modelVersionId: 999, 
          filePath: '/old/path/file.safetensors' 
        })
        .expect(404);

      expect(response.body).toEqual({ error: 'Model not found in database' });
    });

    it('should handle file not found error', async () => {
      mockFileService.fixFile.mockRejectedValue(new Error('File not found'));
      
      const response = await request(app)
        .post('/api/v1/files/fix')
        .send({ 
          modelVersionId: 123, 
          filePath: '/nonexistent/file.safetensors' 
        })
        .expect(404);

      expect(response.body).toEqual({ error: 'File not found' });
    });

    it('should handle file already exists error', async () => {
      mockFileService.fixFile.mockRejectedValue(new Error('File already exists'));
      
      const response = await request(app)
        .post('/api/v1/files/fix')
        .send({ 
          modelVersionId: 123, 
          filePath: '/old/path/file.safetensors' 
        })
        .expect(409);

      expect(response.body).toEqual({ error: 'File already exists' });
    });

    it('should handle other errors in fix endpoint', async () => {
      mockFileService.fixFile.mockRejectedValue(new Error('Fix operation error'));
      
      const response = await request(app)
        .post('/api/v1/files/fix')
        .send({ 
          modelVersionId: 123, 
          filePath: '/old/path/file.safetensors' 
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Fix operation error' });
    });
  });

  describe('POST /scan-unique-loras', () => {
    it('should scan for unique loras successfully', async () => {
      const response = await request(app)
        .post('/api/v1/files/scan-unique-loras')
        .expect(200);

      expect(response.body).toEqual({
        unique: 5,
        duplicates: 2,
        files: []
      });
      expect(mockFileService.scanUniqueLoras).toHaveBeenCalledWith(['/path1', '/path2'], ['file1.safetensors', 'file2.safetensors']);
    });

    it('should handle no saved paths error', async () => {
      mockPathService.readSavedPaths.mockResolvedValue([]);
      
      const response = await request(app)
        .post('/api/v1/files/scan-unique-loras')
        .expect(400);

      expect(response.body).toEqual({ error: 'No saved paths to scan.' });
    });

    it('should handle errors in scan-unique-loras endpoint', async () => {
      mockFileService.scanUniqueLoras.mockRejectedValue(new Error('Scan error'));
      
      const response = await request(app)
        .post('/api/v1/files/scan-unique-loras')
        .expect(500);

      expect(response.body).toEqual({ error: 'Scan error' });
    });
  });

  describe('POST /register-unregistered', () => {
    it('should register unregistered files successfully', async () => {
      const files = [
        { modelId: 1, modelVersionId: 123, fileName: 'file1.safetensors' },
        { modelId: 2, modelVersionId: 456, fileName: 'file2.safetensors' }
      ];
      
      // Mock console.log to prevent output during tests
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      const response = await request(app)
        .post('/api/v1/files/register-unregistered')
        .send({ files })
        .expect(200);

      expect(response.body).toEqual({
        updated: 5,
        errors: []
      });
      expect(mockDatabaseService.batchRegisterUnregisteredFiles).toHaveBeenCalledWith(files);
      
      // Restore console.log
      console.log = originalConsoleLog;
    });

    it('should handle no files provided error', async () => {
      // Mock console.log to prevent output during tests
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      const response = await request(app)
        .post('/api/v1/files/register-unregistered')
        .send({ files: [] })
        .expect(400);

      expect(response.body).toEqual({ error: 'No files provided.' });
      
      // Restore console.log
      console.log = originalConsoleLog;
    });

    it('should handle errors in register-unregistered endpoint', async () => {
      mockDatabaseService.batchRegisterUnregisteredFiles.mockRejectedValue(new Error('Registration error'));
      
      // Mock console.log and console.error to prevent output during tests
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      console.log = jest.fn();
      console.error = jest.fn();
      
      const response = await request(app)
        .post('/api/v1/files/register-unregistered')
        .send({ files: [{ modelId: 1, modelVersionId: 123, fileName: 'file1.safetensors' }] })
        .expect(500);

      expect(response.body).toEqual({ error: 'Registration error' });
      
      // Restore console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    });
  });

  describe('GET /filename/:modelVersionId', () => {
    it('should get filename by modelVersionId successfully', async () => {
      const response = await request(app)
        .get('/api/v1/files/filename/123')
        .expect(200);

      expect(response.body).toEqual({
        fileName: 'test.safetensors',
        modelVersionId: 123
      });
      expect(mockDatabaseService.getFileNameByModelVersionId).toHaveBeenCalledWith('123');
    });

    it('should handle model not found error', async () => {
      mockDatabaseService.getFileNameByModelVersionId.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/v1/files/filename/999')
        .expect(404);

      expect(response.body).toEqual({ error: 'Model not found' });
    });

    it('should handle errors in filename endpoint', async () => {
      mockDatabaseService.getFileNameByModelVersionId.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/v1/files/filename/123')
        .expect(500);

      expect(response.body).toEqual({ error: 'Database error' });
    });
  });

  describe('POST /rename-duplicate', () => {
    it('should rename file as duplicate successfully', async () => {
      const response = await request(app)
        .post('/api/v1/files/rename-duplicate')
        .send({ filePath: '/old/path/file.safetensors' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        oldPath: '/old/path',
        newPath: '/old/path.duplicate'
      });
      expect(mockFileService.renameFileAsDuplicate).toHaveBeenCalledWith('/old/path/file.safetensors');
    });

    it('should handle file not found error', async () => {
      mockFileService.renameFileAsDuplicate.mockRejectedValue(new Error('File not found'));
      
      const response = await request(app)
        .post('/api/v1/files/rename-duplicate')
        .send({ filePath: '/nonexistent/file.safetensors' })
        .expect(404);

      expect(response.body).toEqual({ error: 'File not found' });
    });

    it('should handle file already exists error', async () => {
      mockFileService.renameFileAsDuplicate.mockRejectedValue(new Error('File already exists'));
      
      const response = await request(app)
        .post('/api/v1/files/rename-duplicate')
        .send({ filePath: '/old/path/file.safetensors' })
        .expect(409);

      expect(response.body).toEqual({ error: 'File already exists' });
    });

    it('should handle other errors in rename-duplicate endpoint', async () => {
      mockFileService.renameFileAsDuplicate.mockRejectedValue(new Error('Rename error'));
      
      const response = await request(app)
        .post('/api/v1/files/rename-duplicate')
        .send({ filePath: '/old/path/file.safetensors' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Rename error' });
    });
  });

  describe('POST /register-lora', () => {
    it('should register lora in database successfully', async () => {
      const loraData = {
        modelId: 1,
        modelVersionId: 123,
        fileName: 'test.safetensors',
        fullPath: '/path/to/test.safetensors'
      };
      
      const response = await request(app)
        .post('/api/v1/files/register-lora')
        .send(loraData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        modelVersionId: 123
      });
      expect(mockDatabaseService.registerLoraInDatabase).toHaveBeenCalledWith(1, 123, 'test.safetensors', '/path/to/test.safetensors');
    });

    it('should handle missing required fields error', async () => {
      const response = await request(app)
        .post('/api/v1/files/register-lora')
        .send({ modelId: 1, modelVersionId: 123 })
        .expect(400);

      expect(response.body).toEqual({ error: 'Missing required fields: modelId, modelVersionId, fileName, fullPath' });
    });

    it('should handle errors in register-lora endpoint', async () => {
      mockDatabaseService.registerLoraInDatabase.mockRejectedValue(new Error('Registration error'));
      
      const response = await request(app)
        .post('/api/v1/files/register-lora')
        .send({
          modelId: 1,
          modelVersionId: 123,
          fileName: 'test.safetensors',
          fullPath: '/path/to/test.safetensors'
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Registration error' });
    });
  });

  describe('POST /verify-db', () => {
    it('should verify database successfully', async () => {
      mockDatabaseService.verifyAllCivitDataSchemaAndIndexes.mockResolvedValue({
        fileExists: true,
        tableExists: true,
        columnResults: [
          { column: 'modelId', exists: true },
          { column: 'modelName', exists: true },
          { column: 'modelDescription', exists: true },
          { column: 'modelType', exists: true },
          { column: 'modelNsfw', exists: true },
          { column: 'modelNsfwLevel', exists: true },
          { column: 'modelDownloadCount', exists: true },
          { column: 'modelVersionId', exists: true },
          { column: 'modelVersionName', exists: true },
          { column: 'modelVersionDescription', exists: true },
          { column: 'basemodel', exists: true },
          { column: 'basemodeltype', exists: true },
          { column: 'modelVersionNsfwLevel', exists: true },
          { column: 'modelVersionDownloadCount', exists: true },
          { column: 'fileName', exists: true },
          { column: 'fileType', exists: true },
          { column: 'fileDownloadUrl', exists: true },
          { column: 'size_in_kb', exists: true },
          { column: 'publishedAt', exists: true },
          { column: 'tags', exists: true },
          { column: 'isDownloaded', exists: true },
          { column: 'file_path', exists: true },
          { column: 'last_updated', exists: true },
          { column: 'trigger_words', exists: true },
          { column: 'modelversion_jsonpath', exists: true }
        ],
        indexResults: [
          { columns: ['modelVersionId'], exists: true, indexName: 'idx_modelVersionId' },
          { columns: ['basemodel'], exists: true, indexName: 'idx_basemodel' },
          { columns: ['isDownloaded'], exists: true, indexName: 'idx_isDownloaded' },
          { columns: ['fileName'], exists: true, indexName: 'idx_fileName' },
          { columns: ['modelNsfw'], exists: true, indexName: 'idx_modelNsfw' },
          { columns: ['modelVersionNsfwLevel'], exists: true, indexName: 'idx_modelversionnsfwlevel' }
        ],
        errors: []
      });

      const response = await request(app)
        .post('/api/v1/files/verify-db')
        .send({ dbPath: '/path/to/database.db' })
        .expect(200);

      expect(response.body).toEqual({
        fileExists: true,
        tableExists: true,
        columnResults: expect.arrayContaining([
          expect.objectContaining({ column: 'modelId', exists: true }),
          expect.objectContaining({ column: 'modelName', exists: true }),
          expect.objectContaining({ column: 'modelVersionId', exists: true }),
          expect.objectContaining({ column: 'fileName', exists: true }),
          expect.objectContaining({ column: 'isDownloaded', exists: true }),
          expect.objectContaining({ column: 'file_path', exists: true }),
          expect.objectContaining({ column: 'last_updated', exists: true }),
          expect.objectContaining({ column: 'trigger_words', exists: true }),
          expect.objectContaining({ column: 'modelversion_jsonpath', exists: true })
        ]),
        indexResults: expect.arrayContaining([
          expect.objectContaining({ columns: ['modelVersionId'], exists: true }),
          expect.objectContaining({ columns: ['basemodel'], exists: true }),
          expect.objectContaining({ columns: ['isDownloaded'], exists: true }),
          expect.objectContaining({ columns: ['fileName'], exists: true }),
          expect.objectContaining({ columns: ['modelNsfw'], exists: true }),
          expect.objectContaining({ columns: ['modelVersionNsfwLevel'], exists: true })
        ]),
        errors: []
      });
      expect(mockDatabaseService.verifyAllCivitDataSchemaAndIndexes).toHaveBeenCalledWith('/path/to/database.db');
    });

    it('should handle missing dbPath error', async () => {
      const response = await request(app)
        .post('/api/v1/files/verify-db')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'dbPath is required' });
    });

    it('should handle missing columns in verify-db endpoint', async () => {
      mockDatabaseService.verifyAllCivitDataSchemaAndIndexes.mockResolvedValue({
        fileExists: true,
        tableExists: true,
        columnResults: [
          { column: 'modelId', exists: true },
          { column: 'modelName', exists: true },
          { column: 'modelDescription', exists: false },
          { column: 'modelType', exists: true },
          { column: 'modelNsfw', exists: true },
          { column: 'modelNsfwLevel', exists: true },
          { column: 'modelDownloadCount', exists: true },
          { column: 'modelVersionId', exists: true },
          { column: 'modelVersionName', exists: true },
          { column: 'modelVersionDescription', exists: true },
          { column: 'basemodel', exists: true },
          { column: 'basemodeltype', exists: true },
          { column: 'modelVersionNsfwLevel', exists: true },
          { column: 'modelVersionDownloadCount', exists: true },
          { column: 'fileName', exists: true },
          { column: 'fileType', exists: true },
          { column: 'fileDownloadUrl', exists: true },
          { column: 'size_in_kb', exists: true },
          { column: 'publishedAt', exists: true },
          { column: 'tags', exists: true },
          { column: 'isDownloaded', exists: true },
          { column: 'file_path', exists: true },
          { column: 'last_updated', exists: false },
          { column: 'trigger_words', exists: false },
          { column: 'modelversion_jsonpath', exists: true }
        ],
        indexResults: [
          { columns: ['modelVersionId'], exists: true, indexName: 'idx_modelVersionId' },
          { columns: ['basemodel'], exists: true, indexName: 'idx_basemodel' },
          { columns: ['isDownloaded'], exists: true, indexName: 'idx_isDownloaded' },
          { columns: ['fileName'], exists: true, indexName: 'idx_fileName' },
          { columns: ['modelNsfw'], exists: true, indexName: 'idx_modelNsfw' },
          { columns: ['modelVersionNsfwLevel'], exists: true, indexName: 'idx_modelversionnsfwlevel' }
        ],
        errors: [
          'Missing column: modelDescription',
          'Missing column: last_updated',
          'Missing column: trigger_words'
        ]
      });

      const response = await request(app)
        .post('/api/v1/files/verify-db')
        .send({ dbPath: '/path/to/database.db' })
        .expect(200);

      expect(response.body).toEqual({
        fileExists: true,
        tableExists: true,
        columnResults: expect.arrayContaining([
          expect.objectContaining({ column: 'modelDescription', exists: false }),
          expect.objectContaining({ column: 'last_updated', exists: false }),
          expect.objectContaining({ column: 'trigger_words', exists: false })
        ]),
        indexResults: expect.arrayContaining([
          expect.objectContaining({ columns: ['modelVersionId'], exists: true }),
          expect.objectContaining({ columns: ['basemodel'], exists: true }),
          expect.objectContaining({ columns: ['isDownloaded'], exists: true }),
          expect.objectContaining({ columns: ['fileName'], exists: true }),
          expect.objectContaining({ columns: ['modelNsfw'], exists: true }),
          expect.objectContaining({ columns: ['modelVersionNsfwLevel'], exists: true })
        ]),
        errors: [
          'Missing column: modelDescription',
          'Missing column: last_updated',
          'Missing column: trigger_words'
        ]
      });
    });

    it('should handle errors in verify-db endpoint', async () => {
      mockDatabaseService.verifyAllCivitDataSchemaAndIndexes.mockRejectedValue(new Error('Verification error'));
      
      const response = await request(app)
        .post('/api/v1/files/verify-db')
        .send({ dbPath: '/path/to/database.db' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Verification error' });
    });
  });

  describe('GET /latest-published-at', () => {
    it('should get latest publishedAt successfully', async () => {
      const response = await request(app)
        .get('/api/v1/files/latest-published-at')
        .expect(200);

      expect(response.body).toEqual({ latest: '2023-01-01' });
      expect(mockDatabaseService.getLatestPublishedAt).toHaveBeenCalled();
    });

    it('should handle errors in latest-published-at endpoint', async () => {
      mockDatabaseService.getLatestPublishedAt.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/v1/files/latest-published-at')
        .expect(500);

      expect(response.body).toEqual({ error: 'Database error' });
    });
  });

  describe('GET /safetensor-counts', () => {
    it('should get safetensor counts successfully', async () => {
      const response = await request(app)
        .get('/api/v1/files/safetensor-counts')
        .expect(200);

      expect(response.body).toEqual({
        total: 100,
        paths: []
      });
      expect(mockFileService.getSafetensorCounts).toHaveBeenCalledWith(['/path1', '/path2']);
    });

    it('should handle no saved paths error', async () => {
      mockPathService.readSavedPaths.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/api/v1/files/safetensor-counts')
        .expect(400);

      expect(response.body).toEqual({ error: 'No saved paths to scan.' });
    });

    it('should handle errors in safetensor-counts endpoint', async () => {
      mockFileService.getSafetensorCounts.mockRejectedValue(new Error('Count error'));
      
      const response = await request(app)
        .get('/api/v1/files/safetensor-counts')
        .expect(500);

      expect(response.body).toEqual({ error: 'Count error' });
    });
  });

  describe('POST /reset-db', () => {
    it('should reset database successfully', async () => {
      const response = await request(app)
        .post('/api/v1/files/reset-db')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Database reset successfully',
        changes: 10
      });
      expect(mockDatabaseService.resetAllCivitData).toHaveBeenCalled();
    });

    it('should handle errors in reset-db endpoint', async () => {
      mockDatabaseService.resetAllCivitData.mockRejectedValue(new Error('Reset error'));
      
      const response = await request(app)
        .post('/api/v1/files/reset-db')
        .expect(500);

      expect(response.body).toEqual({ success: false, error: 'Reset error' });
    });
  });

  describe.skip('POST /delete-and-fail', () => {
    it('should delete file and mark as failed successfully', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.unlinkSync = jest.fn();
      
      // Use a shorter timeout to avoid hanging
      const response = await request(app)
        .post('/api/v1/files/delete-and-fail')
        .send({ 
          modelVersionId: 123, 
          file_path: '/path/to/file.safetensors' 
        })
        .timeout(5000)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'File deleted and DB updated'
      });
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.safetensors');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/file.safetensors');
      expect(mockDatabaseService.runUpdateMarkAsFailed).toHaveBeenCalledWith(123);
    });

    it('should handle missing required fields error', async () => {
      const response = await request(app)
        .post('/api/v1/files/delete-and-fail')
        .send({ modelVersionId: 123 })
        .expect(400);

      expect(response.body).toEqual({ error: 'modelVersionId and file_path are required' });
    });

    it('should handle file not found on disk error', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(false);
      
      const response = await request(app)
        .post('/api/v1/files/delete-and-fail')
        .send({ 
          modelVersionId: 123, 
          file_path: '/nonexistent/file.safetensors' 
        })
        .expect(404);

      expect(response.body).toEqual({ error: 'File not found on disk' });
    });

    it('should handle errors in delete-and-fail endpoint', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.unlinkSync = jest.fn().mockImplementation(() => {
        throw new Error('Delete error');
      });
      
      const response = await request(app)
        .post('/api/v1/files/delete-and-fail')
        .send({ 
          modelVersionId: 123, 
          file_path: '/path/to/file.safetensors' 
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Delete error' });
    });
  });

  describe('POST /unregister', () => {
    it('should unregister file successfully', async () => {
      mockDatabaseService.updateModelAsInProgress.mockResolvedValue({ changes: 1 });
      
      const response = await request(app)
        .post('/api/v1/files/unregister')
        .send({ modelVersionId: 123 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'File unregistered from database'
      });
      expect(mockDatabaseService.updateModelAsInProgress).toHaveBeenCalledWith(123);
    });

    it('should handle missing modelVersionId error', async () => {
      const response = await request(app)
        .post('/api/v1/files/unregister')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'modelVersionId is required' });
    });

    it('should handle errors in unregister endpoint', async () => {
      mockDatabaseService.updateModelAsInProgress.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post('/api/v1/files/unregister')
        .send({ modelVersionId: 123 })
        .expect(500);

      expect(response.body).toEqual({ error: 'Database error' });
    });
  });
}); 