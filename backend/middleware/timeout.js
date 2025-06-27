const logger = require('../utils/logger');

// Request timeout middleware
function createTimeoutMiddleware(timeoutMs = 30000) { // Default 30 seconds
    return (req, res, next) => {
        // If timeout is 0, null, or Infinity, do not set a timeout
        if (!timeoutMs || timeoutMs === Infinity) {
            return next();
        }
        // Set a timeout for the request
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                logger.warn('Request timeout', {
                    method: req.method,
                    url: req.url,
                    timeout: timeoutMs
                });
                
                res.status(408).json({
                    error: 'Request timeout',
                    message: 'The request took too long to process',
                    timeout: timeoutMs
                });
            }
        }, timeoutMs);

        // Clear timeout when response is sent
        const originalSend = res.send;
        res.send = function(data) {
            clearTimeout(timeout);
            return originalSend.call(this, data);
        };

        // Clear timeout on error
        res.on('error', () => {
            clearTimeout(timeout);
        });

        // Clear timeout when request is aborted
        req.on('aborted', () => {
            clearTimeout(timeout);
            logger.warn('Request aborted by client', {
                method: req.method,
                url: req.url
            });
        });

        // Clear timeout when response finishes
        res.on('finish', () => {
            clearTimeout(timeout);
        });

        next();
    };
}

// Different timeout configurations for different endpoints
const timeoutConfigs = {
    // Short timeout for simple operations
    quick: 10000, // 10 seconds
    
    // Medium timeout for database operations
    normal: 30000, // 30 seconds
    
    // Long timeout for file operations
    file: 120000, // 2 minutes
    
    // Very long timeout for downloads
    download: 300000 // 5 minutes
};

// Specific timeout middleware for different operation types
const timeoutMiddleware = {
    quick: createTimeoutMiddleware(timeoutConfigs.quick),
    normal: createTimeoutMiddleware(timeoutConfigs.normal),
    file: createTimeoutMiddleware(timeoutConfigs.file),
    download: createTimeoutMiddleware(timeoutConfigs.download)
};

module.exports = {
    createTimeoutMiddleware,
    timeoutMiddleware,
    timeoutConfigs
}; 