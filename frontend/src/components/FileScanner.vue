<template>
  <div class="lora-scanner-page">
    <!-- Enhanced LoRA Folders Section -->
    <div class="folders-section">
      <div class="folders-header">
        <h2 class="folders-title">LoRA Folders</h2>
        <p class="folders-subtitle">Manage your LoRA directory paths for scanning and validation</p>
      </div>
      
      <!-- Saved Paths Display -->
      <div v-if="savedPaths.length" class="saved-paths-container">
        <div class="paths-header">
          <span class="paths-icon">📁</span>
          <span class="paths-label">Existing LoRA Folders</span>
          <span class="paths-count">({{ savedPaths.length }})</span>
        </div>
        <div class="paths-list">
          <div v-for="(p, idx) in savedPaths" :key="idx" class="path-item">
            <div class="path-content">
              <span class="path-icon">📂</span>
              <span class="path-text">{{ p }}</span>
            </div>
            <button class="delete-path-btn" @click="deletePath(p)" title="Delete this path">
              <span class="delete-icon">🗑️</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- No Paths Message -->
      <div v-else class="no-paths-container">
        <div class="no-paths-content">
          <span class="no-paths-icon">📁</span>
          <h3 class="no-paths-title">No Saved Paths</h3>
          <p class="no-paths-message">Please add a directory path below to get started with LoRA scanning.</p>
        </div>
      </div>
      
      <!-- Add New Path Section -->
      <div class="add-path-section">
        <div class="add-path-header">
          <span class="add-path-icon">➕</span>
          <span class="add-path-label">Add existing LoRA folders containing files</span>
        </div>
        <div class="add-path-form">
          <div class="input-group">
            <input
              v-model="directoryPath"
              type="text"
              placeholder="Enter full Windows directory path (e.g., C:\Users\YourName\Documents\LoRA)"
              class="directory-input"
            />
            <button @click="savePath" class="save-path-btn">
              <span class="save-icon">💾</span>
              <span class="save-text">Save Path</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <hr style="margin: 1.5rem 0;" />
    
    <!-- Enhanced Action Section -->
    <div class="action-section">
      <div class="action-header">
        <h2 class="action-title">Scan and Register LoRA</h2>
        <p class="action-subtitle">Validate existing LoRA files and discover new ones</p>
      </div>
      
      <div class="action-buttons">
        <div class="button-group">
          <button 
            @click="scanUniqueLoras" 
            :disabled="scanningUniqueLoras"
            class="action-btn primary-btn"
          >
            <span class="btn-icon">🔍</span>
            <span class="btn-text">{{ scanningUniqueLoras ? 'Scanning...' : 'Scan Files' }}</span>
          </button>
          
          <div v-if="scanningUniqueLoras || scanTimer > 0" class="timer-display">
            <span class="timer-icon">⏱️</span>
            <span class="timer-text">{{ scanTimer.toFixed(2) }}s</span>
          </div>
        </div>
        
        <div class="button-group">
          <button 
            @click="validateDownloadedFiles" 
            :disabled="validatingFiles"
            class="action-btn secondary-btn"
          >
            <span class="btn-icon">✅</span>
            <span class="btn-text">{{ validatingFiles ? 'Validating...' : 'Validate Files' }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <p v-if="message">{{ message }}</p>
    
    <!-- Tabbed Results Display -->
    <!-- Removed as per instructions -->
    
    <!-- Unique Loras Results Display -->
    <div v-if="uniqueLorasResults || orphanFiles.length" class="unique-loras-container">
      <div class="unique-loras-summary" v-if="uniqueLorasResults && uniqueLorasResults.stats">
        <p><strong>Total LoRA files on disk:</strong> {{ uniqueLorasResults.stats.totalDiskFiles }}</p>
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
          <template v-if="tab.key === 'unique-downloaded'">
            <div style="font-weight: 500; margin-bottom: 1rem; color: #2d3748;">
              LoRA files are registered with Civitai db. They do not have duplicate issues.
            </div>
          </template>
          <template v-else-if="tab.key === 'unique-not-downloaded'">
            <div style="font-weight: 500; margin-bottom: 1rem; color: #2d3748;">
              LoRA files are present in your hdd but not registered with db. They do not have duplicate issues.
            </div>
          </template>
          <template v-else-if="tab.key === 'duplicate-issues'">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; font-weight: 500; color: #2d3748;">
              <span>Wierd duplicate Issues</span>
              <router-link to="/civit-data-fetcher" style="color: #337ab7; text-decoration: underline; font-weight: 500;">Fix it.</router-link>
            </div>
          </template>
          <template v-else-if="tab.key === 'orphan'">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; font-weight: 500; color: #2d3748;">
              <span>LoRA files present in harddrive but does not exist in Civitai db.</span>
              <router-link to="/civit-data-fetcher" style="color: #337ab7; text-decoration: underline; font-weight: 500;">Fix it.</router-link>
            </div>
          </template>
          <div v-if="tab.key === 'unique-not-downloaded' && getUniqueTabFiles(tab.key).length">
            <button class="register-btn" @click="registerUnregisteredFiles" :disabled="registering">
              Register
            </button>
            <span v-if="registering || registerTimer > 0" class="register-timer" style="display:inline-block;margin-left:1.5rem;font-size:1.1em;color:#007bff;min-width:120px;">
              {{ registerTimer.toFixed(2) }}s elapsed
              <span v-if="registerPredictedSeconds > 0"> | Predicted: {{ Math.floor(registerPredictedSeconds / 60) }}m {{ (registerPredictedSeconds % 60) }}s</span>
            </span>
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
                <th v-if="tab.key === 'unique-downloaded' || tab.key === 'unique-not-downloaded'">Full path in harddrive</th>
                <th v-else>Full Path</th>
                <th v-if="tab.key === 'unique-downloaded' || tab.key === 'unique-not-downloaded'">File name in db</th>
                <th v-else-if="tab.key === 'duplicate-issues'">File name</th>
                <th>Fix it! (Retry from Lora hub)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(file, idx) in getUniqueTabFiles(tab.key)" :key="file.fullPath + idx">
                <td v-if="tab.key === 'unique-downloaded' || tab.key === 'unique-not-downloaded'">{{ file.fullPath }}</td>
                <td v-else>{{ file.fullPath }}</td>
                <td v-if="tab.key === 'unique-downloaded' || tab.key === 'unique-not-downloaded'">{{ file.baseName }}</td>
                <td v-else-if="tab.key === 'duplicate-issues'">{{ file.baseName }}</td>
                <td>
                  <button class="delete-failed-btn" @click="handleDeleteFileAndFail(file, idx)" :disabled="file.deleting">
                    {{ file.deleting ? 'Processing...' : 'Delete File and Failed' }}
                  </button>
                  <span v-if="file.deleteError" class="delete-error">{{ file.deleteError }}</span>
                </td>
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
              <th>DB Size (GB)</th>
              <th>Disk Size (GB)</th>
              <th>Issue</th>
              <th>Fix it! (Retry from Lora hub)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(mismatch, idx) in validationResults.mismatches" :key="idx">
              <td>{{ mismatch.fileName }}</td>
              <td>{{ mismatch.modelVersionId }}</td>
              <td>{{ mismatch.file_path }}</td>
              <td>{{ mismatch.actualFileName || 'N/A' }}</td>
              <td>{{ mismatch.size_in_kb_db !== undefined ? (mismatch.size_in_kb_db / 1024 / 1024).toFixed(2) : '' }}</td>
              <td>{{ mismatch.size_in_kb_disk !== undefined ? (mismatch.size_in_kb_disk / 1024 / 1024).toFixed(2) : '' }}</td>
              <td>
                <span class="issue-badge">{{ mismatch.issue }}</span>
                <div v-if="mismatch.expectedFileName" class="expected-info">
                  Expected: {{ mismatch.expectedFileName }}
                </div>
              </td>
              <td>
                <button class="delete-failed-btn" @click="handleDeleteFileAndFail(mismatch, idx)" :disabled="mismatch.deleting">
                  {{ mismatch.deleting ? 'Processing...' : 'Delete File and Failed' }}
                </button>
                <span v-if="mismatch.deleteError" class="delete-error">{{ mismatch.deleteError }}</span>
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
  name: 'LoRAScanner',
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
        { key: 'unique-downloaded', label: 'LoRA Registered with Civitai db' },
        { key: 'unique-not-downloaded', label: 'LoRA not Registered' },
        { key: 'duplicate-issues', label: 'Duplicate Issues' }
      ],
      orphanFiles: [], // Store orphan files
      orphanScanStatus: '',
      registering: false,
      registerResult: null,
      scanTimer: 0,
      scanStartTime: null,
      scanInterval: null,
      // Registration timer and prediction
      registerTimer: 0,
      registerStartTime: null,
      registerInterval: null,
      registerPredictedSeconds: 0,
    };
  },
  methods: {
    // Race condition protection methods
    cancelPendingOperation(operationId) {
      const controller = this.pendingOperations.get(operationId);
      if (controller) {
        controller.abort();
        this.pendingOperations.delete(operationId);
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
        if (Array.isArray(data.paths)) {
          this.savedPaths = data.paths;
        } else {
          this.savedPaths = [];
        }
      } catch (error) {
        this.errorHandler.handleError(error, 'fetching saved paths', { showNotification: false });
        this.savedPaths = [];
      }
    },
    async deletePath(path) {
      try {
        const data = await apiService.deletePathLegacy(path);
        this.errorHandler.handleSuccess('Path deleted successfully');
        this.fetchSavedPaths();
      } catch (error) {
        this.errorHandler.handleError(error, 'deleting path');
        this.message = 'Error: ' + error.message;
      }
    },
    async validateDownloadedFiles() {
      this.uniqueLorasResults = null;
      this.orphanFiles = [];
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
      this.validationResults = null;
      const operationId = 'scanUniqueLoras';
      if (this.isOperationInProgress(operationId)) {
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
        if (this.concurrentOperations.has(operationId)) {
          this.uniqueLorasResults = data;
          // Trigger orphan scan after unique loras scan
          await this.scanOrphanFiles();
        }
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
      // Timer logic
      this.registerTimer = 0;
      this.registerStartTime = performance.now();
      if (this.registerInterval) clearInterval(this.registerInterval);
      this.registerInterval = setInterval(() => {
        if (this.registering && this.registerStartTime) {
          this.registerTimer = (performance.now() - this.registerStartTime) / 1000;
        }
      }, 10);
      try {
        const files = this.getUniqueTabFiles('unique-not-downloaded');
        const payload = files.map(f => ({ baseName: f.baseName, fullPath: f.fullPath }));
        // Prediction: 1 file = 1 sec
        this.registerPredictedSeconds = files.length;
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
        // Stop timer
        if (this.registerInterval) clearInterval(this.registerInterval);
        if (this.registerStartTime) this.registerTimer = (performance.now() - this.registerStartTime) / 1000;
        this.registerInterval = null;
        this.registerStartTime = null;
      }
    },
    async handleDeleteFileAndFail(mismatch, idx) {
      this.$set(this.validationResults.mismatches[idx], 'deleting', true);
      this.$set(this.validationResults.mismatches[idx], 'deleteError', '');
      try {
        await apiService.deleteFileAndFail({ modelVersionId: mismatch.modelVersionId, file_path: mismatch.file_path });
        // Remove the row from mismatches after successful deletion
        this.validationResults.mismatches.splice(idx, 1);
        this.$forceUpdate();
        this.errorHandler.handleSuccess('File deleted and marked as failed.');
      } catch (error) {
        this.$set(this.validationResults.mismatches[idx], 'deleteError', error.response?.data?.error || error.message || 'Failed to delete and mark as failed.');
      } finally {
        if (this.validationResults.mismatches[idx]) {
          this.$set(this.validationResults.mismatches[idx], 'deleting', false);
        }
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
    });
    this.pendingOperations.clear();
    
    // Clear concurrent operations
    this.concurrentOperations.clear();
    
    // Clear timer interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
};
</script>

<style scoped>
.lora-scanner-page {
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
.saved-paths-container {
  margin-bottom: 1rem;
  color: #333;
}
.paths-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}
.paths-icon {
  margin-right: 0.5rem;
}
.paths-label {
  font-weight: bold;
}
.paths-count {
  font-size: 0.8rem;
  color: #666;
}
.paths-list {
  display: flex;
  flex-wrap: wrap;
}
.path-item {
  display: flex;
  align-items: center;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}
.path-content {
  display: flex;
  align-items: center;
}
.path-icon {
  margin-right: 0.5rem;
}
.path-text {
  font-weight: 700;
  color: #495057;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  word-break: break-all;
}
.delete-path-btn {
  margin-left: 0.5rem;
  color: #fff;
  background: #d9534f;
  border: none;
  border-radius: 3px;
  padding: 0.2rem 0.7rem;
  cursor: pointer;
}
.no-paths-container {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 5px;
  text-align: center;
}
.no-paths-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.no-paths-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}
.no-paths-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
.no-paths-message {
  font-size: 1rem;
  color: #666;
}
.add-path-section {
  margin-top: 1rem;
}
.add-path-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}
.add-path-icon {
  margin-right: 0.5rem;
}
.add-path-label {
  font-weight: bold;
}
.add-path-form {
  display: flex;
  align-items: center;
}
.input-group {
  display: flex;
  align-items: center;
}
.save-path-btn {
  background: #337ab7;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  margin-left: 1rem;
}
.save-icon {
  margin-right: 0.5rem;
}
.save-text {
  font-weight: 600;
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
.register-timer {
  display: inline-block;
  margin-left: 1.5rem;
  font-size: 1.1em;
  color: #007bff;
  min-width: 120px;
}

/* Enhanced Action Section Styles */
.action-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.action-header {
  text-align: center;
  margin-bottom: 2rem;
}

.action-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.action-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.primary-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.secondary-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.secondary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #e085e8 0%, #e54b5f 100%);
}

.secondary-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-icon {
  font-size: 1.2rem;
}

.btn-text {
  font-weight: 600;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.timer-icon {
  font-size: 1.1rem;
}

.timer-text {
  font-weight: 600;
  color: #667eea;
  font-size: 1rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .action-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .action-title {
    font-size: 1.5rem;
  }
  
  .action-subtitle {
    font-size: 1rem;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 1rem;
  }
  
  .button-group {
    justify-content: center;
  }
  
  .action-btn {
    min-width: 120px;
  }
}

/* Enhanced Folders Section Styles */
.folders-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.folders-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.folders-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.folders-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.saved-paths-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.paths-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.paths-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.paths-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.paths-count {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.paths-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.path-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.path-item:hover {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.path-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.path-icon {
  font-size: 1.2rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.path-text {
  font-weight: 700;
  color: #495057;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  word-break: break-all;
}

.delete-path-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-left: 1rem;
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-path-btn:hover {
  background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.delete-icon {
  font-size: 1rem;
}

.no-paths-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
  text-align: center;
}

.no-paths-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.no-paths-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.no-paths-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
}

.no-paths-message {
  font-size: 1rem;
  color: #6c757d;
  margin: 0;
  line-height: 1.5;
}

.add-path-section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.add-path-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.add-path-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #28a745;
}

.add-path-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.add-path-form {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.input-group {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 1rem;
}

.directory-input {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #fff;
  color: #495057;
}

.directory-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.directory-input::placeholder {
  color: #adb5bd;
  font-style: italic;
}

.save-path-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  justify-content: center;
}

.save-path-btn:hover {
  background: linear-gradient(135deg, #218838 0%, #1ea085 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.save-path-btn:active {
  transform: translateY(0);
}

.save-icon {
  font-size: 1.1rem;
}

.save-text {
  font-weight: 600;
}

/* Responsive design for folders section */
@media (max-width: 768px) {
  .folders-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .folders-title {
    font-size: 1.5rem;
  }
  
  .folders-subtitle {
    font-size: 1rem;
  }
  
  .add-path-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-group {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .save-path-btn {
    width: 100%;
  }
  
  .path-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .delete-path-btn {
    margin-left: 0;
    align-self: flex-end;
  }
}
</style> 