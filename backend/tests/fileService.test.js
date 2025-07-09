// Mock fs module to prevent file system issues during testing
const mockFs = {
  existsSync: jest.fn(),
  statSync: jest.fn(),
  accessSync: jest.fn(),
  readFileSync: jest.fn(),
  renameSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn()
  }
};

jest.mock('fs', () => mockFs);

// Mock crypto module
const mockCrypto = {
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mock-hash-value')
    })
  })
};

jest.mock('crypto', () => mockCrypto);

// Mock path module
const mockPath = {
  extname: jest.fn(),
  basename: jest.fn(),
  dirname: jest.fn(),
  join: jest.fn()
};

jest.mock('path', () => mockPath);

// Mock constants
jest.mock('../config/constants', () => ({
  ALLOWED_EXTENSIONS: ['safetensors', 'ckpt'],
  PATHS: {
    savedPathFile: '/test/saved_path.json'
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  userAction: jest.fn(),
  logTimeTaken: jest.fn()
};

jest.mock('../utils/logger', () => mockLogger);

// Mock databaseService
const mockDatabaseService = {
  getFileRecordsByNames: jest.fn()
};

jest.mock('../services/databaseService', () => mockDatabaseService);

const fileService = require('../services/fileService');

describe('FileService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ 
      isDirectory: () => true, 
      size: 1024,
      isFile: () => true 
    });
    mockFs.accessSync.mockImplementation(() => {});
    mockFs.readFileSync.mockReturnValue(Buffer.from('test content'));
    mockFs.renameSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => {});
    
    mockFs.promises.access.mockResolvedValue();
    mockFs.promises.stat.mockResolvedValue({ 
      isDirectory: () => true, 
      size: 1024,
      isFile: () => true 
    });
    mockFs.promises.readdir.mockResolvedValue(['file1.safetensors', 'file2.safetensors']);
    
    mockPath.extname.mockReturnValue('.safetensors');
    mockPath.basename.mockImplementation((path, ext) => {
      if (ext) return path.replace(ext, '');
      return path.split('/').pop() || path.split('\\').pop() || path;
    });
    mockPath.dirname.mockReturnValue('/test/dir');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    
    mockCrypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnValue({
        digest: jest.fn().mockReturnValue('mock-hash-value')
      })
    });
  });

  describe('hasAllowedExt', () => {
    it('should return true for allowed extensions', () => {
      mockPath.extname.mockReturnValue('.safetensors');
      
      const result = fileService.hasAllowedExt('test.safetensors');
      
      expect(result).toBe(true);
      expect(mockPath.extname).toHaveBeenCalledWith('test.safetensors');
    });

    it('should return true for allowed extensions with different case', () => {
      mockPath.extname.mockReturnValue('.SAFETENSORS');
      
      const result = fileService.hasAllowedExt('test.SAFETENSORS');
      
      expect(result).toBe(true);
    });

    it('should return false for disallowed extensions', () => {
      mockPath.extname.mockReturnValue('.txt');
      
      const result = fileService.hasAllowedExt('test.txt');
      
      expect(result).toBe(false);
    });

    it('should handle files without extensions', () => {
      mockPath.extname.mockReturnValue('');
      
      const result = fileService.hasAllowedExt('testfile');
      
      expect(result).toBe(false);
    });
  });

  describe('getAllFiles', () => {
    it('should return files with allowed extensions', async () => {
      const dirPath = '/test/dir';
      const files = ['file1.safetensors', 'file2.safetensors', 'file3.txt'];
      
      mockFs.promises.readdir.mockResolvedValue(files);
      mockFs.promises.stat.mockImplementation((path) => {
        const isDir = path.includes('subdir');
        return Promise.resolve({
          isDirectory: () => isDir,
          isFile: () => !isDir
        });
      });
      
      mockPath.extname.mockImplementation((filename) => {
        if (filename.endsWith('.safetensors')) return '.safetensors';
        if (filename.endsWith('.txt')) return '.txt';
        return '';
      });
      
      const result = await fileService.getAllFiles(dirPath);
      
      expect(result).toEqual([
        '/test/dir/file1.safetensors',
        '/test/dir/file2.safetensors'
      ]);
    });

    it('should handle directory access errors', async () => {
      const dirPath = '/test/dir';
      
      mockFs.promises.access.mockRejectedValue(new Error('Permission denied'));
      
      const result = await fileService.getAllFiles(dirPath);
      
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('Error reading directory', {
        path: dirPath,
        error: 'Permission denied'
      });
    });

    it('should handle non-directory paths', async () => {
      const dirPath = '/test/file.txt';
      
      mockFs.promises.stat.mockResolvedValue({
        isDirectory: () => false
      });
      
      const result = await fileService.getAllFiles(dirPath);
      
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('Path is not a directory', {
        path: dirPath
      });
    });

    it('should handle subdirectory scanning', async () => {
      const dirPath = '/test/dir';
      const files = ['subdir', 'file1.safetensors'];
      
      mockFs.promises.readdir.mockResolvedValue(files);
      mockFs.promises.stat.mockImplementation((path) => {
        const isDir = path.includes('subdir');
        return Promise.resolve({
          isDirectory: () => isDir,
          isFile: () => !isDir
        });
      });
      
      // Mock subdirectory content
      mockFs.promises.readdir.mockResolvedValueOnce(files);
      mockFs.promises.readdir.mockResolvedValueOnce(['subfile.safetensors']);
      
      mockPath.extname.mockReturnValue('.safetensors');
      
      const result = await fileService.getAllFiles(dirPath);
      
      expect(result).toContain('/test/dir/file1.safetensors');
      expect(result).toContain('/test/dir/subdir/subfile.safetensors');
    });

    it('should handle file processing errors gracefully', async () => {
      const dirPath = '/test/dir';
      const files = ['file1.safetensors', 'file2.safetensors'];
      
      mockFs.promises.readdir.mockResolvedValue(files);
      mockFs.promises.stat.mockRejectedValueOnce(new Error('File access error'));
      mockFs.promises.stat.mockResolvedValue({
        isFile: () => true
      });
      
      mockPath.extname.mockReturnValue('.safetensors');
      
      const result = await fileService.getAllFiles(dirPath);
      
      expect(result).toContain('/test/dir/file2.safetensors');
      expect(mockLogger.warn).toHaveBeenCalledWith('Error processing file in directory', {
        file: 'file1.safetensors',
        directory: dirPath,
        error: 'File access error'
      });
    });
  });

  describe('isValidWindowsPath', () => {
    it('should return true for valid Windows paths', () => {
      expect(fileService.isValidWindowsPath('C:\\folder\\file.txt')).toBe(true);
      expect(fileService.isValidWindowsPath('D:\\path\\to\\folder')).toBe(true);
      expect(fileService.isValidWindowsPath('Z:\\test')).toBe(true);
    });

    it('should return false for invalid Windows paths', () => {
      expect(fileService.isValidWindowsPath('/unix/path')).toBe(false);
      expect(fileService.isValidWindowsPath('relative\\path')).toBe(false);
      expect(fileService.isValidWindowsPath('C:folder\\file.txt')).toBe(false);
      expect(fileService.isValidWindowsPath('')).toBe(false);
      expect(fileService.isValidWindowsPath(null)).toBe(false);
    });
  });

  describe('validatePath', () => {
    it('should return valid for correct Windows directory path', () => {
      const pathStr = 'C:\\test\\folder';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => true
      });
      mockFs.accessSync.mockImplementation(() => {});
      
      const result = fileService.validatePath(pathStr);
      
      expect(result).toEqual({ valid: true });
    });

    it('should return invalid for non-Windows path format', () => {
      const pathStr = '/unix/path';
      
      const result = fileService.validatePath(pathStr);
      
      expect(result).toEqual({
        valid: false,
        error: 'Invalid full path format (should be like C:\\folder\\...)'
      });
    });

    it('should return invalid for non-existent path', () => {
      const pathStr = 'C:\\nonexistent\\folder';
      
      mockFs.existsSync.mockReturnValue(false);
      
      const result = fileService.validatePath(pathStr);
      
      expect(result).toEqual({
        valid: false,
        error: 'Directory does not exist'
      });
    });

    it('should return invalid for file path instead of directory', () => {
      const pathStr = 'C:\\test\\file.txt';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false
      });
      
      const result = fileService.validatePath(pathStr);
      
      expect(result).toEqual({
        valid: false,
        error: 'Path is not a directory'
      });
    });

    it('should return invalid for non-readable directory', () => {
      const pathStr = 'C:\\test\\folder';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => true
      });
      mockFs.accessSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = fileService.validatePath(pathStr);
      
      expect(result).toEqual({
        valid: false,
        error: 'Directory is not readable (permission denied)'
      });
    });

    it('should handle validation errors gracefully', () => {
      const pathStr = 'C:\\test\\folder';
      
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const result = fileService.validatePath(pathStr);
      
      expect(result).toEqual({
        valid: false,
        error: 'Path validation failed: Unexpected error'
      });
    });
  });

  describe('checkFilesInDatabase', () => {
    it('should check files against database and return results', async () => {
      const files = [
        { fullPath: '/test/file1.safetensors', baseName: 'file1.safetensors' },
        { fullPath: '/test/file2.safetensors', baseName: 'file2.safetensors' },
        { fullPath: '/test/file3.safetensors', baseName: 'file3.safetensors' }
      ];
      const dbFileNames = ['file1.safetensors', 'file3.safetensors'];
      
      const result = await fileService.checkFilesInDatabase(files, dbFileNames);
      
      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('Present');
      expect(result[1].status).toBe('');
      expect(result[2].status).toBe('Present');
      expect(mockLogger.info).toHaveBeenCalledWith('Checking files against database', {
        fileCount: 3
      });
    });

    it('should handle processing errors gracefully', async () => {
      const files = [
        { fullPath: '/test/file1.safetensors', baseName: 'file1.safetensors' },
        { fullPath: '/test/file2.safetensors', baseName: null } // This will cause an error
      ];
      const dbFileNames = ['file1.safetensors'];
      
      const result = await fileService.checkFilesInDatabase(files, dbFileNames);
      
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('Present');
      expect(result[1].error).toBeDefined();
    });

    it('should log progress for large file sets', async () => {
      const files = Array.from({ length: 150 }, (_, i) => ({
        fullPath: `/test/file${i}.safetensors`,
        baseName: `file${i}.safetensors`
      }));
      const dbFileNames = ['file0.safetensors'];
      
      await fileService.checkFilesInDatabase(files, dbFileNames);
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Database check progress', {
        processed: 100,
        total: 150
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Database check progress', {
        processed: 150,
        total: 150
      });
    });
  });

  describe('validateDownloadedFiles', () => {
    it('should validate files successfully', async () => {
      const downloadedFiles = [
        {
          fileName: 'test1.safetensors',
          file_path: '/test/test1.safetensors',
          modelVersionId: 1,
          modelId: 1,
          size_in_kb: 1024
        }
      ];
      
      mockFs.existsSync.mockReturnValue(true);
      mockPath.basename.mockReturnValue('test1.safetensors');
      mockFs.statSync.mockReturnValue({ size: 1024 * 1024 }); // 1MB
      
      const result = await fileService.validateDownloadedFiles(downloadedFiles);
      
      expect(result.validated).toBe(1);
      expect(result.mismatches).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing file paths in database', async () => {
      const downloadedFiles = [
        {
          fileName: 'test1.safetensors',
          file_path: null,
          modelVersionId: 1,
          modelId: 1,
          size_in_kb: 1024
        }
      ];
      
      const result = await fileService.validateDownloadedFiles(downloadedFiles);
      
      expect(result.validated).toBe(0);
      expect(result.mismatches).toHaveLength(1);
      expect(result.mismatches[0].issue).toBe('No file path in database');
    });

    it('should detect files not found on disk', async () => {
      const downloadedFiles = [
        {
          fileName: 'test1.safetensors',
          file_path: '/test/test1.safetensors',
          modelVersionId: 1,
          modelId: 1,
          size_in_kb: 1024
        }
      ];
      
      mockFs.existsSync.mockReturnValue(false);
      
      const result = await fileService.validateDownloadedFiles(downloadedFiles);
      
      expect(result.validated).toBe(0);
      expect(result.mismatches).toHaveLength(1);
      expect(result.mismatches[0].issue).toBe('File not found on disk');
    });

    it('should detect filename mismatches', async () => {
      const downloadedFiles = [
        {
          fileName: 'test1.safetensors',
          file_path: '/test/test1.safetensors',
          modelVersionId: 1,
          modelId: 1,
          size_in_kb: 1024
        }
      ];
      
      mockFs.existsSync.mockReturnValue(true);
      mockPath.basename.mockReturnValue('different.safetensors');
      
      const result = await fileService.validateDownloadedFiles(downloadedFiles);
      
      expect(result.validated).toBe(0);
      expect(result.mismatches).toHaveLength(1);
      expect(result.mismatches[0].issue).toBe('Filename mismatch');
    });

    it('should detect file size mismatches', async () => {
      const downloadedFiles = [
        {
          fileName: 'test1.safetensors',
          file_path: '/test/test1.safetensors',
          modelVersionId: 1,
          modelId: 1,
          size_in_kb: 1000
        }
      ];
      
      mockFs.existsSync.mockReturnValue(true);
      mockPath.basename.mockReturnValue('test1.safetensors');
      mockFs.statSync.mockReturnValue({ size: 500 * 1024 }); // 500KB (50% of expected)
      
      const result = await fileService.validateDownloadedFiles(downloadedFiles);
      
      expect(result.validated).toBe(0);
      expect(result.mismatches).toHaveLength(1);
      expect(result.mismatches[0].issue).toBe('File size mismatch (serious difference)');
    });

    it('should handle validation errors gracefully', async () => {
      const downloadedFiles = [
        {
          fileName: 'test1.safetensors',
          file_path: '/test/test1.safetensors',
          modelVersionId: 1,
          modelId: 1,
          size_in_kb: 1024
        }
      ];
      
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const result = await fileService.validateDownloadedFiles(downloadedFiles);
      
      expect(result.validated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Unexpected error');
    });

    it('should allow 10% size difference tolerance', async () => {
      const downloadedFiles = [
        {
          fileName: 'test1.safetensors',
          file_path: '/test/test1.safetensors',
          modelVersionId: 1,
          modelId: 1,
          size_in_kb: 1000
        }
      ];
      
      mockFs.existsSync.mockReturnValue(true);
      mockPath.basename.mockReturnValue('test1.safetensors');
      mockFs.statSync.mockReturnValue({ size: 1050 * 1024 }); // 1050KB (5% larger)
      
      const result = await fileService.validateDownloadedFiles(downloadedFiles);
      
      expect(result.validated).toBe(1);
      expect(result.mismatches).toHaveLength(0);
    });
  });

  describe('findMissingFiles', () => {
    it('should find files not in database', async () => {
      const paths = ['C:\\test\\folder1', 'C:\\test\\folder2'];
      const dbFileNames = ['file1.safetensors'];
      
      mockFs.promises.readdir.mockResolvedValue(['file1.safetensors', 'file2.safetensors']);
      mockFs.promises.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      });
      mockPath.basename.mockImplementation((path) => path.split('/').pop());
      mockPath.dirname.mockReturnValue('C:\\test\\folder1');
      
      const result = await fileService.findMissingFiles(paths, dbFileNames);
      
      expect(result.missingFiles).toHaveLength(1);
      expect(result.missingFiles[0].fileName).toBe('file2.safetensors');
      expect(result.totalScanned).toBe(2);
      expect(result.totalMissing).toBe(1);
    });

    it('should handle empty paths array', async () => {
      const paths = [];
      const dbFileNames = ['file1.safetensors'];
      
      await expect(fileService.findMissingFiles(paths, dbFileNames))
        .rejects.toThrow('No saved paths to scan.');
    });

    it('should handle invalid paths', async () => {
      const paths = ['C:\\invalid\\path'];
      const dbFileNames = ['file1.safetensors'];
      
      mockFs.promises.access.mockRejectedValue(new Error('Path not found'));
      
      const result = await fileService.findMissingFiles(paths, dbFileNames);
      
      expect(result.scanErrors).toHaveLength(1);
      expect(result.totalScanned).toBe(0);
    });

    it('should handle no files found', async () => {
      const paths = ['C:\\test\\folder'];
      const dbFileNames = ['file1.safetensors'];
      
      mockFs.promises.readdir.mockResolvedValue([]);
      
      const result = await fileService.findMissingFiles(paths, dbFileNames);
      
      expect(result.missingFiles).toHaveLength(0);
      expect(result.totalScanned).toBe(0);
    });
  });

  describe('computeFileHash', () => {
    it('should compute SHA256 hash successfully', async () => {
      const filePath = '/test/file.safetensors';
      const fileContent = Buffer.from('test content');
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(fileContent);
      mockFs.statSync.mockReturnValue({ size: 1024 });
      
      const result = await fileService.computeFileHash(filePath);
      
      expect(result.hash).toBe('mock-hash-value');
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = '/test/nonexistent.safetensors';
      
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(fileService.computeFileHash(filePath))
        .rejects.toThrow('File not found');
    });

    it('should throw error for non-readable file', async () => {
      const filePath = '/test/file.safetensors';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.accessSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      await expect(fileService.computeFileHash(filePath))
        .rejects.toThrow('File is not readable (permission denied)');
    });

    it('should throw error for empty file', async () => {
      const filePath = '/test/empty.safetensors';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ size: 0 });
      
      await expect(fileService.computeFileHash(filePath))
        .rejects.toThrow('File is empty');
    });

    it('should handle hash computation errors', async () => {
      const filePath = '/test/file.safetensors';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      
      await expect(fileService.computeFileHash(filePath))
        .rejects.toThrow('Hash computation failed: Read error');
    });
  });

  describe('fixFile', () => {
    it('should rename file successfully', async () => {
      const modelVersionId = 123;
      const filePath = '/test/oldname.safetensors';
      const dbFileName = 'newname.safetensors';
      
      mockFs.existsSync.mockReturnValue(true);
      mockPath.dirname.mockReturnValue('/test');
      mockPath.extname.mockReturnValue('.safetensors');
      mockPath.join.mockReturnValue('/test/newname.safetensors');
      
      const result = await fileService.fixFile(modelVersionId, filePath, dbFileName);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('File renamed successfully');
      expect(mockFs.renameSync).toHaveBeenCalledWith(filePath, '/test/newname.safetensors');
    });

    it('should create subfolder when target file exists', async () => {
      const modelVersionId = 123;
      const filePath = '/test/oldname.safetensors';
      const dbFileName = 'newname.safetensors';
      
      mockFs.existsSync.mockReturnValueOnce(true); // Original file exists
      mockFs.existsSync.mockReturnValueOnce(true); // Target file exists
      mockPath.dirname.mockReturnValue('/test');
      mockPath.join
        .mockReturnValueOnce('/test/123') // Subfolder path
        .mockReturnValueOnce('/test/123/newname.safetensors'); // New file path
      
      const result = await fileService.fixFile(modelVersionId, filePath, dbFileName);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('File moved to subfolder and renamed successfully');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/123');
      expect(mockFs.renameSync).toHaveBeenCalledWith(filePath, '/test/123/newname.safetensors');
    });

    it('should throw error for non-existent file', async () => {
      const modelVersionId = 123;
      const filePath = '/test/nonexistent.safetensors';
      const dbFileName = 'newname.safetensors';
      
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(fileService.fixFile(modelVersionId, filePath, dbFileName))
        .rejects.toThrow('File not found on disk');
    });

    it('should throw error for non-writable file', async () => {
      const modelVersionId = 123;
      const filePath = '/test/file.safetensors';
      const dbFileName = 'newname.safetensors';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.accessSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      await expect(fileService.fixFile(modelVersionId, filePath, dbFileName))
        .rejects.toThrow('File is not writable (permission denied)');
    });

    it('should throw error for non-writable directory', async () => {
      const modelVersionId = 123;
      const filePath = '/test/file.safetensors';
      const dbFileName = 'newname.safetensors';
      
      mockFs.existsSync.mockReturnValue(false); // Target file doesn't exist
      mockPath.dirname.mockReturnValue('/test');
      mockFs.accessSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      await expect(fileService.fixFile(modelVersionId, filePath, dbFileName))
        .rejects.toThrow('Target directory is not writable (permission denied)');
    });
  });

  describe('scanUniqueLoras', () => {
    it('should find unique loras successfully', async () => {
      const paths = ['C:\\test\\folder'];
      const dbFileNames = ['file1.safetensors', 'file2.safetensors'];
      
      mockFs.promises.readdir.mockResolvedValue(['file1.safetensors', 'file2.safetensors']);
      mockFs.promises.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      });
      mockPath.basename.mockImplementation((path) => path.split('/').pop());
      
      mockDatabaseService.getFileRecordsByNames.mockResolvedValue([
        { fileName: 'file1.safetensors', isDownloaded: 1 },
        { fileName: 'file2.safetensors', isDownloaded: 0 }
      ]);
      
      const result = await fileService.scanUniqueLoras(paths, dbFileNames);
      
      expect(result.uniqueFiles).toHaveLength(2);
      expect(result.uniqueFiles[0].status).toBe('Unique');
      expect(result.uniqueFiles[1].status).toBe('Unique');
    });

    it('should detect disk duplicates', async () => {
      const paths = ['C:\\test\\folder'];
      const dbFileNames = ['file1.safetensors'];
      
      mockFs.promises.readdir.mockResolvedValue(['file1.safetensors', 'file1.safetensors']); // Duplicate
      mockFs.promises.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      });
      mockPath.basename.mockReturnValue('file1.safetensors');
      
      mockDatabaseService.getFileRecordsByNames.mockResolvedValue([
        { fileName: 'file1.safetensors', isDownloaded: 1 }
      ]);
      
      const result = await fileService.scanUniqueLoras(paths, dbFileNames);
      
      expect(result.uniqueFiles).toHaveLength(1);
      expect(result.uniqueFiles[0].status).toBe('Duplicate on Disk');
    });

    it('should detect database duplicates', async () => {
      const paths = ['C:\\test\\folder'];
      const dbFileNames = ['file1.safetensors', 'file1.safetensors']; // Duplicate in DB
      
      mockFs.promises.readdir.mockResolvedValue(['file1.safetensors']);
      mockFs.promises.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      });
      mockPath.basename.mockReturnValue('file1.safetensors');
      
      mockDatabaseService.getFileRecordsByNames.mockResolvedValue([
        { fileName: 'file1.safetensors', isDownloaded: 1 }
      ]);
      
      const result = await fileService.scanUniqueLoras(paths, dbFileNames);
      
      expect(result.uniqueFiles).toHaveLength(1);
      expect(result.uniqueFiles[0].status).toBe('Duplicate in DB');
    });

    it('should handle invalid paths gracefully', async () => {
      const paths = ['C:\\invalid\\path'];
      const dbFileNames = ['file1.safetensors'];
      
      mockFs.promises.access.mockRejectedValue(new Error('Path not found'));
      
      const result = await fileService.scanUniqueLoras(paths, dbFileNames);
      
      expect(result.uniqueFiles).toHaveLength(0);
      expect(result.stats.totalDiskFiles).toBe(0);
    });
  });

  describe('renameFileAsDuplicate', () => {
    it('should rename file with _duplicate suffix', async () => {
      const filePath = '/test/file.safetensors';
      
      mockFs.existsSync.mockReturnValue(true);
      mockPath.dirname.mockReturnValue('/test');
      mockPath.extname.mockReturnValue('.safetensors');
      mockPath.basename.mockReturnValueOnce('file'); // Without extension
      mockPath.join.mockReturnValue('/test/file_duplicate.safetensors');
      
      const result = await fileService.renameFileAsDuplicate(filePath);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('File renamed as duplicate successfully');
      expect(result.newFileName).toBe('file_duplicate.safetensors');
      expect(mockFs.renameSync).toHaveBeenCalledWith(filePath, '/test/file_duplicate.safetensors');
    });

    it('should throw error for non-existent file', async () => {
      const filePath = '/test/nonexistent.safetensors';
      
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(fileService.renameFileAsDuplicate(filePath))
        .rejects.toThrow('File not found');
    });

    it('should throw error when target file already exists', async () => {
      const filePath = '/test/file.safetensors';
      
      mockFs.existsSync.mockReturnValueOnce(true); // Original file exists
      mockFs.existsSync.mockReturnValueOnce(true); // Target file exists
      mockPath.dirname.mockReturnValue('/test');
      mockPath.extname.mockReturnValue('.safetensors');
      mockPath.basename.mockReturnValueOnce('file');
      mockPath.join.mockReturnValue('/test/file_duplicate.safetensors');
      
      await expect(fileService.renameFileAsDuplicate(filePath))
        .rejects.toThrow('File file_duplicate.safetensors already exists');
    });

    it('should throw error for non-writable directory', async () => {
      const filePath = '/test/file.safetensors';
      
      mockFs.existsSync.mockReturnValue(false); // Target doesn't exist
      mockPath.dirname.mockReturnValue('/test');
      mockFs.accessSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      await expect(fileService.renameFileAsDuplicate(filePath))
        .rejects.toThrow('Directory is not writable (permission denied)');
    });
  });

  describe('getSafetensorCounts', () => {
    it('should count safetensor files in directories', async () => {
      const paths = ['C:\\test\\folder1', 'C:\\test\\folder2'];
      
      mockFs.promises.readdir.mockResolvedValue(['file1.safetensors', 'file2.safetensors']);
      mockFs.promises.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      });
      
      const result = await fileService.getSafetensorCounts(paths);
      
      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(2);
      expect(result[1].count).toBe(2);
    });

    it('should handle invalid directories', async () => {
      const paths = ['C:\\invalid\\path'];
      
      mockFs.promises.access.mockRejectedValue(new Error('Path not found'));
      
      const result = await fileService.getSafetensorCounts(paths);
      
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(0);
    });

    it('should handle scanning errors gracefully', async () => {
      const paths = ['C:\\test\\folder'];
      
      mockFs.promises.readdir.mockRejectedValue(new Error('Scan error'));
      
      const result = await fileService.getSafetensorCounts(paths);
      
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith('Error counting safetensor files', {
        path: 'C:\\test\\folder',
        error: 'Scan error'
      });
    });
  });
}); 