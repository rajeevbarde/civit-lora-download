const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { httpAgent, httpsAgent } = require('../config/agents');
const { DOWNLOAD_CONFIG } = require('../config/constants');
const databaseService = require('./databaseService');
const logger = require('../utils/logger');

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

            logger.userAction('Download started', { fileName, baseModel, modelVersionId });

            // Ensure directory exists
            if (!fs.existsSync(targetDir)) {
                try {
                    fs.mkdirSync(targetDir, { recursive: true });
                    logger.debug('Created directory', { path: targetDir });
                } catch (dirError) {
                    throw new Error(`Failed to create directory ${targetDir}: ${dirError.message}`);
                }
            }
            
            let filePath = path.join(targetDir, fileName);
            let usedSubfolder = false;
            // Check if file already exists
            if (fs.existsSync(filePath)) {
                // Create a subfolder named after modelVersionId
                const subfolder = path.join(targetDir, String(modelVersionId));
                if (!fs.existsSync(subfolder)) {
                    fs.mkdirSync(subfolder);
                }
                filePath = path.join(subfolder, fileName);
                usedSubfolder = true;
                // If file also exists in subfolder, treat as already downloaded
                if (fs.existsSync(filePath)) {
                    logger.info('File already exists in subfolder', { fileName, modelVersionId });
                    await databaseService.updateModelAsDownloaded(modelVersionId, filePath);
                    logger.info('DB updated for existing file in subfolder', { fileName });
                    return;
                }
            }
            
            // Append token to CivitAI URLs
            if (url.includes('civitai.com')) {
                const token = process.env.CIVITAI_TOKEN;
                if (token) {
                    url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
                }
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
                        logger.download(fileName, {
                            percent,
                            downloaded: `${(downloaded/1024/1024).toFixed(1)}MB`,
                            total: `${(totalLength/1024/1024).toFixed(1)}MB`,
                            speed: `${speed.toFixed(2)} MB/s`
                        });
                        lastLoggedPercent = percent;
                    }
                }
            });
            
            // Handle download completion
            await new Promise((resolve, reject) => {
                let error = null;
                
                writer.on('error', err => {
                    error = err;
                    logger.error('Write error during download', { fileName, error: err.message });
                    writer.close();
                    reject(new Error(`File write error: ${err.message}`));
                });
                
                response.data.on('error', err => {
                    error = err;
                    logger.error('Download error', { fileName, error: err.message });
                    writer.close();
                    reject(new Error(`Download error: ${err.message}`));
                });
                
                writer.on('close', () => {
                    if (!error) {
                        const totalTime = (Date.now() - startTime) / 1000;
                        const avgSpeed = downloaded / totalTime / 1024 / 1024; // MB/s
                        logger.userAction('Download completed', {
                            fileName,
                            duration: `${totalTime.toFixed(1)}s`,
                            avgSpeed: `${avgSpeed.toFixed(2)} MB/s`
                        });
                        logger.logTimeTaken('Download', startTime, { fileName });
                        resolve();
                    }
                });
                
                response.data.pipe(writer);
            });
            
            // Update DB asynchronously
            await databaseService.updateModelAsDownloaded(modelVersionId, filePath);
            logger.info('DB updated successfully', { fileName, usedSubfolder });
            
        } catch (err) {
            logger.userAction('Download failed', { fileName, error: err.message });
            
            // Clean up partial file if it exists
            if (writer && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    logger.info('Cleaned up partial file', { fileName });
                } catch (cleanupError) {
                    logger.error('Failed to clean up partial file', { fileName, error: cleanupError.message });
                }
            }
            
            // Update DB to mark as failed (status 3)
            try {
                await databaseService.markModelAsFailed(modelVersionId);
            } catch (dbError) {
                logger.error('Failed to mark model as failed in DB', { modelVersionId, error: dbError.message });
            }
            
            // Re-throw the error for the queue to handle
            throw err;
        }
    }
}

module.exports = new DownloadService(); 