const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { dbPool } = require('../config/database');
const logger = require('../utils/logger');

class MetadataService {
    constructor() {
        this.baseDir = path.join(__dirname, '..', 'data', 'modeljson');
        this.civitaiToken = process.env.CIVITAI_TOKEN;
        this.civitaiBaseUrl = 'https://civitai.com/api/v1';
    }

    // Step 1: Fetch metadata from CivitAI API and save to folders
    async fetchAndSaveMetadata() {
        const startTime = Date.now();
        logger.userAction('Metadata fetching started');

        try {
            if (!this.civitaiToken) {
                throw new Error('CIVITAI_TOKEN not found in environment variables');
            }

            // Get all registered LoRAs (downloaded with file_path)
            const registeredLoras = await this.getRegisteredLoras();
            
            if (registeredLoras.length === 0) {
                logger.userAction('No registered LoRAs found for metadata fetching');
                return {
                    success: true,
                    message: 'No registered LoRAs found',
                    fetchedCount: 0,
                    totalLoras: 0,
                    progress: []
                };
            }

            let fetchedCount = 0;
            let errors = [];
            let notFoundErrors = [];
            let networkErrors = [];
            let authErrors = [];
            let otherErrors = [];
            let updatedCount = 0;
            let progress = [];

            // Process each LoRA
            for (const lora of registeredLoras) {
                const progressItem = {
                    modelId: lora.modelId,
                    modelVersionId: lora.modelVersionId,
                    modelName: lora.modelName,
                    modelVersionName: lora.modelVersionName,
                    status: 'fetching',
                    message: 'Fetching metadata from CivitAI...',
                    timestamp: new Date().toISOString()
                };
                progress.push(progressItem);
                
                try {
                    console.log(`📥 Fetching metadata for model ${lora.modelId}, version ${lora.modelVersionId}...`);

                    // Always fetch fresh data from API (overwrite existing files)
                    const modelDir = path.join(this.baseDir, lora.modelId.toString());
                    const versionDir = path.join(modelDir, lora.modelVersionId.toString());
                    const jsonFileName = `${lora.modelId}_${lora.modelVersionId}.json`;
                    const jsonFilePath = path.join(versionDir, jsonFileName);
                    
                    // Fetch metadata from CivitAI API
                    const metadata = await this.fetchCivitaiMetadata(lora.modelVersionId);
                    
                    if (metadata) {
                        // Ensure directories exist
                        if (!fs.existsSync(modelDir)) {
                            fs.mkdirSync(modelDir, { recursive: true });
                        }
                        if (!fs.existsSync(versionDir)) {
                            fs.mkdirSync(versionDir, { recursive: true });
                        }

                        // Always write/overwrite the JSON file
                        fs.writeFileSync(jsonFilePath, JSON.stringify(metadata, null, 2));
                        
                        // Update database with full relative project path
                        const projectRoot = path.join(__dirname, '..', '..'); // Go up to project root
                        const fullRelativePath = path.relative(projectRoot, jsonFilePath).replace(/\\/g, '/');
                        await this.updateModelVersionJsonPath(lora.modelVersionId, fullRelativePath);
                        
                        // Extract trainedWords and update trigger_words column
                        const trainedWords = this.extractTrainedWords(metadata);
                        await this.updateTriggerWords(lora.modelVersionId, trainedWords);
                        
                        fetchedCount++;
                        updatedCount++;
                        
                        // Update progress item
                        progressItem.status = 'success';
                        progressItem.message = `✅ Metadata saved: ${jsonFileName}`;
                        progressItem.triggerWords = trainedWords;
                        
                        console.log(`✅ Success: ${lora.modelId}_${lora.modelVersionId}.json`);
                    }
                } catch (error) {
                    const errorMsg = `Model ${lora.modelId}, version ${lora.modelVersionId}: ${error.message}`;
                    console.log(`❌ Failed: ${lora.modelId}_${lora.modelVersionId} - ${error.message}`);
                    logger.error(errorMsg);
                    errors.push(errorMsg);
                    
                    // Update progress item
                    progressItem.status = 'error';
                    progressItem.message = `❌ Failed: ${error.message}`;
                    
                    // Categorize errors for better reporting
                    if (error.message.includes('not found') || error.message.includes('404')) {
                        notFoundErrors.push(errorMsg);
                    } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                        authErrors.push(errorMsg);
                    } else if (error.message.includes('Network error') || error.message.includes('timeout')) {
                        networkErrors.push(errorMsg);
                    } else {
                        otherErrors.push(errorMsg);
                    }
                }
            }

            logger.userAction('Metadata fetching completed', { 
                fetchedCount, 
                updatedCount,
                totalLoras: registeredLoras.length,
                errors: errors.length 
            });
            logger.logTimeTaken('Metadata fetching', startTime, { 
                fetchedCount, 
                totalLoras: registeredLoras.length 
            });

            // Build detailed error summary
            let errorSummary = '';
            if (errors.length > 0) {
                const parts = [];
                if (notFoundErrors.length > 0) parts.push(`${notFoundErrors.length} not found`);
                if (authErrors.length > 0) parts.push(`${authErrors.length} auth errors`);
                if (networkErrors.length > 0) parts.push(`${networkErrors.length} network errors`);
                if (otherErrors.length > 0) parts.push(`${otherErrors.length} other errors`);
                errorSummary = ` (${parts.join(', ')})`;
            }

            return {
                success: true,
                message: `Fetched metadata for ${fetchedCount} LoRAs and updated ${updatedCount} database records${errorSummary}`,
                fetchedCount,
                updatedCount,
                totalLoras: registeredLoras.length,
                progress: progress,
                errors: errors.length > 0 ? errors : undefined,
                errorSummary: {
                    total: errors.length,
                    notFound: notFoundErrors.length,
                    auth: authErrors.length,
                    network: networkErrors.length,
                    other: otherErrors.length
                }
            };

        } catch (error) {
            logger.error('Error fetching metadata:', error);
            throw new Error(`Failed to fetch metadata: ${error.message}`);
        }
    }

    // Fetch metadata from CivitAI API
    async fetchCivitaiMetadata(modelVersionId) {
        const url = `${this.civitaiBaseUrl}/model-versions/${modelVersionId}?token=${this.civitaiToken}`;
        
        try {
            const response = await axios.get(url, {
                timeout: 30000, // 30 second timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (response.status === 200 && response.data) {
                return response.data;
            } else {
                throw new Error(`API returned status ${response.status}`);
            }
        } catch (error) {
            if (error.response) {
                // API error response with specific status codes
                const status = error.response.status;
                const statusText = error.response.statusText;
                
                switch (status) {
                    case 404:
                        throw new Error(`Model version ${modelVersionId} not found on CivitAI (404)`);
                    case 401:
                        throw new Error(`Unauthorized: Invalid or missing CivitAI token (401)`);
                    case 403:
                        throw new Error(`Forbidden: Access denied to model version ${modelVersionId} (403)`);
                    case 429:
                        throw new Error(`Rate limited: Too many requests to CivitAI API (429)`);
                    case 500:
                        throw new Error(`CivitAI server error (500)`);
                    case 502:
                    case 503:
                    case 504:
                        throw new Error(`CivitAI service temporarily unavailable (${status})`);
                    default:
                        throw new Error(`CivitAI API error: ${status} - ${statusText}`);
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new Error(`Request timeout for model version ${modelVersionId}`);
            } else if (error.code === 'ENOTFOUND') {
                throw new Error(`Network error: Could not resolve CivitAI hostname`);
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error(`Network error: Connection refused to CivitAI`);
            } else {
                throw new Error(`Network error for model version ${modelVersionId}: ${error.message}`);
            }
        }
    }

    // Extract trainedWords from metadata JSON
    extractTrainedWords(metadata) {
        try {
            if (metadata && metadata.trainedWords && Array.isArray(metadata.trainedWords)) {
                const words = metadata.trainedWords.filter(word => word && word.trim() !== '');
                return words.length > 0 ? words.join(', ') : 'NO_TRIGGER_WORDS';
            }
            return 'NO_TRIGGER_WORDS';
        } catch (error) {
            logger.error('Error extracting trainedWords:', error);
            return 'NO_TRIGGER_WORDS';
        }
    }

    // Update trigger_words in database
    async updateTriggerWords(modelVersionId, triggerWords) {
        const query = `
            UPDATE ALLCivitData 
            SET trigger_words = ? 
            WHERE modelVersionId = ?
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            const result = await dbPool.runUpdate(connection, query, [triggerWords, modelVersionId]);
            
            if (result.changes === 0) {
                throw new Error(`No record found for modelVersionId ${modelVersionId}`);
            }
            
            return result;
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Update modelversion_jsonpath in database
    async updateModelVersionJsonPath(modelVersionId, jsonPath) {
        const query = `
            UPDATE ALLCivitData 
            SET modelversion_jsonpath = ? 
            WHERE modelVersionId = ?
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            const result = await dbPool.runUpdate(connection, query, [jsonPath, modelVersionId]);
            
            if (result.changes === 0) {
                throw new Error(`No record found for modelVersionId ${modelVersionId}`);
            }
            
            return result;
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Create folder structure for registered LoRAs (Step 2)
    async createModelFolders() {
        const startTime = Date.now();
        logger.userAction('Metadata folder creation started');

        try {
            // Ensure base directory exists
            if (!fs.existsSync(this.baseDir)) {
                fs.mkdirSync(this.baseDir, { recursive: true });
                logger.debug('Created base modeljson directory', { path: this.baseDir });
            }

            // Get all registered LoRAs (downloaded with file_path)
            const registeredLoras = await this.getRegisteredLoras();
            
            if (registeredLoras.length === 0) {
                logger.userAction('No registered LoRAs found for folder creation');
                return {
                    success: true,
                    message: 'No registered LoRAs found',
                    createdFolders: 0,
                    totalLoras: 0
                };
            }

            let createdFolders = 0;
            let errors = [];

            // Create folders for each LoRA
            for (const lora of registeredLoras) {
                try {
                    const modelDir = path.join(this.baseDir, lora.modelId.toString());
                    const versionDir = path.join(modelDir, lora.modelVersionId.toString());

                    // Create model directory if it doesn't exist
                    if (!fs.existsSync(modelDir)) {
                        fs.mkdirSync(modelDir, { recursive: true });
                        logger.debug('Created model directory', { modelId: lora.modelId, path: modelDir });
                    }

                    // Create model version directory if it doesn't exist
                    if (!fs.existsSync(versionDir)) {
                        fs.mkdirSync(versionDir, { recursive: true });
                        logger.debug('Created model version directory', { 
                            modelId: lora.modelId, 
                            modelVersionId: lora.modelVersionId, 
                            path: versionDir 
                        });
                        createdFolders++;
                    }
                } catch (error) {
                    const errorMsg = `Failed to create folders for model ${lora.modelId}, version ${lora.modelVersionId}: ${error.message}`;
                    logger.error(errorMsg);
                    errors.push(errorMsg);
                }
            }

            logger.userAction('Metadata folder creation completed', { 
                createdFolders, 
                totalLoras: registeredLoras.length,
                errors: errors.length 
            });
            logger.logTimeTaken('Metadata folder creation', startTime, { 
                createdFolders, 
                totalLoras: registeredLoras.length 
            });

            return {
                success: true,
                message: `Created ${createdFolders} folders for ${registeredLoras.length} registered LoRAs`,
                createdFolders,
                totalLoras: registeredLoras.length,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            logger.error('Error creating model folders:', error);
            throw new Error(`Failed to create model folders: ${error.message}`);
        }
    }

    // Get all registered LoRAs that don't have metadata yet
    async getRegisteredLoras() {
        const query = `
            SELECT modelId, modelVersionId, modelName, modelVersionName
            FROM ALLCivitData
            WHERE isDownloaded = 1 AND file_path IS NOT NULL AND modelversion_jsonpath IS NULL
            ORDER BY modelId, modelVersionId
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runQuery(connection, query);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Fetch metadata for a single LoRA
    async fetchSingleLoRAMetadata(modelId, modelVersionId) {
        try {
            // Get LoRA details
            const query = `
                SELECT modelId, modelVersionId, modelName, modelVersionName
                FROM ALLCivitData
                WHERE modelId = ? AND modelVersionId = ? AND isDownloaded = 1 AND file_path IS NOT NULL
            `;

            let connection;
            try {
                connection = await dbPool.getConnection();
                const lora = await dbPool.runQuerySingle(connection, query, [modelId, modelVersionId]);
                
                if (!lora) {
                    throw new Error(`LoRA not found or not eligible for metadata fetching`);
                }

                // Fetch metadata from CivitAI API
                const metadata = await this.fetchCivitaiMetadata(modelVersionId);
                
                if (metadata) {
                    // Ensure directories exist
                    const modelDir = path.join(this.baseDir, lora.modelId.toString());
                    const versionDir = path.join(modelDir, lora.modelVersionId.toString());
                    
                    if (!fs.existsSync(modelDir)) {
                        fs.mkdirSync(modelDir, { recursive: true });
                    }
                    if (!fs.existsSync(versionDir)) {
                        fs.mkdirSync(versionDir, { recursive: true });
                    }

                    // Save metadata JSON file
                    const jsonFileName = `${lora.modelId}_${lora.modelVersionId}.json`;
                    const jsonFilePath = path.join(versionDir, jsonFileName);
                    fs.writeFileSync(jsonFilePath, JSON.stringify(metadata, null, 2));
                    
                    // Update database with full relative project path
                    const projectRoot = path.join(__dirname, '..', '..');
                    const fullRelativePath = path.relative(projectRoot, jsonFilePath).replace(/\\/g, '/');
                    await this.updateModelVersionJsonPath(lora.modelVersionId, fullRelativePath);
                    
                    // Extract trainedWords and update trigger_words column
                    const trainedWords = this.extractTrainedWords(metadata);
                    await this.updateTriggerWords(lora.modelVersionId, trainedWords);
                    
                    return {
                        success: true,
                        modelId: lora.modelId,
                        modelVersionId: lora.modelVersionId,
                        modelName: lora.modelName,
                        modelVersionName: lora.modelVersionName,
                        message: 'Metadata fetched successfully',
                        triggerWords: trainedWords,
                        jsonPath: fullRelativePath
                    };
                }
            } finally {
                if (connection) {
                    dbPool.releaseConnection(connection);
                }
            }
        } catch (error) {
            return {
                success: false,
                modelId: modelId,
                modelVersionId: modelVersionId,
                message: `❌ Failed: ${error.message}`,
                error: error.message
            };
        }
    }

    // Get folder structure statistics
    async getFolderStatistics() {
        try {
            if (!fs.existsSync(this.baseDir)) {
                return {
                    totalModelFolders: 0,
                    totalVersionFolders: 0,
                    baseDirExists: false
                };
            }

            const modelFolders = fs.readdirSync(this.baseDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            let totalVersionFolders = 0;
            for (const modelFolder of modelFolders) {
                const modelPath = path.join(this.baseDir, modelFolder);
                const versionFolders = fs.readdirSync(modelPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
                totalVersionFolders += versionFolders.length;
            }

            return {
                totalModelFolders: modelFolders.length,
                totalVersionFolders,
                baseDirExists: true
            };
        } catch (error) {
            logger.error('Error getting folder statistics:', error);
            throw new Error(`Failed to get folder statistics: ${error.message}`);
        }
    }

    // Download JSON metadata only (without updating database)
    async downloadJsonMetadataOnly(modelId, modelVersionId, updateDatabase = false) {
        try {
            if (!this.civitaiToken) {
                throw new Error('CIVITAI_TOKEN not found in environment variables');
            }

            // Fetch metadata from CivitAI API
            const metadata = await this.fetchCivitaiMetadata(modelVersionId);
            
            if (metadata) {
                // Ensure directories exist
                const modelDir = path.join(this.baseDir, modelId.toString());
                const versionDir = path.join(modelDir, modelVersionId.toString());
                
                if (!fs.existsSync(modelDir)) {
                    fs.mkdirSync(modelDir, { recursive: true });
                }
                if (!fs.existsSync(versionDir)) {
                    fs.mkdirSync(versionDir, { recursive: true });
                }

                // Save metadata JSON file
                const jsonFileName = `${modelId}_${modelVersionId}.json`;
                const jsonFilePath = path.join(versionDir, jsonFileName);
                fs.writeFileSync(jsonFilePath, JSON.stringify(metadata, null, 2));
                
                let result = {
                    success: true,
                    modelId: modelId,
                    modelVersionId: modelVersionId,
                    message: 'JSON metadata downloaded successfully',
                    jsonPath: jsonFilePath
                };

                // Only update database if explicitly requested
                if (updateDatabase) {
                    // Update database with full relative project path
                    const projectRoot = path.join(__dirname, '..', '..');
                    const fullRelativePath = path.relative(projectRoot, jsonFilePath).replace(/\\/g, '/');
                    await this.updateModelVersionJsonPath(modelVersionId, fullRelativePath);
                    
                    // Extract trainedWords and update trigger_words column
                    const trainedWords = this.extractTrainedWords(metadata);
                    await this.updateTriggerWords(modelVersionId, trainedWords);
                    
                    result.triggerWords = trainedWords;
                    result.databaseUpdated = true;
                }
                
                return result;
            }
        } catch (error) {
            return {
                success: false,
                modelId: modelId,
                modelVersionId: modelVersionId,
                message: `❌ Failed: ${error.message}`,
                error: error.message
            };
        }
    }
}

module.exports = new MetadataService(); 