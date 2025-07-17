const { dbPool } = require('../config/database');
const logger = require('../utils/logger');

class DatabaseService {
    // Get models with pagination and filters
    async getModels(page = 1, limit = 20, filters = {}, searchQuery = null) {
        const offset = (page - 1) * limit;
        let baseWhere = [];
        let params = [];

        if (filters.basemodel) {
            baseWhere.push('basemodel = ?');
            params.push(filters.basemodel);
        }
        if (filters.isDownloaded !== undefined && filters.isDownloaded !== "") {
            baseWhere.push('isDownloaded = ?');
            params.push(Number(filters.isDownloaded));
        }
        if (filters.modelNsfw !== undefined && filters.modelNsfw !== "") {
            baseWhere.push('modelNsfw = ?');
            params.push(Number(filters.modelNsfw));
        }
        if (filters.versionNsfwLevelRange !== undefined && filters.versionNsfwLevelRange !== "") {
            if (filters.versionNsfwLevelRange === "0") {
                baseWhere.push('modelVersionNsfwLevel = 0');
            } else if (filters.versionNsfwLevelRange.includes('-')) {
                const [min, max] = filters.versionNsfwLevelRange.split('-').map(Number);
                baseWhere.push('modelVersionNsfwLevel >= ? AND modelVersionNsfwLevel <= ?');
                params.push(min, max);
            }
        }

        // Add search condition if provided (minimum 3 characters)
        if (searchQuery && searchQuery.length >= 3) {
            baseWhere.push('(tags LIKE ? COLLATE NOCASE OR tags LIKE ? COLLATE NOCASE OR tags LIKE ? COLLATE NOCASE)');
            const exactMatch = searchQuery;
            const startsWith = `${searchQuery}%`;
            const contains = `%${searchQuery}%`;
            params.push(exactMatch, startsWith, contains);
        }

        let whereClause = baseWhere.length ? 'WHERE ' + baseWhere.join(' AND ') : '';

        let query = `
            SELECT
                modelId, modelName, modelDescription, modelType, modelNsfw, modelNsfwLevel, modelDownloadCount,
                modelVersionId, modelVersionName, modelVersionDescription,
                basemodel, basemodeltype, modelVersionNsfwLevel, modelVersionDownloadCount,
                fileName, fileType, fileDownloadUrl, size_in_kb, publishedAt, tags, isDownloaded, file_path
            FROM ALLCivitData
            ${whereClause}
            ORDER BY modelVersionDownloadCount DESC, modelVersionId DESC
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            
            // First, get the total count with filters
            const countResult = await dbPool.runQuerySingle(connection, `SELECT COUNT(*) as total FROM ALLCivitData ${whereClause}`, params);
            
            // Then get the paginated data with proper ordering
            const rows = await dbPool.runQuery(connection, query + ' LIMIT ? OFFSET ?', [...params, limit, offset]);
            
            return {
                total: countResult.total,
                page: page,
                limit: limit,
                data: rows
            };
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get model detail by modelVersionId
    async getModelDetail(modelVersionId) {
        const query = `
            SELECT
                modelId, modelName, modelDescription, modelType, modelNsfw, modelNsfwLevel, modelDownloadCount,
                modelVersionId, modelVersionName, modelVersionDescription,
                basemodel, basemodeltype, modelVersionNsfwLevel, modelVersionDownloadCount,
                fileName, fileType, fileDownloadUrl, size_in_kb, publishedAt, tags, isDownloaded, file_path, trigger_words, modelversion_jsonpath
            FROM ALLCivitData
            WHERE modelVersionId = ?
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runQuerySingle(connection, query, [modelVersionId]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get all base models
    async getBaseModels() {
        let connection;
        try {
            connection = await dbPool.getConnection();
            const rows = await dbPool.runQuery(
                connection,
                'SELECT basemodel, COUNT(basemodel) as count FROM ALLCivitData WHERE basemodel IS NOT NULL AND basemodel != "" GROUP BY basemodel ORDER BY count DESC'
            );
            const baseModels = rows.map(r => r.basemodel);
            return { baseModels };
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get all file names from database
    async getAllFileNames() {
        let connection;
        try {
            connection = await dbPool.getConnection();
            const rows = await dbPool.runQuery(connection, 'SELECT fileName FROM ALLCivitData WHERE fileName IS NOT NULL AND fileName != ""');
            return rows.map(r => r.fileName ? r.fileName.toLowerCase() : '');
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get file records by filenames
    async getFileRecordsByNames(fileNames) {
        if (!fileNames || fileNames.length === 0) {
            return [];
        }

        // Use LOWER() function for case-insensitive comparison
        const placeholders = fileNames.map(() => 'LOWER(?)').join(',');
        const query = `
            SELECT fileName, isDownloaded
            FROM ALLCivitData
            WHERE LOWER(fileName) IN (${placeholders})
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runQuery(connection, query, fileNames);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get downloaded files for validation
    async getDownloadedFiles() {
        const query = `
            SELECT fileName, file_path, modelVersionId, modelId, size_in_kb
            FROM ALLCivitData
            WHERE isDownloaded = 1
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

    // Get file name by modelVersionId
    async getFileNameByModelVersionId(modelVersionId) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runQuerySingle(connection, 'SELECT fileName FROM ALLCivitData WHERE modelVersionId = ?', [modelVersionId]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Update model as downloaded
    async updateModelAsDownloaded(modelVersionId, filePath) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runUpdate(connection, 'UPDATE ALLCivitData SET isDownloaded = 1, file_path = ?, last_updated = CURRENT_TIMESTAMP WHERE modelVersionId = ?', [filePath, modelVersionId]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Search models by filename (case-insensitive)
    async searchModelsByFilename(filename) {
        const query = `
            SELECT 
                modelId, modelName, modelVersionId, modelVersionName,
                fileName, fileType, fileDownloadUrl, size_in_kb,
                basemodel, basemodeltype, modelVersionNsfwLevel,
                publishedAt, isDownloaded, file_path
            FROM ALLCivitData
            WHERE fileName = ? COLLATE NOCASE
            ORDER BY modelVersionId
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runQuery(connection, query, [filename]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Mark model as failed download
    async markModelAsFailed(modelVersionId) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runUpdate(connection, 'UPDATE ALLCivitData SET isDownloaded = 3, last_updated = CURRENT_TIMESTAMP WHERE modelVersionId = ?', [modelVersionId]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get database pool statistics
    getPoolStats() {
        return dbPool.getStats();
    }

    // Batch register unregistered files
    async batchRegisterUnregisteredFiles(files) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            let updated = 0;
            let errors = [];
            console.log(`[Register] Starting batch update for ${files.length} files...`);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    console.log(`[Register] Processing file ${i + 1}/${files.length}: ${file.baseName}`);
                    const result = await dbPool.runUpdate(
                        connection,
                        'UPDATE ALLCivitData SET isDownloaded = 1, file_path = ?, last_updated = CURRENT_TIMESTAMP WHERE LOWER(fileName) = LOWER(?)',
                        [file.fullPath, file.baseName]
                    );
                    if (result && result.changes > 0) {
                        updated += result.changes;
                        console.log(`[Register] ✓ Updated ${result.changes} row(s) for: ${file.baseName}`);
                    } else {
                        console.log(`[Register] ✗ No rows updated for: ${file.baseName}`);
                    }
                } catch (err) {
                    console.error(`[Register] ✗ Error updating ${file.baseName}:`, err.message);
                    errors.push({ fileName: file.baseName, error: err.message });
                }
            }
            console.log(`[Register] Batch complete. Total updated: ${updated}, Total errors: ${errors.length}`);
            return { updated, errors };
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Register lora in database by updating isDownloaded and file_path
    async registerLoraInDatabase(modelId, modelVersionId, fileName, fullPath) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            
            // Update the database record with isDownloaded = 1 and file_path
            const result = await dbPool.runUpdate(
                connection,
                'UPDATE ALLCivitData SET isDownloaded = 1, file_path = ?, last_updated = CURRENT_TIMESTAMP WHERE modelId = ? AND modelVersionId = ? AND fileName = ?',
                [fullPath, modelId, modelVersionId, fileName]
            );
            
            if (result && result.changes > 0) {
                console.log(`[Register] ✓ Updated ${result.changes} row(s) for: ${fileName} (Model: ${modelId}, Version: ${modelVersionId})`);
                return {
                    success: true,
                    message: 'Lora registered successfully',
                    modelId: modelId,
                    modelVersionId: modelVersionId,
                    fileName: fileName,
                    fullPath: fullPath,
                    changes: result.changes
                };
            } else {
                console.log(`[Register] ✗ No rows updated for: ${fileName} (Model: ${modelId}, Version: ${modelVersionId})`);
                throw new Error('No matching record found in database');
            }
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get download matrix data - counts by base model and NSFW level for downloaded items
    async getDownloadMatrix() {
        const startTime = Date.now();
        logger.userAction('Summary loading started');
        const query = `
            SELECT 
                basemodel,
                modelVersionNsfwLevel,
                COUNT(*) as count
            FROM ALLCivitData
            WHERE isDownloaded = 1
                AND basemodel IS NOT NULL 
                AND basemodel != ''
                AND modelVersionNsfwLevel IS NOT NULL
            GROUP BY basemodel, modelVersionNsfwLevel
            ORDER BY basemodel, modelVersionNsfwLevel
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            const rows = await dbPool.runQuery(connection, query);
            
            // Define NSFW level groups
            const nsfwGroups = {
                'Safe': [0],
                'Mild': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                'Moderate': [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
                'NSFW': [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
                'Extreme NSFW': [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]
            };
            
            // Transform the data into matrix format with grouped NSFW levels
            const matrix = {};
            const baseModels = new Set();
            
            // First pass: collect all unique base models
            rows.forEach(row => {
                baseModels.add(row.basemodel);
            });
            
            // Initialize matrix with zeros for all groups
            Array.from(baseModels).forEach(baseModel => {
                matrix[baseModel] = {};
                Object.keys(nsfwGroups).forEach(groupName => {
                    matrix[baseModel][groupName] = 0;
                });
            });
            
            // Fill in the actual counts by grouping NSFW levels
            rows.forEach(row => {
                const nsfwLevel = row.modelVersionNsfwLevel;
                const count = row.count;
                
                // Find which group this NSFW level belongs to
                for (const [groupName, levels] of Object.entries(nsfwGroups)) {
                    if (levels.includes(nsfwLevel)) {
                        matrix[row.basemodel][groupName] += count;
                        break;
                    }
                }
            });
            
            logger.userAction('Summary loading completed', { baseModels: baseModels.size });
            logger.logTimeTaken('Summary loading', startTime, { baseModels: baseModels.size });
            return {
                matrix,
                baseModels: Array.from(baseModels).sort(),
                nsfwGroups: Object.keys(nsfwGroups)
            };
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    /**
     * Verifies the ALLCivitData table and its indexes/schema in the given SQLite DB file.
     * @param {string} dbPath - Path to the SQLite database file.
     * @returns {Promise<Object>} - Result object with details for file, table, schema, and indexes.
     */
    async verifyAllCivitDataSchemaAndIndexes(dbPath) {
        const fs = require('fs');
        const sqlite3 = require('sqlite3').verbose();
        const expectedIndexes = [
            { columns: ['modelVersionId'] },
            { columns: ['basemodel'] },
            { columns: ['isDownloaded'] },
            { columns: ['fileName'] },
            { columns: ['modelNsfw'] },
            { columns: ['modelVersionNsfwLevel'] },
        ];
        const expectedColumns = [
            'modelId', 'modelName', 'modelDescription', 'modelType', 'modelNsfw', 'modelNsfwLevel', 'modelDownloadCount',
            'modelVersionId', 'modelVersionName', 'modelVersionDescription', 'basemodel', 'basemodeltype', 'modelVersionNsfwLevel', 'modelVersionDownloadCount',
            'fileName', 'fileType', 'fileDownloadUrl', 'size_in_kb', 'publishedAt', 'tags', 'isDownloaded', 'file_path',
            'last_updated', 'trigger_words', 'modelversion_jsonpath'
        ];
        const result = {
            fileExists: false,
            tableExists: false,
            columnResults: [],
            indexResults: [],
            errors: [],
        };
        try {
            if (!fs.existsSync(dbPath)) {
                result.errors.push(`File does not exist: ${dbPath}`);
                return result;
            }
            result.fileExists = true;
            const db = new sqlite3.Database(dbPath);
            // Check table exists
            const tableInfo = await new Promise((resolve, reject) => {
                db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='ALLCivitData'", (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                });
            });
            if (!tableInfo || tableInfo.length === 0) {
                result.errors.push('Table ALLCivitData does not exist');
                db.close();
                return result;
            }
            result.tableExists = true;
            
            // Check table schema/columns
            const tableSchema = await new Promise((resolve, reject) => {
                db.all("PRAGMA table_info('ALLCivitData')", (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                });
            });
            
            const actualColumns = tableSchema.map(col => col.name);
            for (const expectedColumn of expectedColumns) {
                if (actualColumns.includes(expectedColumn)) {
                    result.columnResults.push({ column: expectedColumn, exists: true });
                } else {
                    result.columnResults.push({ column: expectedColumn, exists: false });
                    result.errors.push(`Missing column: ${expectedColumn}`);
                }
            }
            
            // Check indexes (focus on columns, not index name)
            const indexRows = await new Promise((resolve, reject) => {
                db.all("PRAGMA index_list('ALLCivitData')", (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                });
            });
            // Gather all index columns
            let allIndexes = [];
            for (const idxRow of indexRows) {
                const idxInfo = await new Promise((resolve, reject) => {
                    db.all(`PRAGMA index_info('${idxRow.name}')`, (err, rows) => {
                        if (err) return reject(err);
                        resolve(rows);
                    });
                });
                allIndexes.push({ name: idxRow.name, columns: idxInfo.map(r => r.name) });
            }
            for (const expected of expectedIndexes) {
                // Find any index with the same columns (order and set match)
                const found = allIndexes.find(idx => idx.columns.length === expected.columns.length && idx.columns.every((col, i) => col === expected.columns[i]));
                if (found) {
                    result.indexResults.push({ columns: expected.columns, exists: true, indexName: found.name });
                } else {
                    result.indexResults.push({ columns: expected.columns, exists: false });
                    result.errors.push(`Missing index on columns: [${expected.columns.join(', ')}]`);
                }
            }
            db.close();
        } catch (err) {
            result.errors.push(err.message);
        }
        return result;
    }

    // Get the latest publishedAt value from ALLCivitData
    async getLatestPublishedAt() {
        let connection;
        try {
            connection = await dbPool.getConnection();
            const row = await dbPool.runQuerySingle(connection, "SELECT publishedAt FROM ALLCivitData WHERE publishedAt IS NOT NULL ORDER BY publishedAt DESC LIMIT 1");
            return row ? row.publishedAt : null;
        } catch (err) {
            return null;
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get the latest updated checkpoints
    async getLatestUpdatedCheckpoints(limit = 10) {
        const query = `
            SELECT modelId, modelVersionId, modelName, modelVersionName, last_updated
            FROM ALLCivitData
            WHERE isDownloaded=1 AND file_path IS NOT NULL AND last_updated IS NOT NULL
            ORDER BY last_updated DESC
            LIMIT ?
        `;
        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runQuery(connection, query, [limit]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Reset all rows in ALLCivitData: set isDownloaded=0, file_path=null, last_updated=null
    async resetAllCivitData() {
        let connection;
        try {
            connection = await dbPool.getConnection();
            const result = await dbPool.runUpdate(
                connection,
                'UPDATE ALLCivitData SET isDownloaded = 0, file_path = NULL, last_updated = NULL'
            );
            return { success: true, changes: result.changes };
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get total row count from ALLCivitData
    async getAllCivitDataRowCount() {
        let connection;
        try {
            connection = await dbPool.getConnection();
            const result = await dbPool.runQuerySingle(connection, 'SELECT COUNT(*) as total FROM ALLCivitData');
            return result.total;
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get metadata statistics
    async getMetadataStatistics() {
        let connection;
        try {
            connection = await dbPool.getConnection();
            
            // Get total downloaded LoRAs (isDownloaded=1 and file_path is not null)
            const totalResult = await dbPool.runQuerySingle(
                connection, 
                'SELECT COUNT(*) as total FROM ALLCivitData WHERE isDownloaded = 1 AND file_path IS NOT NULL'
            );
            
            // Get count of downloaded LoRAs with metadata fetched (modelversion_jsonpath is not null)
            const metadataFetchedResult = await dbPool.runQuerySingle(
                connection, 
                'SELECT COUNT(*) as count FROM ALLCivitData WHERE isDownloaded = 1 AND file_path IS NOT NULL AND modelversion_jsonpath IS NOT NULL'
            );
            
            // Get count of downloaded LoRAs without metadata fetched (modelversion_jsonpath is null)
            const metadataNotFetchedResult = await dbPool.runQuerySingle(
                connection, 
                'SELECT COUNT(*) as count FROM ALLCivitData WHERE isDownloaded = 1 AND file_path IS NOT NULL AND modelversion_jsonpath IS NULL'
            );
            
            return {
                totalRegistered: totalResult.total,
                metadataFetched: metadataFetchedResult.count,
                metadataNotFetched: metadataNotFetchedResult.count
            };
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Mark model as failed and clear file_path (for delete-and-fail)
    async runUpdateMarkAsFailed(modelVersionId) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runUpdate(
                connection,
                'UPDATE ALLCivitData SET isDownloaded = 3, file_path = NULL, last_updated = CURRENT_TIMESTAMP WHERE modelVersionId = ? AND isDownloaded = 1 AND file_path IS NOT NULL',
                [modelVersionId]
            );
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Set model as in progress (isDownloaded = 0)
    async updateModelAsInProgress(modelVersionId) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runUpdate(connection, 'UPDATE ALLCivitData SET isDownloaded = 0, last_updated = CURRENT_TIMESTAMP WHERE modelVersionId = ?', [modelVersionId]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get all models with the same modelId (for Related LoRA)
    async getRelatedLoraByModelId(modelId) {
        const query = `
            SELECT modelId, modelVersionId, modelName, modelVersionName, publishedAt, isDownloaded, basemodel
            FROM ALLCivitData
            WHERE modelId = ?
            ORDER BY publishedAt DESC
        `;
        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runQuery(connection, query, [modelId]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Mark model as ignored
    async markModelAsIgnored(modelVersionId) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            return await dbPool.runUpdate(connection, 'UPDATE ALLCivitData SET isDownloaded = 4, last_updated = CURRENT_TIMESTAMP WHERE modelVersionId = ?', [modelVersionId]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get downloaded LoRAs (isDownloaded = 1)
    async getDownloadedLoras() {
        const query = `
            SELECT modelId, modelVersionId, modelName, modelVersionName, fileName, file_path
            FROM ALLCivitData
            WHERE isDownloaded = 1 AND file_path IS NOT NULL
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
}

module.exports = new DatabaseService(); 