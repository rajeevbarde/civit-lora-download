const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());

// Update this path to your actual database file location
const db = new sqlite3.Database('F:/Projects/AI/BigFiles/Misc/civitai DB/models/models.db');

app.get('/api/models', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let query = `
        SELECT
            modelId, modelName, modelDescription, modelType, modelNsfw, modelNsfwLevel, modelDownloadCount,
            modelVersionId, modelVersionName, modelVersionDescription,
            basemodel, basemodeltype, modelVersionNsfwLevel, modelVersionDownloadCount,
            fileName, fileType, fileDownloadUrl, size_in_gb, publishedAt, tags, isDownloaded, file_path
        FROM ALLCivitData
    `;

    const params = [];

    if (req.query.modelVersionId) {
        query += ' WHERE modelVersionId = ?';
        params.push(req.query.modelVersionId);
    }

    // First, get the total count
    db.get('SELECT COUNT(*) as total FROM ALLCivitData', [], (err, count) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Then get the paginated data
        db.all(query + ' LIMIT ? OFFSET ?', [...params, limit, offset], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                total: count.total,
                page: page,
                limit: limit,
                data: rows
            });
        });
    });
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});