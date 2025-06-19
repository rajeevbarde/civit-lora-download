const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Update this path to your actual database file location
const db = new sqlite3.Database('F:/Projects/AI/BigFiles/Misc/civitai DB/models/models.db');

const scanJobs = {};

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

app.get('/api/modeldetail/:id', (req, res) => {
    const { id } = req.params;

    // Query to get model details by modelVersionId
    const query = `
        SELECT
            modelId, modelName, modelDescription, modelType, modelNsfw, modelNsfwLevel, modelDownloadCount,
            modelVersionId, modelVersionName, modelVersionDescription,
            basemodel, basemodeltype, modelVersionNsfwLevel, modelVersionDownloadCount,
            fileName, fileType, fileDownloadUrl, size_in_gb, publishedAt, tags, isDownloaded, file_path
        FROM ALLCivitData
        WHERE modelVersionId = ?
    `;

    db.get(query, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(404).json({ error: 'Model not found' });
        }

        // Return only the model data — no pagination, total count, etc.
        res.json(row);
    });
});

// Endpoint to save directory path to a JSON file
app.post('/api/save-path', (req, res) => {
    const dirPath = req.body.path;
    if (!dirPath) {
        return res.status(400).json({ error: 'No path provided' });
    }
    const saveFilePath = path.join(__dirname, 'saved_path.json');
    // Read existing paths
    fs.readFile(saveFilePath, 'utf8', (err, data) => {
        let paths = [];
        if (!err) {
            try {
                const json = JSON.parse(data);
                if (Array.isArray(json.paths)) {
                    paths = json.paths;
                }
            } catch (e) {}
        }
        // Only add if not already present
        if (!paths.includes(dirPath)) {
            paths.push(dirPath);
        }
        fs.writeFile(saveFilePath, JSON.stringify({ paths }, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save path' });
            }
            res.json({ message: 'Path saved successfully' });
        });
    });
});

// Endpoint to get the saved directory path from the JSON file
app.get('/api/saved-path', (req, res) => {
    const saveFilePath = path.join(__dirname, 'saved_path.json');
    fs.readFile(saveFilePath, 'utf8', (err, data) => {
        if (err) {
            // If file doesn't exist, return empty array
            return res.json({ paths: [] });
        }
        try {
            const json = JSON.parse(data);
            res.json({ paths: Array.isArray(json.paths) ? json.paths : [] });
        } catch (e) {
            res.json({ paths: [] });
        }
    });
});

// Endpoint to delete a path from the saved_path.json array
app.delete('/api/saved-path', (req, res) => {
    const pathToDelete = req.body.path;
    if (!pathToDelete) {
        return res.status(400).json({ error: 'No path provided' });
    }
    const saveFilePath = path.join(__dirname, 'saved_path.json');
    fs.readFile(saveFilePath, 'utf8', (err, data) => {
        let paths = [];
        if (!err) {
            try {
                const json = JSON.parse(data);
                if (Array.isArray(json.paths)) {
                    paths = json.paths;
                }
            } catch (e) {}
        }
        const newPaths = paths.filter(p => p !== pathToDelete);
        fs.writeFile(saveFilePath, JSON.stringify({ paths: newPaths }, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete path' });
            }
            res.json({ message: 'Path deleted successfully' });
        });
    });
});

// Endpoint to scan all saved paths and return all file names recursively
app.get('/api/scan-all-paths', (req, res) => {
    const saveFilePath = path.join(__dirname, 'saved_path.json');
    fs.readFile(saveFilePath, 'utf8', (err, data) => {
        let paths = [];
        if (!err) {
            try {
                const json = JSON.parse(data);
                if (Array.isArray(json.paths)) {
                    paths = json.paths;
                }
            } catch (e) {}
        }
        if (!paths.length) {
            return res.json({ results: [] });
        }
        // Helper to recursively get all files in a directory
        function getAllFiles(dirPath, arrayOfFiles = []) {
            try {
                const files = fs.readdirSync(dirPath);
                files.forEach(file => {
                    const fullPath = path.join(dirPath, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        getAllFiles(fullPath, arrayOfFiles);
                    } else {
                        arrayOfFiles.push(fullPath);
                    }
                });
            } catch (e) {
                // If error, just return what we have so far
            }
            return arrayOfFiles;
        }
        // Scan each path
        const results = paths.map(p => {
            // Validate Windows full path format (basic check)
            const isValidWinPath = /^[a-zA-Z]:\\/.test(p);
            if (!isValidWinPath) {
                return { path: p, error: 'Invalid full path format (should be like C:\\folder\\...)', files: [] };
            }
            if (!fs.existsSync(p)) {
                return { path: p, error: 'Directory does not exist', files: [] };
            }
            if (!fs.statSync(p).isDirectory()) {
                return { path: p, error: 'Path is not a directory', files: [] };
            }
            // Scan recursively
            const files = getAllFiles(p, []);
            return { path: p, files };
        });
        res.json({ results });
    });
});

// Start scan endpoint
app.post('/api/start-scan', (req, res) => {
    const saveFilePath = path.join(__dirname, 'saved_path.json');
    fs.readFile(saveFilePath, 'utf8', (err, data) => {
        let paths = [];
        if (!err) {
            try {
                const json = JSON.parse(data);
                if (Array.isArray(json.paths)) {
                    paths = json.paths;
                }
            } catch (e) {}
        }
        if (!paths.length) {
            return res.status(400).json({ error: 'No saved paths to scan.' });
        }
        const scanId = uuidv4();
        scanJobs[scanId] = {
            status: 'in_progress',
            progress: 0,
            total: paths.length,
            results: [],
        };
        // Start scan in background
        setImmediate(() => {
            let completed = 0;
            // Deduplicated, case-insensitive allowed extensions
            const allowedExts = [
                 'safetensors'
            ];
            function hasAllowedExt(filename) {
                const ext = path.extname(filename).replace('.', '');
                return allowedExts.some(e => e.toLowerCase() === ext.toLowerCase());
            }
            paths.forEach((p, idx) => {
                let result = { path: p, files: [], error: null };
                const isValidWinPath = /^[a-zA-Z]:\\/.test(p);
                if (!isValidWinPath) {
                    result.error = 'Invalid full path format (should be like C:\\folder\\...)';
                } else if (!fs.existsSync(p)) {
                    result.error = 'Directory does not exist';
                } else if (!fs.statSync(p).isDirectory()) {
                    result.error = 'Path is not a directory';
                } else {
                    // Recursively get files
                    function getAllFiles(dirPath, arrayOfFiles = []) {
                        try {
                            const files = fs.readdirSync(dirPath);
                            files.forEach(file => {
                                const fullPath = path.join(dirPath, file);
                                if (fs.statSync(fullPath).isDirectory()) {
                                    getAllFiles(fullPath, arrayOfFiles);
                                } else {
                                    if (hasAllowedExt(fullPath)) {
                                        arrayOfFiles.push(fullPath);
                                    }
                                }
                            });
                        } catch (e) {}
                        return arrayOfFiles;
                    }
                    result.files = getAllFiles(p, []);
                }
                scanJobs[scanId].results[idx] = result;
                completed++;
                scanJobs[scanId].progress = completed;
                if (completed === paths.length) {
                    scanJobs[scanId].status = 'done';
                }
            });
        });
        res.json({ scanId });
    });
});

// Progress endpoint
app.get('/api/scan-progress/:id', (req, res) => {
    const scanId = req.params.id;
    const job = scanJobs[scanId];
    if (!job) {
        return res.status(404).json({ error: 'Scan not found' });
    }
    res.json({
        status: job.status,
        progress: job.progress,
        total: job.total,
        results: job.status === 'done' ? job.results : undefined,
    });
});

// Endpoint to get all file names from the database (for FileScanner presence check)
app.get('/api/all-filenames', (req, res) => {
    db.all('SELECT fileName FROM ALLCivitData', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Return as array of strings (file names)
        const fileNames = rows.map(r => r.fileName);
        res.json({ fileNames });
    });
});

// Endpoint to check if files are present or similar in the DB
app.post('/api/check-files-in-db', (req, res) => {
    const files = req.body.files; // [{ fullPath, baseName }]
    if (!Array.isArray(files)) {
        return res.status(400).json({ error: 'files must be an array' });
    }
    db.all('SELECT fileName FROM ALLCivitData', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const dbFileNames = rows.map(r => r.fileName ? r.fileName.toLowerCase() : '');
        const dbFileNameMap = rows.reduce((acc, r) => {
            if (r.fileName) acc[r.fileName.toLowerCase()] = r.fileName;
            return acc;
        }, {});
        // Normalization: remove trailing .[alphanumeric], underscores, dashes, spaces, lowercase
        function normalizeName(name) {
            name = name.replace(/\.[a-zA-Z0-9]+(?=\.[^.]+$)/, '');
            return name.replace(/[_\-\s]/g, '').toLowerCase();
        }
        // Build a map of normalized DB names to original DB file name
        const normalizedDbMap = {};
        for (const dbName of dbFileNames) {
            normalizedDbMap[normalizeName(dbName)] = dbFileNameMap[dbName];
        }
        const results = files.map(f => {
            const lowerBase = (f.baseName || '').toLowerCase();
            let status = '';
            if (dbFileNames.includes(lowerBase)) {
                status = 'Present';
            } else {
                // Similarity: normalization
                const normScanned = normalizeName(lowerBase);
                if (normalizedDbMap[normScanned]) {
                    status = `Similar (${normalizedDbMap[normScanned]})`;
                }
            }
            return {
                fullPath: f.fullPath,
                baseName: f.baseName,
                status
            };
        });
        res.json({ results });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});