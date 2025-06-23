const http = require('http');
const https = require('https');

// Create connection pools for better performance
const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 20,
    maxFreeSockets: 10,
    timeout: 60000
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 20,
    maxFreeSockets: 10,
    timeout: 60000
});

module.exports = {
    httpAgent,
    httpsAgent
}; 