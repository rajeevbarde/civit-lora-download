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

const express = require('express');
const request = require('supertest');

// Mock the database service
const mockDatabaseService = {
  getModels: jest.fn(),
  getModelDetail: jest.fn(),
  getBaseModels: jest.fn(),
  searchModelsByFilename: jest.fn(),
  getDownloadMatrix: jest.fn(),
  getMetadataStatistics: jest.fn(),
  getLatestUpdatedCheckpoints: jest.fn(),
  getAllCivitDataRowCount: jest.fn(),
  getRelatedLoraByModelId: jest.fn(),
  markModelAsIgnored: jest.fn()
};

jest.mock('../services/databaseService', () => mockDatabaseService);

// Mock the logger
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('../utils/logger', () => mockLogger);

// Mock validation middleware
const mockValidation = {
  validatePagination: jest.fn((req, res, next) => next()),
  validateModelVersionId: jest.fn((req, res, next) => next())
};

jest.mock('../middleware/validation', () => mockValidation);

// Create Express app and apply routes
const app = express();
app.use(express.json());

// Import and apply the routes
const modelsRouter = require('../routes/v1/models');
app.use('/api/v1/models', modelsRouter);

describe('Models Routes', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return models with default pagination', async () => {
      const mockResult = {
        total: 2,
        page: 1,
        limit: 20,
        data: [
          { modelId: 1, modelName: 'Model A' },
          { modelId: 2, modelName: 'Model B' }
        ]
      };

      mockDatabaseService.getModels.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models')
        .expect(200);

      expect(mockDatabaseService.getModels).toHaveBeenCalledWith(1, 20, {
        basemodel: undefined,
        isDownloaded: undefined,
        modelNsfw: undefined,
        versionNsfwLevelRange: undefined
      });
      expect(response.body).toEqual(mockResult);
    });

    it('should return models with custom pagination and filters', async () => {
      const mockResult = {
        total: 1,
        page: 2,
        limit: 10,
        data: [{ modelId: 3, modelName: 'Model C' }]
      };

      mockDatabaseService.getModels.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models?page=2&limit=10&basemodel=SD15&isDownloaded=1')
        .expect(200);

      expect(mockDatabaseService.getModels).toHaveBeenCalledWith(2, 10, {
        basemodel: 'SD15',
        isDownloaded: '1',
        modelNsfw: undefined,
        versionNsfwLevelRange: undefined
      });
      expect(response.body).toEqual(mockResult);
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Database connection failed';
      mockDatabaseService.getModels.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models')
        .expect(500);

      expect(response.body).toEqual({ error: errorMessage });
    });
  });

  describe('GET /detail/:id', () => {
    it('should return model detail for valid ID', async () => {
      const mockModel = {
        modelId: 1,
        modelVersionId: 10,
        modelName: 'Test Model',
        fileName: 'test.safetensors'
      };

      mockDatabaseService.getModelDetail.mockResolvedValue(mockModel);

      const response = await request(app)
        .get('/api/v1/models/detail/10')
        .expect(200);

      expect(mockDatabaseService.getModelDetail).toHaveBeenCalledWith('10');
      expect(response.body).toEqual(mockModel);
    });

    it('should return 404 when model not found', async () => {
      mockDatabaseService.getModelDetail.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/models/detail/999')
        .expect(404);

      expect(response.body).toEqual({ error: 'Model not found' });
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Database error';
      mockDatabaseService.getModelDetail.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models/detail/10')
        .expect(500);

      expect(response.body).toEqual({ error: errorMessage });
    });
  });

  describe('GET /base-models', () => {
    it('should return base models successfully', async () => {
      const mockResult = { baseModels: ['SD15', 'SD21', 'SDXL'] };
      mockDatabaseService.getBaseModels.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models/base-models')
        .expect(200);

      expect(mockDatabaseService.getBaseModels).toHaveBeenCalled();
      expect(response.body).toEqual(mockResult);
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Failed to get base models';
      mockDatabaseService.getBaseModels.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models/base-models')
        .expect(500);

      expect(mockLogger.error).toHaveBeenCalledWith('Error getting base models:', expect.any(Error));
      expect(response.body).toEqual({ error: 'Failed to get base models' });
    });
  });

  describe('GET /search-by-filename', () => {
    it('should return models matching filename', async () => {
      const mockResult = [
        { modelId: 1, fileName: 'test.safetensors' },
        { modelId: 2, fileName: 'test_v2.safetensors' }
      ];

      mockDatabaseService.searchModelsByFilename.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models/search-by-filename?filename=test')
        .expect(200);

      expect(mockDatabaseService.searchModelsByFilename).toHaveBeenCalledWith('test');
      expect(response.body).toEqual(mockResult);
    });

    it('should return 400 when filename is missing', async () => {
      const response = await request(app)
        .get('/api/v1/models/search-by-filename')
        .expect(400);

      expect(response.body).toEqual({ error: 'Filename parameter is required' });
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Search failed';
      mockDatabaseService.searchModelsByFilename.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models/search-by-filename?filename=test')
        .expect(500);

      expect(response.body).toEqual({ error: errorMessage });
    });
  });

  describe('GET /download-matrix', () => {
    it('should return download matrix data', async () => {
      const mockResult = {
        total: 100,
        downloaded: 75,
        pending: 25
      };

      mockDatabaseService.getDownloadMatrix.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models/download-matrix')
        .expect(200);

      expect(mockDatabaseService.getDownloadMatrix).toHaveBeenCalled();
      expect(response.body).toEqual(mockResult);
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Matrix error';
      mockDatabaseService.getDownloadMatrix.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models/download-matrix')
        .expect(500);

      expect(mockLogger.error).toHaveBeenCalledWith('Error getting download matrix:', expect.any(Error));
      expect(response.body).toEqual({ error: 'Failed to get download matrix data' });
    });
  });

  describe('GET /metadata-statistics', () => {
    it('should return metadata statistics', async () => {
      const mockResult = {
        totalRegistered: 1000
      };

      mockDatabaseService.getMetadataStatistics.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models/metadata-statistics')
        .expect(200);

      expect(mockDatabaseService.getMetadataStatistics).toHaveBeenCalled();
      expect(response.body).toEqual(mockResult);
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Statistics error';
      mockDatabaseService.getMetadataStatistics.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models/metadata-statistics')
        .expect(500);

      expect(mockLogger.error).toHaveBeenCalledWith('Error getting metadata statistics:', expect.any(Error));
      expect(response.body).toEqual({ error: 'Failed to get metadata statistics' });
    });
  });

  describe('GET /latest-updated-checkpoints', () => {
    it('should return latest updated checkpoints with default limit', async () => {
      const mockResult = [
        { modelId: 1, modelName: 'Checkpoint A', updatedAt: '2024-01-01' },
        { modelId: 2, modelName: 'Checkpoint B', updatedAt: '2024-01-02' }
      ];

      mockDatabaseService.getLatestUpdatedCheckpoints.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models/latest-updated-checkpoints')
        .expect(200);

      expect(mockDatabaseService.getLatestUpdatedCheckpoints).toHaveBeenCalledWith(10);
      expect(response.body).toEqual(mockResult);
    });

    it('should return latest updated checkpoints with custom limit', async () => {
      const mockResult = [{ modelId: 1, modelName: 'Checkpoint A' }];
      mockDatabaseService.getLatestUpdatedCheckpoints.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models/latest-updated-checkpoints?limit=5')
        .expect(200);

      expect(mockDatabaseService.getLatestUpdatedCheckpoints).toHaveBeenCalledWith(5);
      expect(response.body).toEqual(mockResult);
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Checkpoints error';
      mockDatabaseService.getLatestUpdatedCheckpoints.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models/latest-updated-checkpoints')
        .expect(500);

      expect(mockLogger.error).toHaveBeenCalledWith('Error getting latest updated checkpoints:', expect.any(Error));
      expect(response.body).toEqual({ error: 'Failed to get latest updated checkpoints' });
    });
  });

  describe('GET /row-count', () => {
    it('should return total row count', async () => {
      const mockTotal = 1500;
      mockDatabaseService.getAllCivitDataRowCount.mockResolvedValue(mockTotal);

      const response = await request(app)
        .get('/api/v1/models/row-count')
        .expect(200);

      expect(mockDatabaseService.getAllCivitDataRowCount).toHaveBeenCalled();
      expect(response.body).toEqual({ total: mockTotal });
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Row count error';
      mockDatabaseService.getAllCivitDataRowCount.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models/row-count')
        .expect(500);

      expect(response.body).toEqual({ error: errorMessage });
    });
  });

  describe('GET /related-lora/:modelId', () => {
    it('should return related LoRA for valid modelId', async () => {
      const mockResult = [
        { loraId: 1, loraName: 'Related LoRA 1' },
        { loraId: 2, loraName: 'Related LoRA 2' }
      ];

      mockDatabaseService.getRelatedLoraByModelId.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/models/related-lora/123')
        .expect(200);

      expect(mockDatabaseService.getRelatedLoraByModelId).toHaveBeenCalledWith('123');
      expect(response.body).toEqual(mockResult);
    });

    it('should return 400 when modelId is missing', async () => {
      const response = await request(app)
        .get('/api/v1/models/related-lora/')
        .expect(404); // Express will return 404 for empty path parameter

      expect(mockDatabaseService.getRelatedLoraByModelId).not.toHaveBeenCalled();
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Related LoRA error';
      mockDatabaseService.getRelatedLoraByModelId.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/v1/models/related-lora/123')
        .expect(500);

      expect(response.body).toEqual({ error: errorMessage });
    });
  });

  describe('POST /ignore', () => {
    it('should mark model as ignored successfully', async () => {
      mockDatabaseService.markModelAsIgnored.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/models/ignore')
        .send({ modelVersionId: 123 })
        .expect(200);

      expect(mockDatabaseService.markModelAsIgnored).toHaveBeenCalledWith(123);
      expect(response.body).toEqual({ success: true });
    });

    it('should return 400 when modelVersionId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/models/ignore')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'modelVersionId is required' });
    });

    it('should handle database service errors', async () => {
      const errorMessage = 'Ignore error';
      mockDatabaseService.markModelAsIgnored.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post('/api/v1/models/ignore')
        .send({ modelVersionId: 123 })
        .expect(500);

      expect(response.body).toEqual({ error: errorMessage });
    });
  });
}); 