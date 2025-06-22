const { DOWNLOAD_CONFIG } = require('../config/constants');

// Download queue to manage concurrent downloads
class DownloadQueue {
    constructor() {
        this.active = 0;
        this.maxConcurrent = DOWNLOAD_CONFIG.maxConcurrent;
        this.queue = [];
    }

    async add(downloadTask) {
        if (this.active < this.maxConcurrent) {
            this.active++;
            try {
                await downloadTask();
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
            maxConcurrent: this.maxConcurrent
        };
    }
}

// Create singleton instance
const downloadQueue = new DownloadQueue();

module.exports = downloadQueue; 