// Mock fs module to prevent logger issues
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(''),
  statSync: jest.fn().mockReturnValue({ size: 0 }),
  readdirSync: jest.fn().mockReturnValue([])
}));

// Mock sqlite3 module to prevent native binding issues
jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: jest.fn().mockImplementation(() => ({
      all: jest.fn(),
      close: jest.fn()
    }))
  })
}));

const databaseService = require('../services/databaseService');
const dbPool = require('../config/database').dbPool;

jest.mock('../config/database', () => {
  const mDbPool = {
    getConnection: jest.fn(),
    runQuerySingle: jest.fn(),
    runQuery: jest.fn(),
    releaseConnection: jest.fn(),
  };
  return { dbPool: mDbPool };
});

describe('DatabaseService', () => {
  describe('getModels', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuerySingle.mockClear();
      dbPool.runQuery.mockClear();
    });

    it('should return paginated models with total count', async () => {
      dbPool.runQuerySingle.mockResolvedValue({ total: 2 });
      dbPool.runQuery.mockResolvedValue([
        { modelId: 1, modelName: 'Model A' },
        { modelId: 2, modelName: 'Model B' },
      ]);

      const page = 1;
      const limit = 2;
      const filters = { basemodel: 'SD15', isDownloaded: 1 };
      const result = await databaseService.getModels(page, limit, filters);

      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuerySingle).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT COUNT(*)'),
        expect.any(Array)
      );
      expect(dbPool.runQuery).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT'),
        expect.any(Array)
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({
        total: 2,
        page: 1,
        limit: 2,
        data: [
          { modelId: 1, modelName: 'Model A' },
          { modelId: 2, modelName: 'Model B' },
        ],
      });
    });
  });

  describe('getModelDetail', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuerySingle.mockClear();
    });
    it('should return model detail for a given modelVersionId', async () => {
      dbPool.runQuerySingle.mockResolvedValue({ modelId: 1, modelVersionId: 10 });
      const result = await databaseService.getModelDetail(10);
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuerySingle).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT'),
        [10]
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ modelId: 1, modelVersionId: 10 });
    });
  });

  describe('getBaseModels', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuery.mockClear();
    });
    it('should return baseModels array', async () => {
      dbPool.runQuery.mockResolvedValue([
        { basemodel: 'SD15', count: 5 },
        { basemodel: 'SD21', count: 3 },
      ]);
      const result = await databaseService.getBaseModels();
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuery).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT basemodel'),
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ baseModels: ['SD15', 'SD21'] });
    });
  });

  describe('getAllFileNames', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuery.mockClear();
    });
    it('should return all file names in lowercase', async () => {
      dbPool.runQuery.mockResolvedValue([
        { fileName: 'TestA.safetensors' },
        { fileName: 'TestB.safetensors' },
        { fileName: null },
      ]);
      const result = await databaseService.getAllFileNames();
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuery).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT fileName'),
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual(['testa.safetensors', 'testb.safetensors', '']);
    });
  });

  describe('getFileRecordsByNames', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuery.mockClear();
    });
    it('should return empty array if fileNames is empty', async () => {
      const result = await databaseService.getFileRecordsByNames([]);
      expect(result).toEqual([]);
      expect(dbPool.getConnection).not.toHaveBeenCalled();
    });
    it('should return file records for given fileNames', async () => {
      dbPool.runQuery.mockResolvedValue([
        { fileName: 'a.safetensors', isDownloaded: 1 },
        { fileName: 'b.safetensors', isDownloaded: 0 },
      ]);
      const fileNames = ['a.safetensors', 'b.safetensors'];
      const result = await databaseService.getFileRecordsByNames(fileNames);
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuery).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT fileName'),
        fileNames
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual([
        { fileName: 'a.safetensors', isDownloaded: 1 },
        { fileName: 'b.safetensors', isDownloaded: 0 },
      ]);
    });
  });

  describe('getDownloadedFiles', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuery.mockClear();
    });
    it('should return downloaded files', async () => {
      dbPool.runQuery.mockResolvedValue([
        { fileName: 'a.safetensors', file_path: '/a', modelVersionId: 1, modelId: 1, size_in_kb: 100 },
      ]);
      const result = await databaseService.getDownloadedFiles();
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuery).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT fileName'),
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual([
        { fileName: 'a.safetensors', file_path: '/a', modelVersionId: 1, modelId: 1, size_in_kb: 100 },
      ]);
    });
  });

  describe('getFileNameByModelVersionId', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuerySingle.mockClear();
    });
    it('should return fileName for a given modelVersionId', async () => {
      dbPool.runQuerySingle.mockResolvedValue({ fileName: 'a.safetensors' });
      const result = await databaseService.getFileNameByModelVersionId(1);
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuerySingle).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT fileName'),
        [1]
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ fileName: 'a.safetensors' });
    });
  });

  describe('updateModelAsDownloaded', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runUpdate = jest.fn();
      dbPool.runUpdate.mockClear();
    });
    it('should update model as downloaded', async () => {
      dbPool.runUpdate.mockResolvedValue({ affectedRows: 1 });
      const result = await databaseService.updateModelAsDownloaded(5, '/path/to/file');
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runUpdate).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('UPDATE ALLCivitData SET isDownloaded = 1'),
        ['/path/to/file', 5]
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ affectedRows: 1 });
    });
  });

  describe('searchModelsByFilename', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuery = jest.fn();
      dbPool.runQuery.mockClear();
    });
    it('should search models by filename', async () => {
      dbPool.runQuery.mockResolvedValue([
        { modelId: 1, fileName: 'test.safetensors' },
      ]);
      const result = await databaseService.searchModelsByFilename('test.safetensors');
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuery).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT'),
        ['test.safetensors']
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual([
        { modelId: 1, fileName: 'test.safetensors' },
      ]);
    });
  });

  describe('markModelAsFailed', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runUpdate = jest.fn();
      dbPool.runUpdate.mockClear();
    });
    it('should mark model as failed', async () => {
      dbPool.runUpdate.mockResolvedValue({ affectedRows: 1 });
      const result = await databaseService.markModelAsFailed(42);
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runUpdate).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('UPDATE ALLCivitData SET isDownloaded = 3'),
        [42]
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ affectedRows: 1 });
    });
  });

  describe('getPoolStats', () => {
    it('should return pool stats', () => {
      dbPool.getStats = jest.fn().mockReturnValue({ total: 5 });
      const result = databaseService.getPoolStats();
      expect(dbPool.getStats).toHaveBeenCalled();
      expect(result).toEqual({ total: 5 });
    });
  });

  describe('batchRegisterUnregisteredFiles', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runUpdate = jest.fn();
      dbPool.runUpdate.mockClear();
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      console.log.mockRestore();
      console.error.mockRestore();
    });
    it('should batch update files and return updated count', async () => {
      dbPool.runUpdate.mockResolvedValue({ changes: 1 });
      const files = [
        { baseName: 'file1.safetensors', fullPath: '/a/file1.safetensors' },
        { baseName: 'file2.safetensors', fullPath: '/a/file2.safetensors' },
      ];
      const result = await databaseService.batchRegisterUnregisteredFiles(files);
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runUpdate).toHaveBeenCalledTimes(2);
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toHaveProperty('updated', 2);
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
    it('should handle errors and collect them in errors array', async () => {
      dbPool.runUpdate.mockImplementationOnce(() => { throw new Error('fail'); });
      dbPool.runUpdate.mockResolvedValue({ changes: 1 });
      const files = [
        { baseName: 'file1.safetensors', fullPath: '/a/file1.safetensors' },
        { baseName: 'file2.safetensors', fullPath: '/a/file2.safetensors' },
      ];
      const result = await databaseService.batchRegisterUnregisteredFiles(files);
      expect(result.updated).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toHaveProperty('fileName', 'file1.safetensors');
    });
  });

  describe('registerLoraInDatabase', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runUpdate = jest.fn();
      dbPool.runUpdate.mockClear();
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
      console.log.mockRestore();
    });
    it('should register lora and return success if row updated', async () => {
      dbPool.runUpdate.mockResolvedValue({ changes: 1 });
      const result = await databaseService.registerLoraInDatabase(1, 2, 'file.safetensors', '/a/file.safetensors');
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runUpdate).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('UPDATE ALLCivitData SET isDownloaded = 1'),
        ['/a/file.safetensors', 1, 2, 'file.safetensors']
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('changes', 1);
    });
    it('should throw error if no row updated', async () => {
      dbPool.runUpdate.mockResolvedValue({ changes: 0 });
      await expect(
        databaseService.registerLoraInDatabase(1, 2, 'file.safetensors', '/a/file.safetensors')
      ).rejects.toThrow('No matching record found in database');
    });
  });

  describe('getDownloadMatrix', () => {
    let connection;
    let logger;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuery = jest.fn();
      dbPool.runQuery.mockClear();
      logger = require('../utils/logger');
      jest.spyOn(logger, 'userAction').mockImplementation(() => {});
      jest.spyOn(logger, 'logTimeTaken').mockImplementation(() => {});
    });
    afterEach(() => {
      logger.userAction.mockRestore();
      logger.logTimeTaken.mockRestore();
    });
    it('should return download matrix with grouped NSFW levels', async () => {
      dbPool.runQuery.mockResolvedValue([
        { basemodel: 'SD15', modelVersionNsfwLevel: 0, count: 2 },
        { basemodel: 'SD15', modelVersionNsfwLevel: 16, count: 1 },
        { basemodel: 'SD21', modelVersionNsfwLevel: 32, count: 3 },
      ]);
      const result = await databaseService.getDownloadMatrix();
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runQuery).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('SELECT'),
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toHaveProperty('matrix');
      expect(result).toHaveProperty('baseModels');
      expect(result).toHaveProperty('nsfwGroups');
      expect(result.matrix['SD15']['Safe']).toBe(2);
      expect(result.matrix['SD15']['Moderate']).toBe(1);
      expect(result.matrix['SD21']['NSFW']).toBe(3);
    });
  });

  // TODO: Fix verifyAllCivitDataSchemaAndIndexes tests - they require complex sqlite3 mocking
  describe.skip('verifyAllCivitDataSchemaAndIndexes', () => {
    it('should return error if file does not exist', async () => {
      // Test implementation needed - requires complex sqlite3 mocking
      // TODO: Implement proper mocking for sqlite3 native bindings
    });
    
    it('should return error if table does not exist', async () => {
      // Test implementation needed - requires complex sqlite3 mocking
      // TODO: Implement proper mocking for sqlite3 native bindings
    });
    
    it('should handle exception and return error', async () => {
      // Test implementation needed - requires complex sqlite3 mocking
      // TODO: Implement proper mocking for sqlite3 native bindings
    });
  });

  describe('getLatestPublishedAt', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuerySingle = jest.fn();
      dbPool.runQuerySingle.mockClear();
    });
    it('should return publishedAt if row exists', async () => {
      dbPool.runQuerySingle.mockResolvedValue({ publishedAt: '2024-01-01' });
      const result = await databaseService.getLatestPublishedAt();
      expect(result).toBe('2024-01-01');
    });
    it('should return null if no row', async () => {
      dbPool.runQuerySingle.mockResolvedValue(null);
      const result = await databaseService.getLatestPublishedAt();
      expect(result).toBeNull();
    });
    it('should return null on error', async () => {
      dbPool.runQuerySingle.mockImplementation(() => { throw new Error('fail'); });
      const result = await databaseService.getLatestPublishedAt();
      expect(result).toBeNull();
    });
  });

  describe('getLatestUpdatedCheckpoints', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuery = jest.fn();
      dbPool.runQuery.mockClear();
    });
    it('should return latest updated checkpoints', async () => {
      dbPool.runQuery.mockResolvedValue([{ modelId: 1 }]);
      const result = await databaseService.getLatestUpdatedCheckpoints(5);
      expect(result).toEqual([{ modelId: 1 }]);
    });
  });

  describe('resetAllCivitData', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runUpdate = jest.fn();
      dbPool.runUpdate.mockClear();
    });
    it('should reset all civit data', async () => {
      dbPool.runUpdate.mockResolvedValue({ changes: 10 });
      const result = await databaseService.resetAllCivitData();
      expect(result).toEqual({ success: true, changes: 10 });
    });
  });

  describe('getAllCivitDataRowCount', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuerySingle = jest.fn();
      dbPool.runQuerySingle.mockClear();
    });
    it('should return total row count', async () => {
      dbPool.runQuerySingle.mockResolvedValue({ total: 42 });
      const result = await databaseService.getAllCivitDataRowCount();
      expect(result).toBe(42);
    });
  });

  describe('runUpdateMarkAsFailed', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runUpdate = jest.fn();
      dbPool.runUpdate.mockClear();
    });
    it('should mark as failed and clear file_path', async () => {
      dbPool.runUpdate.mockResolvedValue({ affectedRows: 1 });
      const result = await databaseService.runUpdateMarkAsFailed(7);
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runUpdate).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('UPDATE ALLCivitData SET isDownloaded = 3, file_path = NULL'),
        [7]
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ affectedRows: 1 });
    });
  });

  describe('updateModelAsInProgress', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runUpdate = jest.fn();
      dbPool.runUpdate.mockClear();
    });
    it('should update model as in progress', async () => {
      dbPool.runUpdate.mockResolvedValue({ affectedRows: 1 });
      const result = await databaseService.updateModelAsInProgress(8);
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runUpdate).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('UPDATE ALLCivitData SET isDownloaded = 0'),
        [8]
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ affectedRows: 1 });
    });
  });

  describe('getRelatedLoraByModelId', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runQuery = jest.fn();
      dbPool.runQuery.mockClear();
    });
    it('should return related lora by modelId', async () => {
      dbPool.runQuery.mockResolvedValue([{ modelId: 1, modelVersionId: 2 }]);
      const result = await databaseService.getRelatedLoraByModelId(1);
      expect(result).toEqual([{ modelId: 1, modelVersionId: 2 }]);
    });
  });

  describe('markModelAsIgnored', () => {
    let connection;
    beforeEach(() => {
      connection = {};
      dbPool.getConnection.mockResolvedValue(connection);
      dbPool.getConnection.mockClear();
      dbPool.releaseConnection.mockClear();
      dbPool.runUpdate = jest.fn();
      dbPool.runUpdate.mockClear();
    });
    it('should mark model as ignored', async () => {
      dbPool.runUpdate.mockResolvedValue({ affectedRows: 1 });
      const result = await databaseService.markModelAsIgnored(9);
      expect(dbPool.getConnection).toHaveBeenCalled();
      expect(dbPool.runUpdate).toHaveBeenCalledWith(
        connection,
        expect.stringContaining('UPDATE ALLCivitData SET isDownloaded = 4'),
        [9]
      );
      expect(dbPool.releaseConnection).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ affectedRows: 1 });
    });
  });
}); 