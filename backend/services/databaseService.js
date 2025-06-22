const { db } = require('../config/database');

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

        return new Promise((resolve, reject) => {
            // First, get the total count with filters
            db.get(`SELECT COUNT(*) as total FROM ALLCivitData ${whereClause}`, params, (err, count) => {
                if (err) {
                    reject(err);
                    return;
                }
                // Then get the paginated data
                db.all(query + ' LIMIT ? OFFSET ?', [...params, limit, offset], (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({
                        total: count.total,
                        page: page,
                        limit: limit,
                        data: rows
                    });
                });
            });
        });
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

        return new Promise((resolve, reject) => {
            db.get(query, [modelVersionId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // Get all base models
    async getBaseModels() {
        return new Promise((resolve, reject) => {
            db.all('SELECT DISTINCT basemodel FROM ALLCivitData WHERE basemodel IS NOT NULL AND basemodel != "" ORDER BY basemodel ASC', [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const baseModels = rows.map(r => r.basemodel);
                resolve({ baseModels });
            });
        });
    }

    // Get summary matrix
    async getSummaryMatrix() {
        const query = `
            SELECT basemodel, modelVersionNsfwLevel, COUNT(*) as count
            FROM ALLCivitData
            WHERE basemodel IS NOT NULL AND basemodel != '' AND modelVersionNsfwLevel IS NOT NULL AND modelVersionNsfwLevel != ''
            GROUP BY basemodel, modelVersionNsfwLevel
        `;

        return new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
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
                resolve({ baseModels, nsfwLevels, matrix });
            });
        });
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

        return new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
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
                resolve({ baseModels, nsfwLevels, matrix });
            });
        });
    }

    // Get all file names from database
    async getAllFileNames() {
        return new Promise((resolve, reject) => {
            db.all('SELECT fileName FROM ALLCivitData WHERE fileName IS NOT NULL AND fileName != ""', [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows.map(r => r.fileName ? r.fileName.toLowerCase() : ''));
            });
        });
    }

    // Get downloaded files for validation
    async getDownloadedFiles() {
        const query = `
            SELECT fileName, file_path, modelVersionId
            FROM ALLCivitData
            WHERE isDownloaded = 1
        `;

        return new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Get file name by modelVersionId
    async getFileNameByModelVersionId(modelVersionId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT fileName FROM ALLCivitData WHERE modelVersionId = ?', [modelVersionId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // Update model as downloaded
    async updateModelAsDownloaded(modelVersionId, filePath) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE ALLCivitData SET isDownloaded = 1, file_path = ? WHERE modelVersionId = ?',
                [filePath, modelVersionId],
                function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this);
                }
            );
        });
    }

    // Mark model as failed download
    async markModelAsFailed(modelVersionId) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE ALLCivitData SET isDownloaded = 3 WHERE modelVersionId = ?',
                [modelVersionId],
                function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this);
                }
            );
        });
    }

    // Batch update files as downloaded
    async batchUpdateFilesAsDownloaded(files) {
        return new Promise((resolve, reject) => {
            let updated = 0;
            let errors = [];
            let processed = 0;

            const updateNext = () => {
                if (processed >= files.length) {
                    resolve({ updated, errors });
                    return;
                }

                const item = files[processed];
                db.run(
                    'UPDATE ALLCivitData SET isDownloaded = ?, file_path = ? WHERE fileName = ?',
                    [item.isDownloaded, item.fullPath, item.dbFileName],
                    function (err) {
                        if (err) {
                            errors.push({ fileName: item.dbFileName, error: err.message });
                        } else {
                            updated++;
                        }
                        processed++;
                        updateNext();
                    }
                );
            };

            updateNext();
        });
    }
}

module.exports = new DatabaseService(); 