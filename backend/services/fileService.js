const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ALLOWED_EXTENSIONS, PATHS } = require('../config/constants');

class FileService {
    // Check if file has allowed extension
    hasAllowedExt(filename) {
        const ext = path.extname(filename).replace('.', '');
        return ALLOWED_EXTENSIONS.some(e => e.toLowerCase() === ext.toLowerCase());
    }

    // Recursively get all files from directory
    getAllFiles(dirPath, arrayOfFiles = []) {
        try {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                const fullPath = path.join(dirPath, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    this.getAllFiles(fullPath, arrayOfFiles);
                } else {
                    if (this.hasAllowedExt(fullPath)) {
                        arrayOfFiles.push(fullPath);
                    }
                }
            });
        } catch (e) {
            console.log(`Error reading directory ${dirPath}: ${e.message}`);
        }
        return arrayOfFiles;
    }

    // Validate Windows path format
    isValidWindowsPath(pathStr) {
        return /^[a-zA-Z]:\\/.test(pathStr);
    }

    // Check if path exists and is directory
    validatePath(pathStr) {
        if (!this.isValidWindowsPath(pathStr)) {
            return { valid: false, error: 'Invalid full path format (should be like C:\\folder\\...)' };
        }
        if (!fs.existsSync(pathStr)) {
            return { valid: false, error: 'Directory does not exist' };
        }
        if (!fs.statSync(pathStr).isDirectory()) {
            return { valid: false, error: 'Path is not a directory' };
        }
        return { valid: true };
    }

    // Scan directories for files
    async scanDirectories(paths) {
        console.log('=== SCAN REQUEST RECEIVED ===');
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`Scanning ${paths.length} saved paths...`);

        const results = paths.map((p, pathIndex) => {
            console.log(`\n--- Scanning path ${pathIndex + 1}/${paths.length}: ${p} ---`);
            let result = { path: p, files: [], error: null };
            
            const validation = this.validatePath(p);
            if (!validation.valid) {
                result.error = validation.error;
                console.log(`  ERROR: ${result.error}`);
            } else {
                console.log(`  Path is valid, scanning for files...`);
                result.files = this.getAllFiles(p, []);
                console.log(`  Found ${result.files.length} matching files in this path`);
                if (result.files.length > 0) {
                    console.log(`  Sample files found:`);
                    result.files.slice(0, 3).forEach((file, idx) => {
                        console.log(`    ${idx + 1}. ${path.basename(file)}`);
                    });
                    if (result.files.length > 3) {
                        console.log(`    ... and ${result.files.length - 3} more files`);
                    }
                }
            }
            return result;
        });

        const totalFilesFound = results.reduce((sum, result) => sum + (result.files ? result.files.length : 0), 0);
        const successfulPaths = results.filter(r => !r.error).length;
        const failedPaths = results.filter(r => r.error).length;

        console.log('\n=== SCAN COMPLETED ===');
        console.log(`Total paths processed: ${paths.length}`);
        console.log(`Successful paths: ${successfulPaths}`);
        console.log(`Failed paths: ${failedPaths}`);
        console.log(`Total files found: ${totalFilesFound}`);
        console.log(`Scan completed at: ${new Date().toISOString()}`);
        console.log('=== END SCAN ===\n');

        return results;
    }

    // Check files against database
    async checkFilesInDatabase(files, dbFileNames) {
        console.log('=== CHECKING FILES IN DATABASE ===');
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`Checking ${files.length} files against database...`);

        const results = files.map((f, index) => {
            const lowerBase = (f.baseName || '').toLowerCase();
            let status = '';
            if (dbFileNames.includes(lowerBase)) {
                status = 'Present';
            }

            // Log progress every 100 files
            if ((index + 1) % 100 === 0 || index === files.length - 1) {
                console.log(`  Processed ${index + 1}/${files.length} files`);
            }

            return {
                fullPath: f.fullPath,
                baseName: f.baseName,
                status
            };
        });

        const presentCount = results.filter(r => r.status === 'Present').length;
        const notFoundCount = results.filter(r => !r.status || r.status === '').length;

        console.log('=== DATABASE CHECK COMPLETED ===');
        console.log(`Files present in DB: ${presentCount}`);
        console.log(`Files not found in DB: ${notFoundCount}`);
        console.log(`Check completed at: ${new Date().toISOString()}`);
        console.log('=== END DATABASE CHECK ===\n');

        return results;
    }

    // Validate downloaded files
    async validateDownloadedFiles(downloadedFiles) {
        console.log('=== VALIDATING DOWNLOADED FILES ===');
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`Found ${downloadedFiles.length} downloaded files to validate`);

        let validated = 0;
        let mismatches = [];
        let errors = [];

        // Process each file
        downloadedFiles.forEach((row, index) => {
            const { fileName, file_path, modelVersionId } = row;

            try {
                // Check if file_path exists
                if (!file_path || !fs.existsSync(file_path)) {
                    mismatches.push({
                        fileName,
                        modelVersionId,
                        file_path,
                        issue: 'File not found on disk',
                        expectedPath: file_path
                    });
                    return;
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
                        issue: 'Filename mismatch',
                        expectedFileName: fileName
                    });
                    return;
                }

                validated++;

                // Log progress every 100 files
                if ((index + 1) % 100 === 0 || index === downloadedFiles.length - 1) {
                    console.log(`  Validated ${index + 1}/${downloadedFiles.length} files`);
                }

            } catch (error) {
                errors.push({
                    fileName,
                    modelVersionId,
                    error: error.message
                });
                console.log(`ERROR validating ${fileName}: ${error.message}`);
            }
        });

        console.log('=== VALIDATION COMPLETED ===');
        console.log(`Files validated successfully: ${validated}`);
        console.log(`Files with mismatches: ${mismatches.length}`);
        console.log(`Errors encountered: ${errors.length}`);
        console.log(`Validation completed at: ${new Date().toISOString()}`);
        console.log('=== END VALIDATION ===\n');

        return {
            validated,
            mismatches,
            errors,
            total: downloadedFiles.length
        };
    }

    // Find missing files (files on disk but not in database)
    async findMissingFiles(paths, dbFileNames) {
        console.log('=== FINDING MISSING FILES ===');
        console.log(`Timestamp: ${new Date().toISOString()}`);

        if (!paths.length) {
            console.log('ERROR: No saved paths to scan');
            throw new Error('No saved paths to scan.');
        }

        console.log(`Scanning for files with extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);

        // Get all files from the scanned paths
        const allFiles = [];
        const scanErrors = [];

        paths.forEach((p, pathIndex) => {
            console.log(`\n--- Scanning path ${pathIndex + 1}/${paths.length}: ${p} ---`);

            const validation = this.validatePath(p);
            if (!validation.valid) {
                scanErrors.push({ path: p, error: validation.error });
                console.log(`  ERROR: ${validation.error}`);
                return;
            }

            console.log(`  Path is valid, scanning for files...`);
            const pathFiles = this.getAllFiles(p, []);
            allFiles.push(...pathFiles);
            console.log(`  Found ${pathFiles.length} matching files in this path`);
        });

        console.log(`\nTotal files found: ${allFiles.length}`);

        if (allFiles.length === 0) {
            console.log('No files found to check against database');
            console.log('=== END FINDING MISSING FILES ===\n');
            return {
                missingFiles: [],
                scanErrors,
                totalScanned: 0,
                totalMissing: 0
            };
        }

        // Find files that are not in the database
        const missingFiles = [];
        allFiles.forEach((filePath, index) => {
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
                console.log(`  Processed ${index + 1}/${allFiles.length} files`);
            }
        });

        console.log('=== MISSING FILES CHECK COMPLETED ===');
        console.log(`Files scanned: ${allFiles.length}`);
        console.log(`Files in database: ${dbFileNames.length}`);
        console.log(`Missing files found: ${missingFiles.length}`);
        console.log(`Scan errors: ${scanErrors.length}`);
        console.log(`Check completed at: ${new Date().toISOString()}`);
        console.log('=== END FINDING MISSING FILES ===\n');

        return {
            missingFiles,
            scanErrors,
            totalScanned: allFiles.length,
            totalMissing: missingFiles.length,
            totalInDatabase: dbFileNames.length
        };
    }

    // Compute SHA256 hash of a file
    async computeFileHash(filePath) {
        console.log('=== COMPUTING FILE HASH ===');
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`File path: ${filePath}`);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log(`ERROR: File does not exist: ${filePath}`);
            throw new Error('File not found');
        }

        try {
            // Read file and compute SHA256 hash
            const fileBuffer = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            console.log(`SUCCESS: Hash computed for ${path.basename(filePath)}`);
            console.log(`Hash: ${hash}`);
            console.log(`=== HASH COMPUTATION COMPLETED ===`);
            console.log(`Hash computation completed at: ${new Date().toISOString()}`);
            console.log(`=== END HASH COMPUTATION ===\n`);

            return { hash };
        } catch (error) {
            console.log(`ERROR: Hash computation failed: ${error.message}`);
            throw new Error('Hash computation failed: ' + error.message);
        }
    }

    // Fix file by renaming and updating database
    async fixFile(modelVersionId, filePath, dbFileName) {
        console.log('=== FIXING FILE ===');
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`ModelVersionId: ${modelVersionId}`);
        console.log(`File path: ${filePath}`);
        console.log(`DB filename: ${dbFileName}`);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            console.log(`ERROR: File does not exist: ${filePath}`);
            throw new Error('File not found on disk');
        }

        // Get directory and extension from the original file
        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);

        // Construct new file path with DB filename
        const newFilePath = path.join(dir, dbFileName);

        // Check if target file already exists
        if (fs.existsSync(newFilePath)) {
            console.log(`ERROR: Target file already exists: ${newFilePath}`);
            throw new Error('Target file already exists');
        }

        try {
            // Rename the file
            fs.renameSync(filePath, newFilePath);
            console.log(`SUCCESS: Renamed file from ${filePath} to ${newFilePath}`);
            console.log(`=== FIX COMPLETED ===`);
            console.log(`Fix completed at: ${new Date().toISOString()}`);
            console.log(`=== END FIX ===\n`);

            return {
                success: true,
                message: 'File renamed successfully',
                oldPath: filePath,
                newPath: newFilePath,
                dbFileName: dbFileName
            };
        } catch (renameErr) {
            console.log(`ERROR: File rename failed: ${renameErr.message}`);
            throw new Error('File rename failed: ' + renameErr.message);
        }
    }
}

module.exports = new FileService(); 