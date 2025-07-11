// Mock fs module to prevent file system issues during testing
const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn()
};

jest.mock('fs', () => mockFs);

// Mock constants
jest.mock('../config/constants', () => ({
  PATHS: {
    savedPathFile: '/test/saved_path.json'
  }
}));

// Mock console.log to suppress output during tests
const originalConsoleLog = console.log;
console.log = jest.fn();

const pathService = require('../services/pathService');

describe('PathService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset console.log mock
    console.log.mockClear();
  });

  afterAll(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });

  describe('readSavedPaths', () => {
    it('should read and parse valid JSON file with paths array', async () => {
      const mockData = JSON.stringify({ paths: ['/path1', '/path2'] });
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, mockData);
      });

      const result = await pathService.readSavedPaths();

      expect(result).toEqual(['/path1', '/path2']);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/test/saved_path.json',
        'utf8',
        expect.any(Function)
      );
    });

    it('should return empty array when file does not exist', async () => {
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(new Error('File not found'), null);
      });

      const result = await pathService.readSavedPaths();

      expect(result).toEqual([]);
    });

    it('should return empty array when JSON is invalid', async () => {
      const invalidJson = 'invalid json content';
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, invalidJson);
      });

      const result = await pathService.readSavedPaths();

      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('Error parsing saved_path.json:', expect.any(String));
    });

    it('should return empty array when JSON does not contain paths array', async () => {
      const invalidJson = JSON.stringify({ otherField: 'value' });
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, invalidJson);
      });

      const result = await pathService.readSavedPaths();

      expect(result).toEqual([]);
    });

    it('should return empty array when paths is not an array', async () => {
      const invalidJson = JSON.stringify({ paths: 'not an array' });
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, invalidJson);
      });

      const result = await pathService.readSavedPaths();

      expect(result).toEqual([]);
    });
  });

  describe('writeSavedPaths', () => {
    it('should write paths to JSON file successfully', async () => {
      const paths = ['/path1', '/path2'];
      mockFs.writeFile.mockImplementation((path, data, callback) => {
        callback(null);
      });

      await pathService.writeSavedPaths(paths);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/saved_path.json',
        JSON.stringify({ paths }, null, 2),
        expect.any(Function)
      );
    });

    it('should reject when write operation fails', async () => {
      const paths = ['/path1'];
      const writeError = new Error('Write failed');
      mockFs.writeFile.mockImplementation((path, data, callback) => {
        callback(writeError);
      });

      await expect(pathService.writeSavedPaths(paths)).rejects.toThrow('Write failed');
    });
  });

  describe('addPath', () => {
    it('should add new path successfully', async () => {
      const existingPaths = ['/existing/path'];
      const newPath = '/new/path';
      
      // Mock readSavedPaths to return existing paths
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, JSON.stringify({ paths: existingPaths }));
      });
      
      // Mock writeSavedPaths to succeed
      mockFs.writeFile.mockImplementation((path, data, callback) => {
        callback(null);
      });

      const result = await pathService.addPath(newPath);

      expect(result).toEqual({ message: 'Path saved successfully' });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/saved_path.json',
        JSON.stringify({ paths: ['/existing/path', '/new/path'] }, null, 2),
        expect.any(Function)
      );
    });

    it('should not add duplicate path', async () => {
      const existingPaths = ['/existing/path'];
      const duplicatePath = '/existing/path';
      
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, JSON.stringify({ paths: existingPaths }));
      });
      
      mockFs.writeFile.mockImplementation((path, data, callback) => {
        callback(null);
      });

      const result = await pathService.addPath(duplicatePath);

      expect(result).toEqual({ message: 'Path saved successfully' });
      // Should not call writeFile since path already exists
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should throw error when no path provided', async () => {
      await expect(pathService.addPath('')).rejects.toThrow('No path provided');
      await expect(pathService.addPath(null)).rejects.toThrow('No path provided');
      await expect(pathService.addPath(undefined)).rejects.toThrow('No path provided');
    });

    it('should handle read error gracefully', async () => {
      const newPath = '/new/path';
      
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(new Error('Read failed'), null);
      });

      const result = await pathService.addPath(newPath);

      expect(result).toEqual({ message: 'Path saved successfully' });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/saved_path.json',
        JSON.stringify({ paths: ['/new/path'] }, null, 2),
        expect.any(Function)
      );
    });
  });

  describe('deletePath', () => {
    it('should delete existing path successfully', async () => {
      const existingPaths = ['/path1', '/path2', '/path3'];
      const pathToDelete = '/path2';
      
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, JSON.stringify({ paths: existingPaths }));
      });
      
      mockFs.writeFile.mockImplementation((path, data, callback) => {
        callback(null);
      });

      const result = await pathService.deletePath(pathToDelete);

      expect(result).toEqual({ message: 'Path deleted successfully' });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/saved_path.json',
        JSON.stringify({ paths: ['/path1', '/path3'] }, null, 2),
        expect.any(Function)
      );
    });

    it('should handle deleting non-existent path', async () => {
      const existingPaths = ['/path1', '/path2'];
      const nonExistentPath = '/non/existent/path';
      
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, JSON.stringify({ paths: existingPaths }));
      });
      
      mockFs.writeFile.mockImplementation((path, data, callback) => {
        callback(null);
      });

      const result = await pathService.deletePath(nonExistentPath);

      expect(result).toEqual({ message: 'Path deleted successfully' });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/saved_path.json',
        JSON.stringify({ paths: ['/path1', '/path2'] }, null, 2),
        expect.any(Function)
      );
    });

    it('should throw error when no path provided for deletion', async () => {
      await expect(pathService.deletePath('')).rejects.toThrow('No path provided');
      await expect(pathService.deletePath(null)).rejects.toThrow('No path provided');
      await expect(pathService.deletePath(undefined)).rejects.toThrow('No path provided');
    });

    it('should handle read error gracefully during deletion', async () => {
      const pathToDelete = '/path/to/delete';
      
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(new Error('Read failed'), null);
      });

      const result = await pathService.deletePath(pathToDelete);

      expect(result).toEqual({ message: 'Path deleted successfully' });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/saved_path.json',
        JSON.stringify({ paths: [] }, null, 2),
        expect.any(Function)
      );
    });
  });

  describe('getSavedPaths', () => {
    it('should return all saved paths', async () => {
      const savedPaths = ['/path1', '/path2', '/path3'];
      
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, JSON.stringify({ paths: savedPaths }));
      });

      const result = await pathService.getSavedPaths();

      expect(result).toEqual({ paths: savedPaths });
    });

    it('should return empty paths when file does not exist', async () => {
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(new Error('File not found'), null);
      });

      const result = await pathService.getSavedPaths();

      expect(result).toEqual({ paths: [] });
    });

    it('should return empty paths when JSON is invalid', async () => {
      const invalidJson = 'invalid json content';
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, invalidJson);
      });

      const result = await pathService.getSavedPaths();

      expect(result).toEqual({ paths: [] });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full CRUD operations sequence', async () => {
      // Initial state - empty paths
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(new Error('File not found'), null);
      });
      mockFs.writeFile.mockImplementation((path, data, callback) => {
        callback(null);
      });

      // Add first path
      let result = await pathService.addPath('/first/path');
      expect(result).toEqual({ message: 'Path saved successfully' });

      // Add second path
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, JSON.stringify({ paths: ['/first/path'] }));
      });
      
      result = await pathService.addPath('/second/path');
      expect(result).toEqual({ message: 'Path saved successfully' });

      // Get all paths
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, JSON.stringify({ paths: ['/first/path', '/second/path'] }));
      });
      
      result = await pathService.getSavedPaths();
      expect(result).toEqual({ paths: ['/first/path', '/second/path'] });

      // Delete first path
      result = await pathService.deletePath('/first/path');
      expect(result).toEqual({ message: 'Path deleted successfully' });
    });

    it('should handle multiple add operations without duplicates', async () => {
      const paths = ['/path1', '/path2', '/path3'];
      
      mockFs.readFile.mockImplementation((path, encoding, callback) => {
        callback(null, JSON.stringify({ paths: [] }));
      });
      mockFs.writeFile.mockImplementation((path, data, callback) => {
        callback(null);
      });

      // Add all paths
      for (const path of paths) {
        const result = await pathService.addPath(path);
        expect(result).toEqual({ message: 'Path saved successfully' });
      }

      // Try to add duplicates
      for (const path of paths) {
        mockFs.readFile.mockImplementation((path, encoding, callback) => {
          callback(null, JSON.stringify({ paths }));
        });
        
        const result = await pathService.addPath(path);
        expect(result).toEqual({ message: 'Path saved successfully' });
      }
    });
  });
}); 