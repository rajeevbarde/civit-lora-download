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
    <button @click="scanAllPaths">Scan All Saved Paths</button>
    <p v-if="message">{{ message }}</p>
    <div v-if="scanResults.length" class="scan-results">
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
  },
  mounted() {
    this.fetchSavedPaths();
  },
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
</style> 