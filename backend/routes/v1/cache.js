const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const https = require('https');
const http = require('http');

// Cache images endpoint
router.post('/images', async (req, res) => {
    try {
        const modelJsonPath = path.join(__dirname, '../../data/modeljson');
        
        // Process all modelId folders
        const jsonFiles = await scanForJsonFiles(modelJsonPath);
        
        // Download images from each JSON file
        const downloadResults = await downloadImagesFromJsonFiles(jsonFiles, modelJsonPath, req.signal);
        
        res.json({
            success: true,
            message: `Processed ${jsonFiles.length} JSON files. ${downloadResults.successCount} images downloaded successfully, ${downloadResults.errorCount} failed.`,
            files: jsonFiles,
            downloadResults,
            progress: downloadResults.details
        });
        
    } catch (error) {
        // Check if the error is due to cancellation
        if (error.name === 'AbortError') {
            res.status(499).json({
                success: false,
                message: 'Image caching cancelled',
                cancelled: true
            });
        } else {
            logger.error('Error in cache images:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cache images',
                error: error.message
            });
        }
    }
});

// Recursive function to scan for JSON files
async function scanForJsonFiles(basePath, maxModelIds = null) {
    const jsonFiles = [];
    
    try {
        // Read the base directory
        const items = await fs.readdir(basePath);
        let processedModelIds = 0;
        
        for (const item of items) {
            // Limit to first N modelId folders if specified
            if (maxModelIds && processedModelIds >= maxModelIds) {
                break;
            }
            
            const itemPath = path.join(basePath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
                // This is a modelId folder, scan inside it
                const modelVersionItems = await fs.readdir(itemPath);
                
                for (const versionItem of modelVersionItems) {
                    const versionPath = path.join(itemPath, versionItem);
                    const versionStats = await fs.stat(versionPath);
                    
                    if (versionStats.isDirectory()) {
                        // This is a modelVersionId folder, look for JSON files
                        const files = await fs.readdir(versionPath);
                        
                        for (const file of files) {
                            if (file.endsWith('.json')) {
                                // Check if filename matches the pattern: modelId_modelVersionId.json
                                const expectedFilename = `${item}_${versionItem}.json`;
                                if (file === expectedFilename) {
                                    jsonFiles.push({
                                        filename: file,
                                        modelId: item,
                                        modelVersionId: versionItem,
                                        fullPath: path.join(versionPath, file)
                                    });
                                }
                            }
                        }
                    }
                }
                processedModelIds++;
            }
        }
        
        return jsonFiles;
        
    } catch (error) {
        logger.error('Error scanning directory:', error);
        throw error;
    }
}

// Function to download images from JSON files
async function downloadImagesFromJsonFiles(jsonFiles, basePath, abortSignal) {
    const results = {
        successCount: 0,
        errorCount: 0,
        details: []
    };
    
    for (const jsonFile of jsonFiles) {
        // Check for cancellation
        if (abortSignal && abortSignal.aborted) {
            throw new Error('Operation cancelled');
        }
        try {
            console.log(`Processing JSON file: ${jsonFile.filename}`);
            
            // Read the JSON file
            const jsonContent = await fs.readFile(jsonFile.fullPath, 'utf8');
            const jsonData = JSON.parse(jsonContent);
            
            // Check if images array exists
            if (!jsonData.images || !Array.isArray(jsonData.images)) {
                console.log(`No images array found in ${jsonFile.filename}`);
                continue;
            }
            
            // Get the directory where JSON file is located
            const jsonDir = path.dirname(jsonFile.fullPath);
            
            // Download each image
            for (let i = 0; i < jsonData.images.length; i++) {
                // Check for cancellation
                if (abortSignal && abortSignal.aborted) {
                    throw new Error('Operation cancelled');
                }
                
                const image = jsonData.images[i];
                
                if (!image.url) {
                    console.log(`No URL found for image ${i} in ${jsonFile.filename}`);
                    continue;
                }
                
                try {
                    // Extract filename from URL
                    const urlParts = image.url.split('/');
                    const originalFilename = urlParts[urlParts.length - 1];
                    
                    // Check if file is an image (skip videos and other file types)
                    const fileExtension = path.extname(originalFilename).toLowerCase();
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif'];
                    
                    if (!imageExtensions.includes(fileExtension)) {
                        console.log(`⏭️  Skipped (not an image): ${originalFilename}`);
                        results.successCount++;
                        results.details.push({
                            jsonFile: jsonFile.filename,
                            imageFile: originalFilename,
                            status: 'skipped',
                            reason: 'not an image'
                        });
                        continue;
                    }
                    
                    // Create local file path
                    const localFilePath = path.join(jsonDir, originalFilename);
                    
                    // Check if file already exists
                    try {
                        await fs.access(localFilePath);
                        console.log(`⏭️  Skipped (already exists): ${originalFilename}`);
                        results.successCount++;
                        results.details.push({
                            jsonFile: jsonFile.filename,
                            imageFile: originalFilename,
                            status: 'skipped',
                            reason: 'already exists'
                        });
                        continue;
                    } catch (accessError) {
                        // File doesn't exist, proceed with download
                    }
                    
                    // Download the image
                    await downloadImage(image.url, localFilePath, abortSignal);
                    
                    console.log(`✅ Successfully downloaded: ${originalFilename}`);
                    results.successCount++;
                    results.details.push({
                        jsonFile: jsonFile.filename,
                        imageFile: originalFilename,
                        status: 'success'
                    });
                    
                } catch (downloadError) {
                    console.log(`❌ Failed to download image ${i} from ${jsonFile.filename}: ${downloadError.message}`);
                    results.errorCount++;
                    results.details.push({
                        jsonFile: jsonFile.filename,
                        imageFile: `image_${i}`,
                        status: 'error',
                        error: downloadError.message
                    });
                }
            }
            
        } catch (error) {
            console.log(`❌ Error processing ${jsonFile.filename}: ${error.message}`);
            results.errorCount++;
            results.details.push({
                jsonFile: jsonFile.filename,
                status: 'error',
                error: error.message
            });
        }
    }
    
    return results;
}

// Function to download a single image
function downloadImage(url, filePath, abortSignal) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        const request = protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            const fileStream = fsSync.createWriteStream(filePath);
            response.pipe(fileStream);
            
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
            
            fileStream.on('error', (error) => {
                fsSync.unlink(filePath, () => {}); // Delete the file if it exists
                reject(error);
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
        
        // Handle abort signal
        if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
                request.destroy();
                reject(new Error('Request cancelled'));
            });
        }
    });
}

// Get JSON files for processing (without downloading)
router.get('/json-files', async (req, res) => {
    try {
        const modelJsonPath = path.join(__dirname, '../../data/modeljson');
        const jsonFiles = await scanForJsonFiles(modelJsonPath);
        
        res.json({
            success: true,
            files: jsonFiles
        });
        
    } catch (error) {
        logger.error('Error getting JSON files:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get JSON files',
            error: error.message
        });
    }
});

// Process a single JSON file
router.post('/process-json-file', async (req, res) => {
    try {
        const { jsonFile } = req.body;
        const modelJsonPath = path.join(__dirname, '../../data/modeljson');
        
        if (!jsonFile) {
            return res.status(400).json({
                success: false,
                message: 'JSON file data is required'
            });
        }
        
        const results = await downloadImagesFromJsonFiles([jsonFile], modelJsonPath, req.signal);
        
        res.json({
            success: true,
            results: results.details
        });
        
    } catch (error) {
        if (error.name === 'AbortError') {
            res.status(499).json({
                success: false,
                message: 'Processing cancelled',
                cancelled: true
            });
        } else {
            logger.error('Error processing JSON file:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process JSON file',
                error: error.message
            });
        }
    }
});

module.exports = router; 