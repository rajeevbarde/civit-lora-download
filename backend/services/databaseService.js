const { dbPool } = require('../config/database');

class DatabaseService {
    // Get models with pagination and filters
    async getModels(page = 1, limit = 20, filters = {}) {
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
        if (filters.modelVersionId) {
            baseWhere.push('modelVersionId = ?');
            params.push(filters.modelVersionId);
        }

        let whereClause = baseWhere.length ? 'WHERE ' + baseWhere.join(' AND ') : '';

        let query = `
            SELECT
                modelId, modelName, modelDescription, modelType, modelNsfw, modelNsfwLevel, modelDownloadCount,
                modelVersionId, modelVersionName, modelVersionDescription,
                basemodel, basemodeltype, modelVersionNsfwLevel, modelVersionDownloadCount,
                fileName, fileType, fileDownloadUrl, size_in_gb, publishedAt, tags, isDownloaded, file_path
            FROM ALLCivitData
            ${whereClause}
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            
            // First, get the total count with filters
            const countResult = await dbPool.runQuerySingle(connection, `SELECT COUNT(*) as total FROM ALLCivitData ${whereClause}`, params);
            
            // Then get the paginated data
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
                fileName, fileType, fileDownloadUrl, size_in_gb, publishedAt, tags, isDownloaded, file_path
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
            const rows = await dbPool.runQuery(connection, 'SELECT DISTINCT basemodel FROM ALLCivitData WHERE basemodel IS NOT NULL AND basemodel != "" ORDER BY basemodel ASC');
            const baseModels = rows.map(r => r.basemodel);
            return { baseModels };
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get summary matrix
    async getSummaryMatrix() {
        const query = `
            SELECT basemodel, modelVersionNsfwLevel, COUNT(*) as count
            FROM ALLCivitData
            WHERE basemodel IS NOT NULL AND basemodel != '' AND modelVersionNsfwLevel IS NOT NULL AND modelVersionNsfwLevel != ''
            GROUP BY basemodel, modelVersionNsfwLevel
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            const rows = await dbPool.runQuery(connection, query);
            
            const baseModels = [...new Set(rows.map(r => r.basemodel))].sort();
            const nsfwLevels = [...new Set(rows.map(r => r.modelVersionNsfwLevel))].sort();
            const matrix = nsfwLevels.map(nsfw => {
                const row = { modelVersionNsfwLevel: nsfw };
                baseModels.forEach(bm => {
                    const found = rows.find(r => r.basemodel === bm && r.modelVersionNsfwLevel === nsfw);
                    row[bm] = found ? found.count : 0;
                });
                return row;
            });
            return { baseModels, nsfwLevels, matrix };
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Get downloaded summary matrix
    async getDownloadedSummaryMatrix() {
        const query = `
            SELECT basemodel, modelVersionNsfwLevel, isDownloaded, COUNT(*) as count
            FROM ALLCivitData
            WHERE basemodel IS NOT NULL AND basemodel != '' AND modelVersionNsfwLevel IS NOT NULL AND modelVersionNsfwLevel != ''
                  AND isDownloaded = 1
            GROUP BY basemodel, modelVersionNsfwLevel, isDownloaded
        `;

        let connection;
        try {
            connection = await dbPool.getConnection();
            const rows = await dbPool.runQuery(connection, query);
            
            const baseModels = [...new Set(rows.map(r => r.basemodel))].sort();
            const nsfwLevels = [...new Set(rows.map(r => r.modelVersionNsfwLevel))].sort();
            const matrix = nsfwLevels.map(nsfw => {
                const row = { modelVersionNsfwLevel: nsfw };
                baseModels.forEach(bm => {
                    const found = rows.find(r => r.basemodel === bm && r.modelVersionNsfwLevel === nsfw && r.isDownloaded === 1);
                    row[bm] = found ? found.count : 0;
                });
                return row;
            });
            return { baseModels, nsfwLevels, matrix };
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

    // Get downloaded files for validation
    async getDownloadedFiles() {
        const query = `
            SELECT fileName, file_path, modelVersionId
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
            return await dbPool.runUpdate(connection, 'UPDATE ALLCivitData SET isDownloaded = 1, file_path = ? WHERE modelVersionId = ?', [filePath, modelVersionId]);
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
            return await dbPool.runUpdate(connection, 'UPDATE ALLCivitData SET isDownloaded = 3 WHERE modelVersionId = ?', [modelVersionId]);
        } finally {
            if (connection) {
                dbPool.releaseConnection(connection);
            }
        }
    }

    // Batch update files as downloaded
    async batchUpdateFilesAsDownloaded(files) {
        let connection;
        try {
            connection = await dbPool.getConnection();
            
            let updated = 0;
            let errors = [];

            for (const item of files) {
                try {
                    await dbPool.runUpdate(connection, 'UPDATE ALLCivitData SET isDownloaded = ?, file_path = ? WHERE fileName = ?', [item.isDownloaded, item.fullPath, item.dbFileName]);
                    updated++;
                } catch (error) {
                    errors.push({ fileName: item.dbFileName, error: error.message });
                }
            }

            return { updated, errors };
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
}

module.exports = new DatabaseService(); 