const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { httpAgent, httpsAgent } = require('../config/agents');
const { DOWNLOAD_CONFIG } = require('../config/constants');
const databaseService = require('./databaseService');

class DownloadService {
    // Download model file and update DB
    async downloadModelFile(url, fileName, baseModel, modelVersionId) {
        const targetDir = path.join(DOWNLOAD_CONFIG.baseDir, baseModel);
        let writer = null;
        
        try {
            // Validate inputs
            if (!url || !fileName || !baseModel || !modelVersionId) {
                throw new Error('Missing required parameters: url, fileName, baseModel, modelVersionId');
            }

            // Ensure directory exists
            if (!fs.existsSync(targetDir)) {
                try {
                    fs.mkdirSync(targetDir, { recursive: true });
                } catch (dirError) {
                    throw new Error(`Failed to create directory ${targetDir}: ${dirError.message}`);
                }
            }
            
            const filePath = path.join(targetDir, fileName);
            
            // Check if file already exists
            if (fs.existsSync(filePath)) {
                console.log(`File already exists: ${fileName}`);
                // Update DB to mark as downloaded
                await databaseService.updateModelAsDownloaded(modelVersionId, filePath);
                console.log(`DB updated for existing file: ${fileName}`);
                return;
            }
            
            // Download file with optimized settings
            const response = await axios({
                method: 'get',
                url,
                responseType: 'stream',
                timeout: DOWNLOAD_CONFIG.timeout,
                maxRedirects: 5,
                headers: {
                    'User-Agent': DOWNLOAD_CONFIG.userAgent
                },
                httpAgent: httpAgent,
                httpsAgent: httpsAgent
            });
            
            const totalLength = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;
            let lastLoggedPercent = 0;
            const startTime = Date.now();
            
            writer = fs.createWriteStream(filePath);
            
            // Set up progress tracking
            response.data.on('data', (chunk) => {
                downloaded += chunk.length;
                if (totalLength) {
                    const percent = Math.floor((downloaded / totalLength) * 100);
                    if (percent >= lastLoggedPercent + 10 || percent === 100) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const speed = downloaded / elapsed / 1024 / 1024; // MB/s
                        console.log(`Downloading ${fileName}: ${percent}% (${(downloaded/1024/1024).toFixed(1)}MB/${(totalLength/1024/1024).toFixed(1)}MB) - ${speed.toFixed(2)} MB/s`);
                        lastLoggedPercent = percent;
                    }
                }
            });
            
            // Handle download completion
            await new Promise((resolve, reject) => {
                let error = null;
                
                writer.on('error', err => {
                    error = err;
                    console.error(`Write error for ${fileName}:`, err.message);
                    writer.close();
                    reject(new Error(`File write error: ${err.message}`));
                });
                
                response.data.on('error', err => {
                    error = err;
                    console.error(`Download error for ${fileName}:`, err.message);
                    writer.close();
                    reject(new Error(`Download error: ${err.message}`));
                });
                
                writer.on('close', () => {
                    if (!error) {
                        const totalTime = (Date.now() - startTime) / 1000;
                        const avgSpeed = downloaded / totalTime / 1024 / 1024; // MB/s
                        console.log(`Download completed: ${fileName} in ${totalTime.toFixed(1)}s (${avgSpeed.toFixed(2)} MB/s avg)`);
                        resolve();
                    }
                });
                
                response.data.pipe(writer);
            });
            
            // Update DB asynchronously
            await databaseService.updateModelAsDownloaded(modelVersionId, filePath);
            console.log(`DB updated successfully for ${fileName}`);
            
        } catch (err) {
            console.error(`Download failed for ${fileName}:`, err.message);
            
            // Clean up partial file if it exists
            if (writer && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up partial file: ${fileName}`);
                } catch (cleanupError) {
                    console.error(`Failed to clean up partial file ${fileName}:`, cleanupError.message);
                }
            }
            
            // Update DB to mark as failed (status 3)
            try {
                await databaseService.markModelAsFailed(modelVersionId);
            } catch (dbError) {
                console.error(`Failed to mark model as failed in DB:`, dbError.message);
            }
            
            // Re-throw the error for the queue to handle
            throw err;
        }
    }
}

module.exports = new DownloadService(); 