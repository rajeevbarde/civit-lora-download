// Common validation functions for API endpoints

// Validate pagination parameters
function validatePagination(req, res, next) {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const maxLimit = parseInt(process.env.MAX_PAGINATION_LIMIT) || 100;
    
    if (req.query.page !== undefined && (isNaN(page) || page < 1)) {
        return res.status(400).json({ error: 'Page must be a positive integer' });
    }
    
    if (req.query.limit !== undefined && (isNaN(limit) || limit < 1 || limit > maxLimit)) {
        return res.status(400).json({ error: `Limit must be between 1 and ${maxLimit}` });
    }
    
    next();
}

// Validate modelVersionId parameter
function validateModelVersionId(req, res, next) {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid modelVersionId is required' });
    }
    
    next();
}

// Validate file path in request body
function validateFilePath(req, res, next) {
    const { filePath } = req.body;
    
    if (filePath === undefined || filePath === null || typeof filePath !== 'string') {
        return res.status(400).json({ error: 'Valid filePath is required' });
    }
    
    if (filePath.trim().length === 0) {
        return res.status(400).json({ error: 'filePath cannot be empty' });
    }
    
    next();
}

// Validate download request body
function validateDownloadRequest(req, res, next) {
    const { url, fileName, baseModel, modelVersionId } = req.body;
    
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Valid URL is required' });
    }
    
    if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({ error: 'Valid fileName is required' });
    }
    
    if (!baseModel || typeof baseModel !== 'string') {
        return res.status(400).json({ error: 'Valid baseModel is required' });
    }
    
    if (!modelVersionId || isNaN(parseInt(modelVersionId))) {
        return res.status(400).json({ error: 'Valid modelVersionId is required' });
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    next();
}

// Validate files array in request body
function validateFilesArray(req, res, next) {
    const { files } = req.body;
    
    if (!Array.isArray(files)) {
        return res.status(400).json({ error: 'files must be an array' });
    }
    
    if (files.length === 0) {
        return res.status(400).json({ error: 'files array cannot be empty' });
    }
    
    // Validate each file object
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file || typeof file !== 'object') {
            return res.status(400).json({ error: `Invalid file object at index ${i}` });
        }
        
        if (file.status && !['Present', 'Missing', 'Unknown'].includes(file.status)) {
            return res.status(400).json({ error: `Invalid file status at index ${i}` });
        }
    }
    
    next();
}

// Validate path in request body
function validatePath(req, res, next) {
    const { path: dirPath } = req.body;
    
    if (dirPath === undefined || dirPath === null || typeof dirPath !== 'string') {
        return res.status(400).json({ error: 'Valid path is required' });
    }
    
    if (dirPath.trim().length === 0) {
        return res.status(400).json({ error: 'Path cannot be empty' });
    }
    
    next();
}

// Validate fix file request
function validateFixFileRequest(req, res, next) {
    const { modelVersionId, filePath } = req.body;
    
    if (!modelVersionId || isNaN(parseInt(modelVersionId))) {
        return res.status(400).json({ error: 'Valid modelVersionId is required' });
    }
    
    if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: 'Valid filePath is required' });
    }
    
    next();
}

module.exports = {
    validatePagination,
    validateModelVersionId,
    validateFilePath,
    validateDownloadRequest,
    validateFilesArray,
    validatePath,
    validateFixFileRequest
}; 