const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ALLOWED_EXTENSIONS, PATHS } = require('../config/constants');
const logger = require('../utils/logger');
const databaseService = require('../services/databaseService');

class FileService {
    // Check if file has allowed extension
    hasAllowedExt(filename) {
        const ext = path.extname(filename).replace('.', '');
        return ALLOWED_EXTENSIONS.some(e => e.toLowerCase() === ext.toLowerCase());
    }

    // Recursively get all files from directory with proper error handling
    getAllFiles(dirPath, arrayOfFiles = []) {
        try {
            // Check if directory exists and is accessible
            if (!fs.existsSync(dirPath)) {
                logger.warn('Directory does not exist', { path: dirPath });
                return arrayOfFiles;
            }

            const stats = fs.statSync(dirPath);
            if (!stats.isDirectory()) {
                logger.warn('Path is not a directory', { path: dirPath });
                return arrayOfFiles;
            }

            const files = fs.readdirSync(dirPath);
            
            for (const file of files) {
                try {
                    const fullPath = path.join(dirPath, file);
                    const fileStats = fs.statSync(fullPath);
                    
                    if (fileStats.isDirectory()) {
                        this.getAllFiles(fullPath, arrayOfFiles);
                    } else {
                        if (this.hasAllowedExt(fullPath)) {
                            arrayOfFiles.push(fullPath);
                        }
                    }
                } catch (fileError) {
                    logger.warn('Error processing file in directory', { 
                        file, 
                        directory: dirPath, 
                        error: fileError.message 
                    });
                    // Continue with other files
                }
            }
        } catch (error) {
            logger.error('Error reading directory', { 
                path: dirPath, 
                error: error.message 
            });
        }
        return arrayOfFiles;
    }

    // Validate Windows path format
    isValidWindowsPath(pathStr) {
        return /^[a-zA-Z]:\\/.test(pathStr);
    }

    // Check if path exists and is directory with proper error handling
    validatePath(pathStr) {
        try {
            if (!this.isValidWindowsPath(pathStr)) {
                return { valid: false, error: 'Invalid full path format (should be like C:\\folder\\...)' };
            }
            
            if (!fs.existsSync(pathStr)) {
                return { valid: false, error: 'Directory does not exist' };
            }
            
            const stats = fs.statSync(pathStr);
            if (!stats.isDirectory()) {
                return { valid: false, error: 'Path is not a directory' };
            }
            
            // Check if directory is readable
            try {
                fs.accessSync(pathStr, fs.constants.R_OK);
            } catch (accessError) {
                return { valid: false, error: 'Directory is not readable (permission denied)' };
            }
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: `Path validation failed: ${error.message}` };
        }
    }

    // Check files against database with proper error handling
    async checkFilesInDatabase(files, dbFileNames) {
        logger.info('Checking files against database', { fileCount: files.length });

        const results = files.map((f, index) => {
            try {
                const lowerBase = (f.baseName || '').toLowerCase();
                let status = '';
                if (dbFileNames.includes(lowerBase)) {
                    status = 'Present';
                }

                // Log progress every 100 files
                if ((index + 1) % 100 === 0 || index === files.length - 1) {
                    logger.debug('Database check progress', { 
                        processed: index + 1, 
                        total: files.length 
                    });
                }

                return {
                    fullPath: f.fullPath,
                    baseName: f.baseName,
                    status
                };
            } catch (error) {
                logger.error('Error processing file in database check', { 
                    file: f.baseName, 
                    error: error.message 
                });
                return {
                    fullPath: f.fullPath,
                    baseName: f.baseName,
                    status: '',
                    error: error.message
                };
            }
        });

        const presentCount = results.filter(r => r.status === 'Present').length;
        const notFoundCount = results.filter(r => !r.status || r.status === '').length;

        logger.info('Database check completed', {
            totalFiles: files.length,
            presentInDB: presentCount,
            notFoundInDB: notFoundCount
        });

        return results;
    }

    // Validate downloaded files with proper error handling
    async validateDownloadedFiles(downloadedFiles) {
        logger.info('Validating downloaded files', { fileCount: downloadedFiles.length });

        let validated = 0;
        let mismatches = [];
        let errors = [];

        // Process each file
        for (let index = 0; index < downloadedFiles.length; index++) {
            const row = downloadedFiles[index];
            const { fileName, file_path, modelVersionId } = row;

            try {
                // Check if file_path exists
                if (!file_path) {
                    mismatches.push({
                        fileName,
                        modelVersionId,
                        file_path,
                        issue: 'No file path in database'
                    });
                    continue;
                }

                if (!fs.existsSync(file_path)) {
                    mismatches.push({
                        fileName,
                        modelVersionId,
                        file_path,
                        issue: 'File not found on disk'
                    });
                    continue;
                }

                // Get the actual filename from the file_path
                const actualFileName = path.basename(file_path);

                // Check if the filename in DB matches the actual filename
                if (fileName !== actualFileName) {
                    mismatches.push({
                        fileName,
                        modelVersionId,
                        file_path,
                        actualFileName,
                        issue: 'Filename mismatch'
                    });
                    continue;
                }

                validated++;

                // Log progress every 100 files
                if ((index + 1) % 100 === 0 || index === downloadedFiles.length - 1) {
                    logger.debug('File validation progress', { 
                        validated: index + 1, 
                        total: downloadedFiles.length 
                    });
                }

            } catch (error) {
                errors.push({
                    fileName,
                    modelVersionId,
                    error: error.message
                });
                logger.error('Error validating file', { 
                    fileName, 
                    modelVersionId, 
                    error: error.message 
                });
            }
        }

        logger.info('File validation completed', {
            totalFiles: downloadedFiles.length,
            validated,
            mismatches: mismatches.length,
            errors: errors.length
        });

        return {
            validated,
            mismatches,
            errors,
            total: downloadedFiles.length
        };
    }

    // Find missing files with proper error handling
    async findMissingFiles(paths, dbFileNames) {
        logger.info('Finding missing files', { pathCount: paths.length });

        if (!paths.length) {
            logger.error('No saved paths to scan');
            throw new Error('No saved paths to scan.');
        }

        // Get all files from the scanned paths
        const allFiles = [];
        const scanErrors = [];

        for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
            const p = paths[pathIndex];
            logger.info(`Scanning path ${pathIndex + 1}/${paths.length}`, { path: p });

            const validation = this.validatePath(p);
            if (!validation.valid) {
                scanErrors.push({ path: p, error: validation.error });
                logger.warn('Path validation failed', { path: p, error: validation.error });
                continue;
            }

            logger.debug('Path is valid, scanning for files', { path: p });
            const pathFiles = this.getAllFiles(p, []);
            allFiles.push(...pathFiles);
            logger.info('Path scan completed', { path: p, fileCount: pathFiles.length });
        }

        logger.info('File scanning completed', { 
            totalFiles: allFiles.length, 
            scanErrors: scanErrors.length 
        });

        if (allFiles.length === 0) {
            logger.warn('No files found to check against database');
            return {
                missingFiles: [],
                scanErrors,
                totalScanned: 0,
                totalMissing: 0
            };
        }

        // Find files that are not in the database
        const missingFiles = [];
        for (let index = 0; index < allFiles.length; index++) {
            try {
                const filePath = allFiles[index];
                const fileName = path.basename(filePath);
                const lowerFileName = fileName.toLowerCase();

                if (!dbFileNames.includes(lowerFileName)) {
                    missingFiles.push({
                        fullPath: filePath,
                        fileName: fileName,
                        directory: path.dirname(filePath)
                    });
                }

                // Log progress every 100 files
                if ((index + 1) % 100 === 0 || index === allFiles.length - 1) {
                    logger.debug('Missing files check progress', { 
                        processed: index + 1, 
                        total: allFiles.length 
                    });
                }
            } catch (error) {
                logger.error('Error processing file in missing files check', { 
                    file: allFiles[index], 
                    error: error.message 
                });
            }
        }

        logger.info('Missing files check completed', {
            filesScanned: allFiles.length,
            filesInDatabase: dbFileNames.length,
            missingFiles: missingFiles.length,
            scanErrors: scanErrors.length
        });

        return {
            missingFiles,
            scanErrors,
            totalScanned: allFiles.length,
            totalMissing: missingFiles.length,
            totalInDatabase: dbFileNames.length
        };
    }

    // Compute SHA256 hash of a file with proper error handling
    async computeFileHash(filePath) {
        logger.info('Computing file hash', { filePath });

        try {
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                logger.error('File does not exist', { filePath });
                throw new Error('File not found');
            }

            // Check if file is readable
            try {
                fs.accessSync(filePath, fs.constants.R_OK);
            } catch (accessError) {
                logger.error('File is not readable', { filePath, error: accessError.message });
                throw new Error('File is not readable (permission denied)');
            }

            // Get file stats to check size
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                logger.warn('File is empty', { filePath });
                throw new Error('File is empty');
            }

            // Read file and compute SHA256 hash
            const fileBuffer = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            logger.info('Hash computed successfully', { 
                fileName: path.basename(filePath),
                fileSize: stats.size,
                hash: hash.substring(0, 16) + '...' // Log only first 16 chars for security
            });

            return { hash };
        } catch (error) {
            logger.error('Hash computation failed', { filePath, error: error.message });
            throw new Error('Hash computation failed: ' + error.message);
        }
    }

    // Fix file by renaming and updating database with proper error handling
    async fixFile(modelVersionId, filePath, dbFileName) {
        logger.info('Fixing file', { modelVersionId, filePath, dbFileName });

        try {
            // Check if the file exists
            if (!fs.existsSync(filePath)) {
                logger.error('File does not exist', { filePath });
                throw new Error('File not found on disk');
            }

            // Check if file is writable
            try {
                fs.accessSync(filePath, fs.constants.W_OK);
            } catch (accessError) {
                logger.error('File is not writable', { filePath, error: accessError.message });
                throw new Error('File is not writable (permission denied)');
            }

            // Get directory and extension from the original file
            const dir = path.dirname(filePath);
            const ext = path.extname(filePath);

            // Construct new file path with DB filename
            const newFilePath = path.join(dir, dbFileName);

            // Check if target file already exists
            if (fs.existsSync(newFilePath)) {
                // Target file exists, create a subfolder named after modelVersionId
                const newFolder = path.join(dir, String(modelVersionId));
                if (!fs.existsSync(newFolder)) {
                    fs.mkdirSync(newFolder);
                }
                // Move the original file to the new folder and rename
                const movedFilePath = path.join(newFolder, dbFileName);
                fs.renameSync(filePath, movedFilePath);
                logger.info('File moved and renamed to subfolder', {
                    oldPath: filePath,
                    newPath: movedFilePath,
                    subfolder: newFolder
                });
                return {
                    success: true,
                    message: 'File moved to subfolder and renamed successfully',
                    oldPath: filePath,
                    newPath: movedFilePath,
                    dbFileName: dbFileName,
                    subfolder: newFolder
                };
            }

            // Check if target directory is writable
            try {
                fs.accessSync(dir, fs.constants.W_OK);
            } catch (accessError) {
                logger.error('Target directory is not writable', { dir, error: accessError.message });
                throw new Error('Target directory is not writable (permission denied)');
            }

            // Rename the file
            fs.renameSync(filePath, newFilePath);
            
            logger.info('File renamed successfully', { 
                oldPath: filePath, 
                newPath: newFilePath 
            });

            return {
                success: true,
                message: 'File renamed successfully',
                oldPath: filePath,
                newPath: newFilePath,
                dbFileName: dbFileName
            };
        } catch (error) {
            logger.error('File rename failed', { 
                filePath, 
                dbFileName, 
                error: error.message 
            });
            throw new Error('File rename failed: ' + error.message);
        }
    }

    // Scan for unique loras - files that exist on disk and in database, excluding duplicates
    async scanUniqueLoras(paths, dbFileNames) {
        logger.info('Scanning for unique loras', { pathCount: paths.length });

        // First, get all files from disk
        const allDiskFiles = [];
        for (const p of paths) {
            const validation = this.validatePath(p);
            if (validation.valid) {
                const files = this.getAllFiles(p, []);
                allDiskFiles.push(...files.map(f => ({
                    fullPath: f,
                    baseName: path.basename(f).toLowerCase()
                })));
            }
        }

        logger.info('Found files on disk', { totalFiles: allDiskFiles.length });

        // Find duplicates on disk
        const diskFileCounts = {};
        allDiskFiles.forEach(file => {
            diskFileCounts[file.baseName] = (diskFileCounts[file.baseName] || 0) + 1;
        });

        const diskDuplicates = new Set(
            Object.entries(diskFileCounts)
                .filter(([filename, count]) => count > 1)
                .map(([filename]) => filename)
        );

        logger.info('Found disk duplicates', { duplicateCount: diskDuplicates.size });

        // Find duplicates in database
        const dbFileCounts = {};
        dbFileNames.forEach(filename => {
            dbFileCounts[filename] = (dbFileCounts[filename] || 0) + 1;
        });

        const dbDuplicates = new Set(
            Object.entries(dbFileCounts)
                .filter(([filename, count]) => count > 1)
                .map(([filename]) => filename)
        );

        logger.info('Found database duplicates', { duplicateCount: dbDuplicates.size });

        // Find unique files that exist both on disk and in database
        const uniqueFiles = allDiskFiles.filter(file => {
            const baseName = file.baseName;
            
            // Must exist in database
            if (!dbFileNames.includes(baseName)) {
                return false;
            }
            
            // Must not be a duplicate on disk
            if (diskDuplicates.has(baseName)) {
                return false;
            }
            
            // Must not be a duplicate in database
            if (dbDuplicates.has(baseName)) {
                return false;
            }
            
            return true;
        });

        // Find non-unique files (files with duplicates)
        const nonUniqueFiles = allDiskFiles.filter(file => {
            const baseName = file.baseName;
            
            // Must exist in database
            if (!dbFileNames.includes(baseName)) {
                return false;
            }
            
            // Must be a duplicate on disk OR in database
            if (diskDuplicates.has(baseName) || dbDuplicates.has(baseName)) {
                return true;
            }
            
            return false;
        });

        logger.info('Found unique loras', { uniqueCount: uniqueFiles.length, nonUniqueCount: nonUniqueFiles.length });

        // Get isDownloaded values for all files (unique + non-unique)
        const allFileNames = [...uniqueFiles, ...nonUniqueFiles].map(f => f.baseName);
        const dbRecords = await databaseService.getFileRecordsByNames(allFileNames);
        
        // Create a map for quick lookup - use lowercase for both keys and values
        const dbRecordMap = {};
        dbRecords.forEach(record => {
            const lowerFileName = record.fileName.toLowerCase();
            dbRecordMap[lowerFileName] = record;
        });

        // Process unique files
        const processedUniqueFiles = uniqueFiles.map(f => {
            const dbRecord = dbRecordMap[f.baseName];
            const isDownloaded = dbRecord ? dbRecord.isDownloaded : 0;
            
            return {
                fullPath: f.fullPath,
                baseName: f.baseName,
                status: 'Unique',
                isDownloaded: isDownloaded
            };
        });

        // Process non-unique files
        const processedNonUniqueFiles = nonUniqueFiles.map(f => {
            const dbRecord = dbRecordMap[f.baseName];
            const isDownloaded = dbRecord ? dbRecord.isDownloaded : 0;
            
            // Determine the reason for non-uniqueness
            let status = 'Duplicate Issue';
            if (diskDuplicates.has(f.baseName) && dbDuplicates.has(f.baseName)) {
                status = 'Duplicate on Disk & DB';
            } else if (diskDuplicates.has(f.baseName)) {
                status = 'Duplicate on Disk';
            } else if (dbDuplicates.has(f.baseName)) {
                status = 'Duplicate in DB';
            }
            
            return {
                fullPath: f.fullPath,
                baseName: f.baseName,
                status: status,
                isDownloaded: isDownloaded
            };
        });

        return {
            uniqueFiles: [...processedUniqueFiles, ...processedNonUniqueFiles],
            stats: {
                totalDiskFiles: allDiskFiles.length
            }
        };
    }

    // Rename file as duplicate by adding _duplicate suffix
    async renameFileAsDuplicate(filePath) {
        try {
            logger.info('Renaming file as duplicate', { filePath });

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error('File not found');
            }

            // Get file info
            const dir = path.dirname(filePath);
            const ext = path.extname(filePath);
            const baseName = path.basename(filePath, ext);
            
            // Create new filename with _duplicate suffix
            const newFileName = `${baseName}_duplicate${ext}`;
            const newFilePath = path.join(dir, newFileName);

            // Check if target file already exists
            if (fs.existsSync(newFilePath)) {
                throw new Error(`File ${newFileName} already exists`);
            }

            // Check if directory is writable
            try {
                fs.accessSync(dir, fs.constants.W_OK);
            } catch (accessError) {
                logger.error('Directory is not writable', { dir, error: accessError.message });
                throw new Error('Directory is not writable (permission denied)');
            }

            // Rename the file
            fs.renameSync(filePath, newFilePath);
            
            logger.info('File renamed as duplicate successfully', { 
                oldPath: filePath, 
                newPath: newFilePath 
            });

            return {
                success: true,
                message: 'File renamed as duplicate successfully',
                oldPath: filePath,
                newPath: newFilePath,
                newFileName: newFileName
            };
        } catch (error) {
            logger.error('File rename as duplicate failed', { 
                filePath, 
                error: error.message 
            });
            throw new Error('File rename as duplicate failed: ' + error.message);
        }
    }

    // Get safetensor file counts for each directory
    async getSafetensorCounts(paths) {
        logger.info('Getting safetensor counts for directories', { pathCount: paths.length });

        const results = [];

        for (const dirPath of paths) {
            try {
                const validation = this.validatePath(dirPath);
                if (validation.valid) {
                    const files = this.getAllFiles(dirPath, []);
                    const count = files.length;
                    
                    results.push({
                        path: dirPath,
                        count: count
                    });
                    
                    logger.debug('Safetensor count for directory', { 
                        path: dirPath, 
                        count: count 
                    });
                } else {
                    results.push({
                        path: dirPath,
                        count: 0
                    });
                    
                    logger.warn('Invalid directory path', { 
                        path: dirPath, 
                        error: validation.error 
                    });
                }
            } catch (error) {
                results.push({
                    path: dirPath,
                    count: 0
                });
                
                logger.error('Error counting safetensor files', { 
                    path: dirPath, 
                    error: error.message 
                });
            }
        }

        logger.info('Safetensor count completed', { 
            totalPaths: paths.length,
            successfulCounts: results.filter(r => r.count > 0).length,
            zeroCounts: results.filter(r => r.count === 0).length
        });

        return results;
    }
}

module.exports = new FileService(); 