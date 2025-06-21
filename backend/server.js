const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

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

    let baseWhere = [];
    let params = [];

    if (req.query.basemodel) {
        baseWhere.push('basemodel = ?');
        params.push(req.query.basemodel);
    }
    if (req.query.isDownloaded !== undefined && req.query.isDownloaded !== "") {
        baseWhere.push('isDownloaded = ?');
        params.push(Number(req.query.isDownloaded));
    }
    if (req.query.modelVersionId) {
        baseWhere.push('modelVersionId = ?');
        params.push(req.query.modelVersionId);
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

    // First, get the total count with filters
    db.get(`SELECT COUNT(*) as total FROM ALLCivitData ${whereClause}`, params, (err, count) => {
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

// Start scan endpoint
app.post('/api/start-scan', (req, res) => {
    console.log('=== SCAN REQUEST RECEIVED ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('User pressed scan button - starting file scan process...');
    
    const saveFilePath = path.join(__dirname, 'saved_path.json');
    fs.readFile(saveFilePath, 'utf8', (err, data) => {
        let paths = [];
        if (!err) {
            try {
                const json = JSON.parse(data);
                if (Array.isArray(json.paths)) {
                    paths = json.paths;
                }
            } catch (e) {
                console.log('Error parsing saved_path.json:', e.message);
            }
        }
        
        console.log(`Found ${paths.length} saved paths to scan:`);
        paths.forEach((p, index) => {
            console.log(`  ${index + 1}. ${p}`);
        });
        
        if (!paths.length) {
            console.log('ERROR: No saved paths to scan');
            return res.status(400).json({ error: 'No saved paths to scan.' });
        }
        
        // Deduplicated, case-insensitive allowed extensions
        const allowedExts = [
             'safetensors'
        ];
        console.log(`Scanning for files with extensions: ${allowedExts.join(', ')}`);
        
        function hasAllowedExt(filename) {
            const ext = path.extname(filename).replace('.', '');
            return allowedExts.some(e => e.toLowerCase() === ext.toLowerCase());
        }
        
        // Scan each path
        console.log('Starting file scan for each path...');
        const results = paths.map((p, pathIndex) => {
            console.log(`\n--- Scanning path ${pathIndex + 1}/${paths.length}: ${p} ---`);
            let result = { path: p, files: [], error: null };
            const isValidWinPath = /^[a-zA-Z]:\\/.test(p);
            if (!isValidWinPath) {
                result.error = 'Invalid full path format (should be like C:\\folder\\...)';
                console.log(`  ERROR: ${result.error}`);
            } else if (!fs.existsSync(p)) {
                result.error = 'Directory does not exist';
                console.log(`  ERROR: ${result.error}`);
            } else if (!fs.statSync(p).isDirectory()) {
                result.error = 'Path is not a directory';
                console.log(`  ERROR: ${result.error}`);
            } else {
                console.log(`  Path is valid, scanning for files...`);
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
                    } catch (e) {
                        console.log(`    Error reading directory ${dirPath}: ${e.message}`);
                    }
                    return arrayOfFiles;
                }
                result.files = getAllFiles(p, []);
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
        
        res.json({ results });
    });
});

// Endpoint to check if files are present or similar in the DB
app.post('/api/check-files-in-db', (req, res) => {
    const files = req.body.files; // [{ fullPath, baseName }]
    if (!Array.isArray(files)) {
        return res.status(400).json({ error: 'files must be an array' });
    }
    
    console.log('=== CHECKING FILES IN DATABASE ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Checking ${files.length} files against database...`);
    
    db.all('SELECT fileName FROM ALLCivitData', [], (err, rows) => {
        if (err) {
            console.log(`ERROR: Database query failed: ${err.message}`);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Database contains ${rows.length} file records`);
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
        
        console.log('Processing scanned files...');
        const results = files.map((f, index) => {            
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
        const similarCount = results.filter(r => r.status.startsWith('Similar')).length;
        const notFoundCount = results.filter(r => !r.status || r.status === '').length;
        
        console.log('=== DATABASE CHECK COMPLETED ===');
        console.log(`Files present in DB: ${presentCount}`);
        console.log(`Files similar to DB entries: ${similarCount}`);
        console.log(`Files not found in DB: ${notFoundCount}`);
        console.log(`Check completed at: ${new Date().toISOString()}`);
        console.log('=== END DATABASE CHECK ===\n');
        
        res.json({ results });
    });
});

// Endpoint to mark files as downloaded in the DB
app.post('/api/mark-downloaded', (req, res) => {
    const files = req.body.files; // [{ status, fullPath, baseName }]
    if (!Array.isArray(files)) {
        return res.status(400).json({ error: 'files must be an array' });
    }
    
    console.log('=== MARKING FILES AS DOWNLOADED ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Processing ${files.length} files for database update...`);
    
    let updated = 0;
    let errors = [];
    const dbFileNamesToUpdate = [];
    files.forEach(f => {
        let isDownloaded = 0;
        let dbFileName = null;
        if (f.status === 'Present') {
            isDownloaded = 1;
            dbFileName = f.baseName;
        } else if (f.status.startsWith('Similar (')) {
            isDownloaded = 2;
            // Extract filename from status: Similar (filename)
            const match = f.status.match(/Similar \((.+)\)/);
            if (match) dbFileName = match[1];
        }
        if (isDownloaded && dbFileName) {
            dbFileNamesToUpdate.push({ dbFileName, isDownloaded, fullPath: f.fullPath });
        }
    });
    
    console.log(`Files to update in database: ${dbFileNamesToUpdate.length}`);
    if (dbFileNamesToUpdate.length === 0) {
        console.log('No files to update - all files already marked or not found in DB');
        console.log('=== END MARK DOWNLOADED ===\n');
        return res.json({ updated: 0, errors: [] });
    }
    
    const sqlite = require('sqlite3').verbose();
    const dbConn = new sqlite.Database('F:/Projects/AI/BigFiles/Misc/civitai DB/models/models.db');
    let processed = 0;
    function updateNext() {
        if (processed >= dbFileNamesToUpdate.length) {
            console.log('=== DATABASE UPDATE COMPLETED ===');
            console.log(`Successfully updated: ${updated} files`);
            console.log(`Errors encountered: ${errors.length}`);
            if (errors.length > 0) {
                console.log('Error details:');
                errors.forEach((error, idx) => {
                    console.log(`  ${idx + 1}. ${error.fileName}: ${error.error}`);
                });
            }
            console.log(`Update completed at: ${new Date().toISOString()}`);
            console.log('=== END MARK DOWNLOADED ===\n');
            dbConn.close();
            return res.json({ updated, errors });
        }
        const item = dbFileNamesToUpdate[processed];
        console.log(`Updating ${processed + 1}/${dbFileNamesToUpdate.length}: ${item.dbFileName} (isDownloaded=${item.isDownloaded})`);
        dbConn.run(
            'UPDATE ALLCivitData SET isDownloaded = ?, file_path = ? WHERE fileName = ?',
            [item.isDownloaded, item.fullPath, item.dbFileName],
            function (err) {
                if (err) {
                    errors.push({ fileName: item.dbFileName, error: err.message });
                    console.log(`  ERROR updating ${item.dbFileName}: ${err.message}`);
                } else {
                    updated++;
                    console.log(`  SUCCESS: Updated ${item.dbFileName} (isDownloaded=${item.isDownloaded}, file_path=${item.fullPath})`);
                }
                processed++;
                updateNext();
            }
        );
    }
    updateNext();
});

app.get('/api/basemodels', (req, res) => {
    db.all('SELECT DISTINCT basemodel FROM ALLCivitData WHERE basemodel IS NOT NULL AND basemodel != "" ORDER BY basemodel ASC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Return as array of strings
        const baseModels = rows.map(r => r.basemodel);
        res.json({ baseModels });
    });
});

// Download model file and update DB
app.post('/api/download-model-file', async (req, res) => {
  const { url, fileName, baseModel, modelVersionId } = req.body;
  if (!url || !fileName || !baseModel || !modelVersionId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  const baseDir = 'Z:/Projects/AI/BigFiles/SD/loras';
  const targetDir = path.join(baseDir, baseModel);
  try {
    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, fileName);
    // Download file
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: 600000 // 10 min
    });
    const totalLength = parseInt(response.headers['content-length'], 10);
    let downloaded = 0;
    let lastLoggedPercent = 0;
    const writer = fs.createWriteStream(filePath);
    response.data.on('data', (chunk) => {
      downloaded += chunk.length;
      if (totalLength) {
        const percent = Math.floor((downloaded / totalLength) * 100);
        if (percent >= lastLoggedPercent + 10 || percent === 100) {
          console.log(`Downloading ${fileName}: ${percent}% (${downloaded}/${totalLength} bytes)`);
          lastLoggedPercent = percent;
        }
      }
    });
    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', () => {
        if (!error) resolve();
      });
    });
    // Update DB
    db.run(
      'UPDATE ALLCivitData SET isDownloaded = 1, file_path = ? WHERE modelVersionId = ?',
      [filePath, modelVersionId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'File saved but DB update failed: ' + err.message });
        }
        return res.json({ success: true, fullPath: filePath });
      }
    );
  } catch (err) {
    // Update DB to mark as failed (status 3)
    db.run(
      'UPDATE ALLCivitData SET isDownloaded = 3 WHERE modelVersionId = ?',
      [modelVersionId],
      function (dbErr) {
        if (dbErr) {
          console.error('Failed to update DB with error status:', dbErr.message);
        }
        return res.status(500).json({ error: err.message });
      }
    );
  }
});

// Endpoint to get summary matrix for base models vs modelVersionNsfwLevel
app.get('/api/summary-matrix', (req, res) => {
    // Query to get counts grouped by basemodel and modelVersionNsfwLevel
    const query = `
        SELECT basemodel, modelVersionNsfwLevel, COUNT(*) as count
        FROM ALLCivitData
        WHERE basemodel IS NOT NULL AND basemodel != '' AND modelVersionNsfwLevel IS NOT NULL AND modelVersionNsfwLevel != ''
        GROUP BY basemodel, modelVersionNsfwLevel
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Build unique lists for columns and rows
        const baseModels = [...new Set(rows.map(r => r.basemodel))].sort();
        const nsfwLevels = [...new Set(rows.map(r => r.modelVersionNsfwLevel))].sort();
        // Build matrix: { row: nsfwLevel, columns: { basemodel: count, ... } }
        const matrix = nsfwLevels.map(nsfw => {
            const row = { modelVersionNsfwLevel: nsfw };
            baseModels.forEach(bm => {
                const found = rows.find(r => r.basemodel === bm && r.modelVersionNsfwLevel === nsfw);
                row[bm] = found ? found.count : 0;
            });
            return row;
        });
        res.json({ baseModels, nsfwLevels, matrix });
    });
});

// Endpoint to get summary matrix for base models vs modelVersionNsfwLevel, with isDownloaded counts
app.get('/api/summary-matrix-downloaded', (req, res) => {
    // Query to get counts grouped by basemodel, modelVersionNsfwLevel, and isDownloaded
    const query = `
        SELECT basemodel, modelVersionNsfwLevel, isDownloaded, COUNT(*) as count
        FROM ALLCivitData
        WHERE basemodel IS NOT NULL AND basemodel != '' AND modelVersionNsfwLevel IS NOT NULL AND modelVersionNsfwLevel != ''
              AND (isDownloaded = 1 OR isDownloaded = 2)
        GROUP BY basemodel, modelVersionNsfwLevel, isDownloaded
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Build unique lists for columns and rows
        const baseModels = [...new Set(rows.map(r => r.basemodel))].sort();
        const nsfwLevels = [...new Set(rows.map(r => r.modelVersionNsfwLevel))].sort();
        // Build matrix: { row: nsfwLevel, columns: { basemodel: { d1: count, d2: count }, ... } }
        const matrix = nsfwLevels.map(nsfw => {
            const row = { modelVersionNsfwLevel: nsfw };
            baseModels.forEach(bm => {
                const d1 = rows.find(r => r.basemodel === bm && r.modelVersionNsfwLevel === nsfw && r.isDownloaded === 1);
                const d2 = rows.find(r => r.basemodel === bm && r.modelVersionNsfwLevel === nsfw && r.isDownloaded === 2);
                row[bm] = {
                    d1: d1 ? d1.count : 0,
                    d2: d2 ? d2.count : 0
                };
            });
            return row;
        });
        res.json({ baseModels, nsfwLevels, matrix });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});