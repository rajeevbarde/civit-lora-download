const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Current log level (can be set via environment variable)
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, data = null) {
        const timestamp = this.getTimestamp();
        const levelUpper = level.toUpperCase();
        
        let formattedMessage = `[${timestamp}] [${levelUpper}] ${message}`;
        
        if (data) {
            if (typeof data === 'object') {
                formattedMessage += ` ${JSON.stringify(data)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }
        
        return formattedMessage;
    }

    getColor(level, isUserAction = false) {
        if (isUserAction) return colors.bright + colors.magenta;
        switch (level.toLowerCase()) {
            case 'error': return colors.red + colors.bright;
            case 'warn': return colors.yellow;
            case 'info': return colors.green;
            case 'debug': return colors.cyan;
            default: return colors.reset;
        }
    }

    writeToFile(level, message, data = null) {
        const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
        const formattedMessage = this.formatMessage(level, message, data);
        
        try {
            fs.appendFileSync(logFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    log(level, message, data = null) {
        const levelNum = LOG_LEVELS[level.toUpperCase()];
        
        if (levelNum <= CURRENT_LOG_LEVEL) {
            const formattedMessage = this.formatMessage(level, message, data);
            const color = this.getColor(level);
            
            // Console output with colors
            console.log(`${color}${formattedMessage}${colors.reset}`);
            
            // File output (without colors)
            this.writeToFile(level, message, data);
        }
    }

    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    // Special method for HTTP requests
    request(method, url, statusCode, responseTime = null) {
        const message = `${method} ${url} - ${statusCode}`;
        const data = responseTime ? { responseTime: `${responseTime}ms` } : null;
        
        if (statusCode >= 400) {
            this.warn(message, data);
        } else {
            this.info(message, data);
        }
    }

    // Special method for database operations
    db(operation, table, duration = null) {
        const message = `DB ${operation} on ${table}`;
        const data = duration ? { duration: `${duration}ms` } : null;
        this.debug(message, data);
    }

    // Special method for file operations
    file(operation, filePath, result = null) {
        const message = `FILE ${operation}: ${filePath}`;
        this.debug(message, result);
    }

    // Special method for download operations
    download(fileName, progress = null) {
        // Enhanced: Show progress bar and emoji if progress info is present
        if (progress && typeof progress.percent === 'number') {
            const percent = progress.percent;
            const barLength = 20;
            const filledLength = Math.round((percent / 100) * barLength);
            const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
            const msg = `⬇️  DOWNLOAD: ${fileName} | [${bar}] ${percent}% | ${progress.downloaded}/${progress.total} | 🚀 ${progress.speed}`;
            const color = colors.bright + colors.cyan;
            console.log(`${color}${msg}${colors.reset}`);
            this.writeToFile('DOWNLOAD', msg, progress);
        } else {
            const message = `DOWNLOAD: ${fileName}`;
            const color = colors.bright + colors.cyan;
            console.log(`${color}${message}${colors.reset}`);
            this.writeToFile('DOWNLOAD', message, progress);
        }
    }

    // User-facing action log (for actions like download, scan, validate, summary)
    userAction(message, data = null) {
        const formattedMessage = this.formatMessage('USER', `🚩 ${message}`, data);
        const color = colors.bright + colors.magenta;
        console.log(`${color}${formattedMessage}${colors.reset}`);
        this.writeToFile('USER', message, data);
    }

    // Log time taken for an operation (for summary, scan, etc.)
    logTimeTaken(action, startTime, data = null) {
        const duration = Date.now() - startTime;
        const formattedMessage = this.formatMessage('USER', `⏱️ ${action} - Time taken: ${duration}ms`, data);
        const color = colors.bright + colors.blue;
        console.log(`${color}${formattedMessage}${colors.reset}`);
        this.writeToFile('USER', `${action} - Time taken: ${duration}ms`, data);
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger; 