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
    <div v-else class="no-paths-message">
      <p><strong>No saved paths found.</strong> Please add a directory path below to get started.</p>
    </div>
    <input
      v-model="directoryPath"
      type="text"
      placeholder="Enter full Windows directory path"
      class="directory-input"
    />
    <button @click="savePath">Save Path</button>
    <button @click="startScan">Scan All Saved Paths</button>
    <button 
      v-if="checkedFiles.length" 
      @click="markDownloaded" 
      :disabled="markingDownloaded"
      class="mark-btn"
    >
      Mark Downloaded in DB
    </button>
    <button 
      @click="validateDownloadedFiles" 
      :disabled="validatingFiles"
      class="validate-btn"
    >
      Validate Downloaded Files
    </button>
    <p v-if="message">{{ message }}</p>
    
    <!-- Tabbed Results Display -->
    <div v-if="scanStatus === 'done' && checkedFiles.length" class="scan-results-container">
      <h2>Scan Results</h2>
      
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['tab-button', { active: activeTab === tab.key }]"
        >
          {{ tab.label }} ({{ getTabCount(tab.key) }})
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="tab-content">
        <div v-for="tab in tabs" :key="tab.key" v-show="activeTab === tab.key" class="tab-panel">
          <h3>{{ tab.label }} Files</h3>
          <div v-if="getTabFiles(tab.key).length === 0" class="no-files">
            No {{ tab.label.toLowerCase() }} files found.
          </div>
          <table v-else class="scan-table">
            <thead>
              <tr>
                <th>Full Path</th>
                <th>Status</th>
                <th>Base Name</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(file, idx) in getTabFiles(tab.key)" :key="file.fullPath + idx">
                <td>{{ file.fullPath }}</td>
                <td>
                  <span :class="getStatusClass(file.status)">{{ file.status }}</span>
                </td>
                <td>{{ file.baseName }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div v-if="markDownloadedMsg" class="mark-msg">{{ markDownloadedMsg }}</div>
    </div>
    
    <!-- Validation Results Display -->
    <div v-if="validationResults" class="validation-results-container">
      <h2>Validation Results</h2>
      
      <div class="validation-summary">
        <p><strong>Total files checked:</strong> {{ validationResults.total }}</p>
        <p><strong>Files validated successfully:</strong> {{ validationResults.validated }}</p>
        <p><strong>Files with mismatches:</strong> {{ validationResults.mismatches ? validationResults.mismatches.length : 0 }}</p>
        <p><strong>Errors encountered:</strong> {{ validationResults.errors ? validationResults.errors.length : 0 }}</p>
      </div>
      
      <!-- Mismatches Table -->
      <div v-if="validationResults.mismatches && validationResults.mismatches.length > 0" class="mismatches-section">
        <h3>Mismatches Found</h3>
        <table class="validation-table">
          <thead>
            <tr>
              <th>Database Filename</th>
              <th>Model Version ID</th>
              <th>Database File Path</th>
              <th>Actual Filename</th>
              <th>Issue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(mismatch, idx) in validationResults.mismatches" :key="idx">
              <td>{{ mismatch.fileName }}</td>
              <td>{{ mismatch.modelVersionId }}</td>
              <td>{{ mismatch.file_path }}</td>
              <td>{{ mismatch.actualFileName || 'N/A' }}</td>
              <td>
                <span class="issue-badge">{{ mismatch.issue }}</span>
                <div v-if="mismatch.expectedFileName" class="expected-info">
                  Expected: {{ mismatch.expectedFileName }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Errors Table -->
      <div v-if="validationResults.errors && validationResults.errors.length > 0" class="errors-section">
        <h3>Errors Encountered</h3>
        <table class="validation-table">
          <thead>
            <tr>
              <th>Database Filename</th>
              <th>Model Version ID</th>
              <th>Error Message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(error, idx) in validationResults.errors" :key="idx">
              <td>{{ error.fileName }}</td>
              <td>{{ error.modelVersionId }}</td>
              <td class="error-message">{{ error.error }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';

export default {
  name: 'FileScanner',
  setup() {
    const errorHandler = useErrorHandler();
    return { errorHandler };
  },
  data() {
    return {
      directoryPath: '',
      message: '',
      savedPaths: [],
      scanStatus: '',
      checkedFiles: [], // [{ fullPath, baseName, status }]
      markingDownloaded: false,
      markDownloadedMsg: '',
      activeTab: 'present', // Default active tab
      tabs: [
        { key: 'present', label: 'Present' },
        { key: 'not-present', label: 'Not Present' }
      ],
      validatingFiles: false,
      validationResults: null,
      // Race condition protection
      pendingOperations: new Map(),
      concurrentOperations: new Set()
    };
  },
  methods: {
    // Race condition protection methods
    cancelPendingOperation(operationId) {
      const controller = this.pendingOperations.get(operationId);
      if (controller) {
        controller.abort();
        this.pendingOperations.delete(operationId);
        console.log(`Cancelled pending operation: ${operationId}`);
      }
    },
    
    createOperationController(operationId) {
      const controller = new AbortController();
      this.pendingOperations.set(operationId, controller);
      return controller.signal;
    },
    
    removeOperationController(operationId) {
      this.pendingOperations.delete(operationId);
    },
    
    isOperationInProgress(operationId) {
      return this.concurrentOperations.has(operationId);
    },
    
    startOperation(operationId) {
      if (this.concurrentOperations.has(operationId)) {
        throw new Error(`Operation ${operationId} is already in progress`);
      }
      this.concurrentOperations.add(operationId);
    },
    
    endOperation(operationId) {
      this.concurrentOperations.delete(operationId);
    },
    
    // New methods for tab functionality
    getTabFiles(tabKey) {
      return this.checkedFiles.filter(file => {
        switch (tabKey) {
          case 'present':
            return file.status === 'Present';
          case 'not-present':
            return !file.status || file.status === '';
          default:
            return false;
        }
      });
    },
    
    getTabCount(tabKey) {
      return this.getTabFiles(tabKey).length;
    },
    
    getStatusClass(status) {
      if (status === 'Present') {
        return 'status-present';
      } else if (!status || status === '') {
        return 'status-not-present';
      }
      return 'status-unknown';
    },
    
    async savePath() {
      if (!this.directoryPath) {
        this.message = 'Please enter a directory path.';
        return;
      }
      try {
        const data = await apiService.savePathLegacy(this.directoryPath);
        this.message = 'Path saved successfully!';
        this.errorHandler.handleSuccess('Path saved successfully');
        this.fetchSavedPaths();
        this.directoryPath = '';
      } catch (error) {
        this.errorHandler.handleError(error, 'saving path');
        this.message = 'Error: ' + error.message;
      }
    },
    async fetchSavedPaths() {
      try {
        const data = await apiService.getSavedPathsLegacy();
        console.log('Fetched saved paths:', data);
        if (Array.isArray(data.paths)) {
          this.savedPaths = data.paths;
          console.log('Saved paths loaded:', this.savedPaths);
        } else {
          this.savedPaths = [];
          console.log('No saved paths found or invalid format');
        }
      } catch (error) {
        this.errorHandler.handleError(error, 'fetching saved paths', { showNotification: false });
        this.savedPaths = [];
      }
    },
    async deletePath(path) {
      try {
        const data = await apiService.deletePathLegacy(path);
        this.message = 'Path deleted successfully!';
        this.errorHandler.handleSuccess('Path deleted successfully');
        this.fetchSavedPaths();
      } catch (error) {
        this.errorHandler.handleError(error, 'deleting path');
        this.message = 'Error: ' + error.message;
      }
    },
    async startScan() {
      const operationId = 'startScan';
      
      if (this.isOperationInProgress(operationId)) {
        console.log('Scan operation already in progress, skipping...');
        return;
      }
      
      // Check if there are saved paths to scan
      if (!this.savedPaths || this.savedPaths.length === 0) {
        this.message = 'No saved paths to scan. Please add some paths first.';
        this.errorHandler.handleWarning('No saved paths to scan. Please add some paths first.');
        return;
      }
      
      // Cancel any existing scan operation
      this.cancelPendingOperation(operationId);
      
      this.startOperation(operationId);
      this.scanStatus = 'scanning';
      this.message = 'Scanning...';
      this.checkedFiles = [];
      
      try {
        const signal = this.createOperationController(operationId);
        const response = await apiService.startScan({ signal });
        
        console.log('Scan API response:', response);
        
        // Update results if this operation is still active
        if (this.concurrentOperations.has(operationId)) {
          this.scanStatus = 'done';
          this.message = 'Scan completed!';
          
          // Handle the correct response structure: { results: [...] }
          const scanData = response.results || response;
          console.log('Starting checkFilesInDb with data:', scanData);
          await this.checkFilesInDb(scanData);
          console.log('After checkFilesInDb, checkedFiles:', this.checkedFiles);
        }
        
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Scan operation was cancelled');
          return;
        }
        this.errorHandler.handleError(error, 'starting scan');
        this.scanStatus = 'error';
        this.message = 'Scan failed!';
      } finally {
        this.endOperation(operationId);
        this.removeOperationController(operationId);
      }
    },
    async checkFilesInDb(scanResults) {
      const operationId = 'checkFilesInDb';
      
      if (this.isOperationInProgress(operationId)) {
        console.log('File check operation already in progress, skipping...');
        return;
      }
      
      // Cancel any existing check operation
      this.cancelPendingOperation(operationId);
      
      this.startOperation(operationId);
      
      console.log('checkFilesInDb received scanResults:', scanResults);
      
      // Get files from the scan results
      let files = [];
      if (scanResults && Array.isArray(scanResults)) {
        for (const result of scanResults) {
          if (result && Array.isArray(result.files)) {
            files = files.concat(result.files.map(f => ({
              fullPath: f,
              baseName: f.split(/\\|\//).pop() || f
            })));
          }
        }
      }
      
      console.log('Extracted files from scanResults:', files);
      
      if (!files.length) {
        console.log('No files found, setting empty checkedFiles');
        this.checkedFiles = [];
        this.endOperation(operationId);
        return;
      }
      
      try {
        const signal = this.createOperationController(operationId);
        const data = await apiService.checkFilesInDb(files, { signal });
        
        console.log('checkFilesInDb API response:', data);
        
        // Update results if this operation is still active
        if (this.concurrentOperations.has(operationId)) {
          if (Array.isArray(data.results)) {
            this.checkedFiles = data.results;
            console.log('Updated checkedFiles with results:', this.checkedFiles);
          } else {
            this.checkedFiles = [];
            console.log('No results array, setting empty checkedFiles');
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('File check operation was cancelled');
          return;
        }
        this.errorHandler.handleError(error, 'checking files in database', { showNotification: false });
        this.checkedFiles = [];
      } finally {
        this.endOperation(operationId);
        this.removeOperationController(operationId);
      }
    },
    async markDownloaded() {
      this.markingDownloaded = true;
      this.markDownloadedMsg = '';
      try {
        const data = await apiService.markDownloaded(this.checkedFiles);
        if (typeof data.updated === 'number') {
          this.markDownloadedMsg = `Updated ${data.updated} row(s) in DB.`;
          this.errorHandler.handleSuccess(`Updated ${data.updated} row(s) in database`);
          if (data.errors && data.errors.length) {
            this.markDownloadedMsg += ' Errors: ' + data.errors.map(e => e.fileName + ': ' + e.error).join('; ');
            this.errorHandler.handleWarning(`Some files had errors: ${data.errors.length} errors encountered`);
          }
        } else {
          const errorMsg = data.error || 'Failed to update DB.';
          this.markDownloadedMsg = errorMsg;
          this.errorHandler.handleError(new Error(errorMsg), 'marking files as downloaded');
        }
      } catch (error) {
        this.errorHandler.handleError(error, 'marking files as downloaded');
        this.markDownloadedMsg = 'Error: ' + error.message;
      } finally {
        this.markingDownloaded = false;
      }
    },
    async validateDownloadedFiles() {
      this.validatingFiles = true;
      this.markDownloadedMsg = '';
      this.validationResults = null; // Clear previous results
      try {
        const data = await apiService.validateDownloadedFiles();
        this.markDownloadedMsg = `Validation completed. ${data.validated} files validated.`;
        this.errorHandler.handleSuccess(`Validation completed: ${data.validated} files validated`);
        if (data.mismatches && data.mismatches.length > 0) {
          this.markDownloadedMsg += ` Found ${data.mismatches.length} mismatches.`;
          this.errorHandler.handleWarning(`Found ${data.mismatches.length} file mismatches`);
        }
        if (data.errors && data.errors.length > 0) {
          this.markDownloadedMsg += ' Errors: ' + data.errors.map(e => e.fileName + ': ' + e.error).join('; ');
          this.errorHandler.handleWarning(`Validation encountered ${data.errors.length} errors`);
        }
        this.validationResults = data; // Store the full validation results
      } catch (error) {
        this.errorHandler.handleError(error, 'validating downloaded files');
        this.markDownloadedMsg = 'Error: ' + error.message;
      } finally {
        this.validatingFiles = false;
      }
    },
  },
  mounted() {
    this.fetchSavedPaths();
  },
  beforeUnmount() {
    // Cancel all pending operations
    this.pendingOperations.forEach((controller, operationId) => {
      controller.abort();
      console.log(`Cancelled pending operation: ${operationId}`);
    });
    this.pendingOperations.clear();
    
    // Clear concurrent operations
    this.concurrentOperations.clear();
    
    console.log('FileScanner component unmounted, all cleanup completed');
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
.scan-results-container {
  margin-top: 2rem;
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 5px;
}
.tab-navigation {
  display: flex;
  border-bottom: 2px solid #ddd;
  margin-bottom: 1rem;
}
.tab-button {
  background: #f8f8f8;
  border: 1px solid #ddd;
  border-bottom: none;
  padding: 0.75rem 1.5rem;
  margin-right: 0.25rem;
  cursor: pointer;
  border-radius: 5px 5px 0 0;
  font-weight: 500;
}
.tab-button.active {
  background: #fff;
  border-bottom: 2px solid #fff;
  margin-bottom: -2px;
  font-weight: bold;
}
.tab-button:hover:not(.active) {
  background: #e9e9e9;
}
.tab-content {
  background: #fff;
  padding: 1rem;
  border-radius: 0 0 5px 5px;
}
.tab-panel h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}
.no-files {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}
.scan-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.scan-table th, .scan-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.scan-table th {
  background: #f8f8f8;
  font-weight: bold;
}
.status-present {
  color: #5cb85c;
  font-weight: bold;
}
.status-not-present {
  color: #d9534f;
  font-weight: bold;
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
.validate-btn {
  background: #337ab7;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  margin-left: 1rem;
}
.validate-btn:disabled {
  background: #b2d8b2;
  cursor: not-allowed;
}
.validation-results-container {
  margin-top: 2rem;
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 5px;
}
.validation-summary {
  margin-bottom: 1rem;
  color: #333;
}
.mismatches-section {
  margin-bottom: 1rem;
}
.validation-table {
  width: 100%;
  border-collapse: collapse;
}
.validation-table th, .validation-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.validation-table th {
  background: #f8f8f8;
  font-weight: bold;
}
.issue-badge {
  background: #f0ad4e;
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
}
.expected-info {
  font-size: 0.8rem;
  color: #666;
}
.errors-section {
  margin-top: 1rem;
}
.error-message {
  color: #d9534f;
  font-weight: bold;
}
.no-paths-message {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 5px;
  text-align: center;
}
</style> 