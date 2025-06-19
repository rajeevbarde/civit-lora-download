<template>
  <div class="file-scanner-page">
    <h1>File Scanner Page</h1>
    <p>This is the file scanner page. Add your file scanning features here.</p>
    <div v-if="savedPaths.length" class="saved-path-display">
      <strong>Saved paths:</strong>
      <ul>
        <li v-for="(p, idx) in savedPaths" :key="idx">
          {{ p }}
          <button class="delete-btn" @click="deletePath(p)">Delete</button>
        </li>
      </ul>
    </div>
    <input
      v-model="directoryPath"
      type="text"
      placeholder="Enter full Windows directory path"
      class="directory-input"
    />
    <button @click="savePath">Save Path</button>
    <button @click="scanAllPaths">Scan All Saved Paths (Old)</button>
    <button @click="startScan">Scan All Saved Paths (with Progress)</button>
    <p v-if="message">{{ message }}</p>
    <div v-if="scanStatus === 'in_progress'">
      <progress :value="scanProgress" :max="scanTotal"></progress>
      <span>{{ scanProgress }} / {{ scanTotal }} scanned...</span>
    </div>
    <div v-if="scanStatus === 'done' && checkedFiles.length">
      <h2>Scan Results</h2>
      <table class="scan-table">
        <thead>
          <tr>
            <th>Full Path</th>
            <th>Present in db</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(file, idx) in checkedFiles" :key="file.fullPath + idx">
            <td>{{ file.fullPath }}</td>
            <td>
              <span>{{ file.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <button 
        v-if="checkedFiles.length" 
        @click="markDownloaded" 
        :disabled="markingDownloaded"
        class="mark-btn"
        style="margin-top: 1rem;"
      >
        Mark Downloaded in DB
      </button>
      <div v-if="markDownloadedMsg" class="mark-msg">{{ markDownloadedMsg }}</div>
    </div>
    <div v-if="scanStatus === '' && scanResults.length">
      <h2>Scan Results</h2>
      <div v-for="result in scanResults" :key="result.path" class="scan-result-block">
        <strong>{{ result.path }}</strong>
        <div v-if="result.error" class="error">Error: {{ result.error }}</div>
        <ul v-else>
          <li v-for="(file, idx) in result.files" :key="idx">{{ file }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileScanner',
  data() {
    return {
      directoryPath: '',
      message: '',
      savedPaths: [],
      scanResults: [],
      scanId: null,
      scanProgress: 0,
      scanTotal: 0,
      scanStatus: '',
      pollingInterval: null,
      checkedFiles: [], // [{ fullPath, baseName, status }]
      markingDownloaded: false,
      markDownloadedMsg: '',
    };
  },
  methods: {
    async savePath() {
      if (!this.directoryPath) {
        this.message = 'Please enter a directory path.';
        return;
      }
      try {
        const response = await fetch('http://localhost:3000/api/save-path', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: this.directoryPath }),
        });
        const data = await response.json();
        if (response.ok) {
          this.message = 'Path saved successfully!';
          this.fetchSavedPaths();
          this.directoryPath = '';
        } else {
          this.message = data.error || 'Failed to save path.';
        }
      } catch (error) {
        this.message = 'Error: ' + error.message;
      }
    },
    async fetchSavedPaths() {
      try {
        const response = await fetch('http://localhost:3000/api/saved-path');
        const data = await response.json();
        if (Array.isArray(data.paths)) {
          this.savedPaths = data.paths;
        } else {
          this.savedPaths = [];
        }
      } catch (error) {
        this.savedPaths = [];
      }
    },
    async deletePath(path) {
      try {
        const response = await fetch('http://localhost:3000/api/saved-path', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path }),
        });
        const data = await response.json();
        if (response.ok) {
          this.message = 'Path deleted successfully!';
          this.fetchSavedPaths();
        } else {
          this.message = data.error || 'Failed to delete path.';
        }
      } catch (error) {
        this.message = 'Error: ' + error.message;
      }
    },
    async scanAllPaths() {
      this.message = '';
      this.scanResults = [];
      try {
        const response = await fetch('http://localhost:3000/api/scan-all-paths');
        const data = await response.json();
        if (Array.isArray(data.results)) {
          this.scanResults = data.results;
          if (!data.results.length) {
            this.message = 'No saved paths to scan.';
          }
        } else {
          this.message = 'Unexpected response from server.';
        }
      } catch (error) {
        this.message = 'Error: ' + error.message;
      }
    },
    async startScan() {
      this.message = '';
      this.scanResults = [];
      this.checkedFiles = [];
      this.scanProgress = 0;
      this.scanTotal = 0;
      this.scanStatus = '';
      this.scanId = null;
      if (this.pollingInterval) clearInterval(this.pollingInterval);
      try {
        const response = await fetch('http://localhost:3000/api/start-scan', { method: 'POST' });
        const data = await response.json();
        if (data.scanId) {
          this.scanId = data.scanId;
          this.scanStatus = 'in_progress';
          this.pollScanProgress();
        } else {
          this.message = data.error || 'Failed to start scan.';
        }
      } catch (error) {
        this.message = 'Error: ' + error.message;
      }
    },
    async pollScanProgress() {
      if (!this.scanId) return;
      this.pollingInterval = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/scan-progress/${this.scanId}`);
          const data = await response.json();
          this.scanProgress = data.progress;
          this.scanTotal = data.total;
          this.scanStatus = data.status;
          if (data.status === 'done') {
            this.scanResults = data.results;
            clearInterval(this.pollingInterval);
            await this.checkFilesInDb();
          }
        } catch (error) {
          clearInterval(this.pollingInterval);
          this.message = 'Error: ' + error.message;
        }
      }, 1000);
    },
    async checkFilesInDb() {
      // Flatten all files from all scanResults
      let files = [];
      for (const result of this.scanResults) {
        if (result && Array.isArray(result.files)) {
          files = files.concat(result.files.map(f => ({
            fullPath: f,
            baseName: f.split(/\\|\//).pop() || f
          })));
        }
      }
      if (!files.length) {
        this.checkedFiles = [];
        return;
      }
      try {
        const response = await fetch('http://localhost:3000/api/check-files-in-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files })
        });
        const data = await response.json();
        if (Array.isArray(data.results)) {
          this.checkedFiles = data.results;
        } else {
          this.checkedFiles = [];
        }
      } catch (error) {
        this.checkedFiles = [];
      }
    },
    async markDownloaded() {
      this.markingDownloaded = true;
      this.markDownloadedMsg = '';
      try {
        const response = await fetch('http://localhost:3000/api/mark-downloaded', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: this.checkedFiles })
        });
        const data = await response.json();
        if (response.ok && typeof data.updated === 'number') {
          this.markDownloadedMsg = `Updated ${data.updated} row(s) in DB.`;
          if (data.errors && data.errors.length) {
            this.markDownloadedMsg += ' Errors: ' + data.errors.map(e => e.fileName + ': ' + e.error).join('; ');
          }
        } else {
          this.markDownloadedMsg = data.error || 'Failed to update DB.';
        }
      } catch (error) {
        this.markDownloadedMsg = 'Error: ' + error.message;
      } finally {
        this.markingDownloaded = false;
      }
    },
  },
  mounted() {
    this.fetchSavedPaths();
  },
  beforeDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  },
  computed: {
    allScannedFiles() {
      let files = [];
      for (const result of this.scanResults) {
        if (result && Array.isArray(result.files)) {
          files = files.concat(result.files.map(f => ({
            fullPath: f,
            baseName: f.split(/\\|\//).pop() || f
          })));
        }
      }
      return files;
    }
  }
};
</script>

<style scoped>
.file-scanner-page {
  padding: 2rem;
}
.directory-input {
  margin-right: 1rem;
  padding: 0.5rem;
  width: 350px;
}
button {
  padding: 0.5rem 1rem;
}
.saved-path-display {
  margin-bottom: 1rem;
  color: #333;
}
.delete-btn {
  margin-left: 1rem;
  color: #fff;
  background: #d9534f;
  border: none;
  border-radius: 3px;
  padding: 0.2rem 0.7rem;
  cursor: pointer;
}
.scan-results {
  margin-top: 2rem;
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 5px;
}
.scan-result-block {
  margin-bottom: 1.5rem;
}
.error {
  color: #d9534f;
  font-weight: bold;
  margin-top: 0.5rem;
}
progress {
  width: 300px;
  height: 20px;
  margin-right: 1rem;
}
.scan-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.scan-table th, .scan-table td {
  border: 1px solid #ddd;
  padding: 8px;
}
.scan-table th {
  background: #f8f8f8;
}
.mark-btn {
  background: #5cb85c;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
}
.mark-btn:disabled {
  background: #b2d8b2;
  cursor: not-allowed;
}
.mark-msg {
  margin-top: 0.7rem;
  color: #31708f;
  font-weight: bold;
}
</style> 