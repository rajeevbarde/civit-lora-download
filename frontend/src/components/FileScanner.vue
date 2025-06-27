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
    <button 
      @click="scanUniqueLoras" 
      :disabled="scanningUniqueLoras"
      class="scan-unique-btn"
    >
      {{ scanningUniqueLoras ? 'Scanning...' : 'Scan Unique Loras' }}
    </button>
    <span v-if="scanningUniqueLoras || scanTimer > 0" class="scan-timer" style="display:inline-block;margin-left:1.5rem;font-size:1.1em;color:#007bff;min-width:120px;">
      {{ scanTimer.toFixed(2) }}s
    </span>
    <button 
      @click="validateDownloadedFiles" 
      :disabled="validatingFiles"
      class="validate-btn"
    >
      Validate Registered LoRA
    </button>
    <p v-if="message">{{ message }}</p>
    
    <!-- Tabbed Results Display -->
    <!-- Removed as per instructions -->
    
    <!-- Unique Loras Results Display -->
    <div v-if="uniqueLorasResults || orphanFiles.length" class="unique-loras-container">
      <div class="unique-loras-summary" v-if="uniqueLorasResults && uniqueLorasResults.stats">
        <p><strong>Total files on disk:</strong> {{ uniqueLorasResults.stats.totalDiskFiles }}</p>
      </div>
      <!-- Tab Navigation -->
      <div class="unique-tab-navigation">
        <button 
          v-for="tab in uniqueTabsWithOrphan" 
          :key="tab.key"
          @click="activeUniqueTab = tab.key"
          :class="['unique-tab-button', { active: activeUniqueTab === tab.key }]"
        >
          {{ tab.label }} ({{ getUniqueTabCount(tab.key) }})
        </button>
      </div>
      <!-- Tab Content -->
      <div class="unique-tab-content">
        <div v-for="tab in uniqueTabsWithOrphan" :key="tab.key" v-show="activeUniqueTab === tab.key" class="unique-tab-panel">
          <h3>{{ tab.label }} Files</h3>
          <div v-if="tab.key === 'unique-not-downloaded' && getUniqueTabFiles(tab.key).length">
            <button class="register-btn" @click="registerUnregisteredFiles" :disabled="registering">
              Register
            </button>
            <div v-if="registerResult" class="register-result">
              <span v-if="registerResult.updated > 0">{{ registerResult.updated }} file(s) registered successfully.</span>
              <span v-if="registerResult.errors && registerResult.errors.length > 0" style="color: #d9534f;"> {{ registerResult.errors.length }} error(s) occurred.</span>
            </div>
          </div>
          <div v-if="getUniqueTabFiles(tab.key).length === 0" class="no-unique-files">
            No {{ tab.label.toLowerCase() }} files found.
          </div>
          <table v-else class="unique-loras-table">
            <thead>
              <tr>
                <th>Full Path</th>
                <th v-if="tab.key !== 'orphan'">Base Name</th>
                <th v-if="tab.key !== 'orphan'">Status</th>
                <th v-if="tab.key !== 'orphan'">Downloaded</th>
                <th v-if="tab.key === 'orphan'">Base Name</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(file, idx) in getUniqueTabFiles(tab.key)" :key="file.fullPath + idx">
                <td>{{ file.fullPath }}</td>
                <td v-if="tab.key !== 'orphan'">{{ file.baseName }}</td>
                <td v-if="tab.key !== 'orphan'">
                  <span :class="getStatusClass(file.status)">{{ file.status }}</span>
                </td>
                <td v-if="tab.key !== 'orphan'">
                  <span :class="getDownloadedClass(file.isDownloaded)">
                    {{ file.isDownloaded }}
                  </span>
                </td>
                <td v-if="tab.key === 'orphan'">{{ file.baseName }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
      validatingFiles: false,
      validationResults: null,
      // Race condition protection
      pendingOperations: new Map(),
      concurrentOperations: new Set(),
      scanningUniqueLoras: false,
      uniqueLorasResults: null,
      activeUniqueTab: 'unique-downloaded',
      uniqueTabs: [
        { key: 'unique-downloaded', label: 'Registered in DB' },
        { key: 'unique-not-downloaded', label: 'Not Registered in DB' },
        { key: 'duplicate-issues', label: 'Duplicate Issues' }
      ],
      orphanFiles: [], // Store orphan files
      orphanScanStatus: '',
      registering: false,
      registerResult: null,
      scanTimer: 0,
      scanStartTime: null,
      scanInterval: null,
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
      if (tabKey === 'unique') {
        return (this.uniqueLorasResults && this.uniqueLorasResults.uniqueFiles) ? this.uniqueLorasResults.uniqueFiles : [];
      }
      if (tabKey === 'orphan') {
        return this.orphanFiles;
      }
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
      } else if (status === 'Unique') {
        return 'status-unique';
      } else if (status === 'Duplicate Issue' || status === 'Duplicate on Disk' || status === 'Duplicate in DB' || status === 'Duplicate on Disk & DB') {
        return 'status-non-unique';
      }
      return 'status-unknown';
    },
    
    getDownloadedClass(isDownloaded) {
      return isDownloaded ? 'status-downloaded' : 'status-not-downloaded';
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
    async validateDownloadedFiles() {
      this.validatingFiles = true;
      this.validationResults = null; // Clear previous results
      try {
        const data = await apiService.validateDownloadedFiles();
        this.validationResults = data; // Store the full validation results
      } catch (error) {
        this.errorHandler.handleError(error, 'validating downloaded files');
      } finally {
        this.validatingFiles = false;
      }
    },
    async scanUniqueLoras() {
      const operationId = 'scanUniqueLoras';
      if (this.isOperationInProgress(operationId)) {
        console.log('Unique loras scan operation already in progress, skipping...');
        return;
      }
      if (!this.savedPaths || this.savedPaths.length === 0) {
        this.message = 'No saved paths to scan. Please add some paths first.';
        this.errorHandler.handleWarning('No saved paths to scan. Please add some paths first.');
        return;
      }
      this.cancelPendingOperation(operationId);
      this.startOperation(operationId);
      this.scanningUniqueLoras = true;
      this.message = 'Scanning for unique loras...';
      this.uniqueLorasResults = null;
      // Start timer
      this.scanStartTime = performance.now();
      this.scanTimer = 0;
      if (this.scanInterval) clearInterval(this.scanInterval);
      this.scanInterval = setInterval(() => {
        if (this.scanningUniqueLoras && this.scanStartTime) {
          this.scanTimer = (performance.now() - this.scanStartTime) / 1000;
        }
      }, 10);
      try {
        const signal = this.createOperationController(operationId);
        const data = await apiService.scanUniqueLoras({ signal });
        console.log('Unique loras scan API response:', data);
        if (this.concurrentOperations.has(operationId)) {
          this.uniqueLorasResults = data;
          // Trigger orphan scan after unique loras scan
          await this.scanOrphanFiles();
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Unique loras scan operation was cancelled');
          return;
        }
        this.errorHandler.handleError(error, 'scanning unique loras');
        this.message = 'Unique loras scan failed!';
      } finally {
        this.endOperation(operationId);
        this.removeOperationController(operationId);
        this.scanningUniqueLoras = false;
        // Stop timer
        if (this.scanInterval) clearInterval(this.scanInterval);
        if (this.scanStartTime) this.scanTimer = (performance.now() - this.scanStartTime) / 1000;
        this.scanInterval = null;
        this.scanStartTime = null;
        // Clear message if not an error
        if (this.message === 'Scanning for unique loras...') {
          this.message = '';
        }
      }
    },
    getUniqueTabFiles(tabKey) {
      if (!this.uniqueLorasResults || !this.uniqueLorasResults.uniqueFiles) {
        if (tabKey === 'orphan') {
          return this.orphanFiles;
        }
        return [];
      }
      if (tabKey === 'orphan') {
        return this.orphanFiles;
      }
      return this.uniqueLorasResults.uniqueFiles.filter(file => {
        switch (tabKey) {
          case 'unique-downloaded':
            return file.status === 'Unique' && file.isDownloaded === 1;
          case 'unique-not-downloaded':
            return file.status === 'Unique' && file.isDownloaded === 0;
          case 'duplicate-issues':
            return file.status !== 'Unique';
          default:
            return false;
        }
      });
    },
    getUniqueTabCount(tabKey) {
      return this.getUniqueTabFiles(tabKey).length;
    },
    async scanOrphanFiles() {
      this.orphanScanStatus = 'scanning';
      this.orphanFiles = [];
      try {
        const data = await apiService.findMissingFiles();
        if (data && Array.isArray(data.missingFiles)) {
          this.orphanFiles = data.missingFiles.map(f => ({
            fullPath: f.fullPath,
            baseName: f.fileName
          }));
        } else {
          this.orphanFiles = [];
        }
        this.orphanScanStatus = 'done';
      } catch (error) {
        this.errorHandler.handleError(error, 'scanning orphan files');
        this.orphanScanStatus = 'error';
      }
    },
    async registerUnregisteredFiles() {
      this.registering = true;
      this.registerResult = null;
      try {
        const files = this.getUniqueTabFiles('unique-not-downloaded');
        const payload = files.map(f => ({ baseName: f.baseName, fullPath: f.fullPath }));
        const result = await apiService.registerUnregisteredFiles(payload);
        if (result && result.updated > 0) {
          this.errorHandler.handleSuccess(`Registered ${result.updated} files successfully.`);
          this.registerResult = { updated: result.updated, errors: result.errors };
          // Refresh unique loras after registration
          await this.scanUniqueLoras();
        } else {
          this.errorHandler.handleWarning('No files were registered.');
          this.registerResult = { updated: 0, errors: result && result.errors ? result.errors : [] };
        }
      } catch (error) {
        this.errorHandler.handleError(error, 'registering unregistered files');
        this.registerResult = { updated: 0, errors: [{ error: error.message }] };
      } finally {
        this.registering = false;
      }
    },
  },
  computed: {
    uniqueTabsWithOrphan() {
      return [
        ...this.uniqueTabs,
        { key: 'orphan', label: 'Orphan Files' }
      ];
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
    
    // Clear timer interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
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
.status-unique {
  color: #5bc0de;
  font-weight: bold;
}
.status-non-unique {
  color: #f0ad4e;
  font-weight: bold;
}
.status-downloaded {
  color: #5cb85c;
  font-weight: bold;
}
.status-not-downloaded {
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
.scan-unique-btn {
  background: #337ab7;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  margin-left: 1rem;
}
.scan-unique-btn:disabled {
  background: #b2d8b2;
  cursor: not-allowed;
}
.unique-loras-container {
  margin-top: 2rem;
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 5px;
}
.unique-loras-summary {
  margin-bottom: 1rem;
  color: #333;
}
.unique-tab-navigation {
  display: flex;
  border-bottom: 2px solid #ddd;
  margin-bottom: 1rem;
}
.unique-tab-button {
  background: #f8f8f8;
  border: 1px solid #ddd;
  border-bottom: none;
  padding: 0.75rem 1.5rem;
  margin-right: 0.25rem;
  cursor: pointer;
  border-radius: 5px 5px 0 0;
  font-weight: 500;
}
.unique-tab-button.active {
  background: #fff;
  border-bottom: 2px solid #fff;
  margin-bottom: -2px;
  font-weight: bold;
}
.unique-tab-button:hover:not(.active) {
  background: #e9e9e9;
}
.unique-tab-content {
  background: #fff;
  padding: 1rem;
  border-radius: 0 0 5px 5px;
}
.unique-tab-panel h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}
.no-unique-files {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}
.unique-loras-table {
  width: 100%;
  border-collapse: collapse;
}
.unique-loras-table th, .unique-loras-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.unique-loras-table th {
  background: #f8f8f8;
  font-weight: bold;
}
.register-btn {
  background: #5cb85c;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
}
.register-btn:disabled {
  background: #b2d8b2;
  cursor: not-allowed;
}
.register-result {
  margin-top: 0.5rem;
  font-weight: bold;
}
.scan-timer {
  display: inline-block;
  margin-left: 1.5rem;
  font-size: 1.1em;
  color: #007bff;
  min-width: 120px;
}
</style> 