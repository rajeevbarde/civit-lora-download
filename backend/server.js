const express = require('express');
const cors = require('cors');
const { SERVER_CONFIG } = require('./config/constants');

// Import routes
const modelsRoutes = require('./routes/models');
const pathsRoutes = require('./routes/paths');
const filesRoutes = require('./routes/files');
const downloadsRoutes = require('./routes/downloads');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: SERVER_CONFIG.jsonLimit }));

// Route handlers
app.use('/api/models', modelsRoutes);
app.use('/api/paths', pathsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/downloads', downloadsRoutes);

// Legacy route mappings for backward compatibility
app.get('/api/models', modelsRoutes);
app.get('/api/modeldetail/:id', (req, res) => {
    // Redirect to new route
    req.url = `/detail/${req.params.id}`;
    modelsRoutes(req, res);
});
app.get('/api/basemodels', (req, res) => {
    req.url = '/basemodels';
    modelsRoutes(req, res);
});
app.get('/api/summary-matrix', (req, res) => {
    req.url = '/summary-matrix';
    modelsRoutes(req, res);
});
app.get('/api/summary-matrix-downloaded', (req, res) => {
    req.url = '/summary-matrix-downloaded';
    modelsRoutes(req, res);
});

// Legacy path routes
app.post('/api/save-path', (req, res) => {
    req.url = '/save';
    pathsRoutes(req, res);
});
app.get('/api/saved-path', (req, res) => {
    req.url = '/saved';
    pathsRoutes(req, res);
});
app.delete('/api/saved-path', (req, res) => {
    req.url = '/delete';
    pathsRoutes(req, res);
});

// Legacy file routes
app.post('/api/start-scan', (req, res) => {
    req.url = '/start-scan';
    filesRoutes(req, res);
});
app.post('/api/check-files-in-db', (req, res) => {
    req.url = '/check-files-in-db';
    filesRoutes(req, res);
});
app.post('/api/mark-downloaded', (req, res) => {
    req.url = '/mark-downloaded';
    filesRoutes(req, res);
});
app.post('/api/validate-downloaded-files', (req, res) => {
    req.url = '/validate-downloaded-files';
    filesRoutes(req, res);
});
app.post('/api/find-missing-files', (req, res) => {
    req.url = '/find-missing-files';
    filesRoutes(req, res);
});
app.post('/api/compute-file-hash', (req, res) => {
    req.url = '/compute-file-hash';
    filesRoutes(req, res);
});
app.post('/api/fix-file', (req, res) => {
    req.url = '/fix-file';
    filesRoutes(req, res);
});

// Legacy download routes
app.post('/api/download-model-file', (req, res) => {
    req.url = '/model-file';
    downloadsRoutes(req, res);
});
app.get('/api/download-status', (req, res) => {
    req.url = '/status';
    downloadsRoutes(req, res);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const PORT = SERVER_CONFIG.port;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Refactored server started successfully!');
}); 