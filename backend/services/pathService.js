const fs = require('fs');
const { PATHS } = require('../config/constants');

class PathService {
    // Read saved paths from JSON file
    async readSavedPaths() {
        return new Promise((resolve) => {
            fs.readFile(PATHS.savedPathFile, 'utf8', (err, data) => {
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
                resolve(paths);
            });
        });
    }

    // Write paths to JSON file
    async writeSavedPaths(paths) {
        return new Promise((resolve, reject) => {
            fs.writeFile(PATHS.savedPathFile, JSON.stringify({ paths }, null, 2), (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Add a new path
    async addPath(dirPath) {
        if (!dirPath) {
            throw new Error('No path provided');
        }

        const paths = await this.readSavedPaths();
        
        // Only add if not already present
        if (!paths.includes(dirPath)) {
            paths.push(dirPath);
            await this.writeSavedPaths(paths);
        }

        return { message: 'Path saved successfully' };
    }

    // Delete a path
    async deletePath(pathToDelete) {
        if (!pathToDelete) {
            throw new Error('No path provided');
        }

        const paths = await this.readSavedPaths();
        const newPaths = paths.filter(p => p !== pathToDelete);
        await this.writeSavedPaths(newPaths);

        return { message: 'Path deleted successfully' };
    }

    // Get all saved paths
    async getSavedPaths() {
        const paths = await this.readSavedPaths();
        return { paths };
    }
}

module.exports = new PathService(); 