const http = require('http');
const https = require('https');

// Create connection pools for better performance
const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: parseInt(process.env.HTTP_KEEPALIVE_MSECS) || 1000,
    maxSockets: parseInt(process.env.HTTP_MAX_SOCKETS) || 20,
    maxFreeSockets: parseInt(process.env.HTTP_MAX_FREE_SOCKETS) || 10,
    timeout: parseInt(process.env.HTTP_TIMEOUT) || 60000
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: parseInt(process.env.HTTPS_KEEPALIVE_MSECS) || 1000,
    maxSockets: parseInt(process.env.HTTPS_MAX_SOCKETS) || 20,
    maxFreeSockets: parseInt(process.env.HTTPS_MAX_FREE_SOCKETS) || 10,
    timeout: parseInt(process.env.HTTPS_TIMEOUT) || 60000
});

module.exports = {
    httpAgent,
    httpsAgent
}; 