const { DOWNLOAD_CONFIG } = require('../config/constants');

// Download queue to manage concurrent downloads
class DownloadQueue {
    constructor() {
        this.active = 0;
        this.maxConcurrent = DOWNLOAD_CONFIG.maxConcurrent;
        this.queue = [];
        this.errors = [];
    }

    async add(downloadTask) {
        if (this.active < this.maxConcurrent) {
            this.active++;
            try {
                await downloadTask();
            } catch (error) {
                console.error('Download task failed:', error.message);
                this.errors.push({
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    stack: error.stack
                });
                
                // Keep only last 10 errors to prevent memory issues
                if (this.errors.length > 10) {
                    this.errors = this.errors.slice(-10);
                }
            } finally {
                this.active--;
                this.processNext();
            }
        } else {
            this.queue.push(downloadTask);
        }
    }

    processNext() {
        if (this.queue.length > 0 && this.active < this.maxConcurrent) {
            const nextTask = this.queue.shift();
            this.add(nextTask);
        }
    }

    getStatus() {
        return {
            active: this.active,
            queued: this.queue.length,
            maxConcurrent: this.maxConcurrent,
            recentErrors: this.errors.slice(-5) // Return last 5 errors
        };
    }

    clearErrors() {
        this.errors = [];
    }
}

// Create singleton instance
const downloadQueue = new DownloadQueue();

module.exports = downloadQueue; 