<template>
  <div class="civit-data-fetcher">
    <h1>Orphan LoRA Identifier</h1>
    <p class="page-summary">
      Attempt to check with Civitai, update database and rename file.
    </p>
    
    <div class="controls">
      <button 
        @click="scanForMissingFiles" 
        :disabled="isScanning"
        class="scan-button"
      >
        {{ isScanning ? 'Scanning...' : 'Scan for Orphan Files' }}
      </button>
      <span v-if="isScanning || scanTimer > 0" class="scan-timer" style="display:inline-block;margin-left:1.5rem;font-size:1.1em;color:#007bff;min-width:120px;">
        {{ scanTimer.toFixed(2) }}s
      </span>
      <button 
        @click="onDuplicateIssuesClick"
        :disabled="duplicateIssuesLoading"
        class="scan-button"
        style="margin-left: 1rem; background: #007bff; color: white;"
      >
        {{ duplicateIssuesLoading ? 'Scanning...' : 'Duplicate issues' }}
      </button>
      <span v-if="duplicateIssuesLoading || duplicateTimer > 0" class="scan-timer" style="display:inline-block;margin-left:1.5rem;font-size:1.1em;color:#007bff;min-width:120px;">
        {{ duplicateTimer.toFixed(2) }}s
      </span>
      
      <div v-if="isScanning" class="scan-progress">
        <p>Scanning directories for files not found in database...</p>
      </div>
    </div>

    <!-- Duplicate Issues Tabs -->
    <div v-if="showDuplicateIssues" class="duplicate-issues-section">
      <h2>Duplicate Issues</h2>
      <div v-if="duplicateIssuesLoading">Loading duplicate issues...</div>
      <div v-else-if="duplicateIssuesError" class="error">{{ duplicateIssuesError }}</div>
      <div v-else>
        <div class="duplicate-tabs">
          <button :class="['duplicate-tab', { active: activeDuplicateTab === 'disk' }]" @click="activeDuplicateTab = 'disk'">
            Duplicate on Disk ({{ duplicateOnDisk.length }})
          </button>
          <button :class="['duplicate-tab', { active: activeDuplicateTab === 'db' }]" @click="activeDuplicateTab = 'db'">
            Duplicate in DB ({{ duplicateInDb.length }})
          </button>
          <button :class="['duplicate-tab', { active: activeDuplicateTab === 'diskdb' }]" @click="activeDuplicateTab = 'diskdb'">
            Duplicate on Disk & DB ({{ duplicateOnDiskAndDb.length }})
          </button>
        </div>
        <div class="duplicate-tab-content">
          <div v-show="activeDuplicateTab === 'disk'">
            <table class="unique-loras-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>File Paths</th>
                  <th>Hash Check</th>
                  <th>Identify Metadata</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(group, idx) in duplicateOnDiskGrouped" :key="group.filename + idx">
                  <td>{{ group.filename }}</td>
                  <td>
                    <div v-for="(path, pathIdx) in group.paths" :key="pathIdx" class="file-path-item">
                      {{ path }}
                    </div>
                  </td>
                  <td>
                    <button 
                      @click="checkHashForGroup(group.filename)"
                      :disabled="hashCheckLoading[group.filename]"
                      class="hash-check-btn"
                    >
                      {{ hashCheckLoading[group.filename] ? 'Calculating...' : 'Check Hash' }}
                    </button>
                    <div v-if="hashResults[group.filename]" class="hash-result">
                      {{ hashResults[group.filename] }}
                    </div>
                  </td>
                  <td>
                    <div class="metadata-placeholder">
                      Metadata info will be displayed here
                    </div>
                  </td>
                </tr>
                <tr v-if="duplicateOnDiskGrouped.length === 0"><td colspan="4" class="no-unique-files">No duplicates on disk found.</td></tr>
              </tbody>
            </table>
          </div>
          <div v-show="activeDuplicateTab === 'db'">
            <table class="unique-loras-table">
              <thead>
                <tr>
                  <th>Full Path</th>
                  <th>File Name</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(file, idx) in duplicateInDb" :key="file.fullPath + idx">
                  <td>{{ file.fullPath }}</td>
                  <td>{{ file.baseName }}</td>
                </tr>
                <tr v-if="duplicateInDb.length === 0"><td colspan="2" class="no-unique-files">No duplicates in DB found.</td></tr>
              </tbody>
            </table>
          </div>
          <div v-show="activeDuplicateTab === 'diskdb'">
            <table class="unique-loras-table">
              <thead>
                <tr>
                  <th>Full Path</th>
                  <th>File Name</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(file, idx) in duplicateOnDiskAndDb" :key="file.fullPath + idx">
                  <td>{{ file.fullPath }}</td>
                  <td>{{ file.baseName }}</td>
                </tr>
                <tr v-if="duplicateOnDiskAndDb.length === 0"><td colspan="2" class="no-unique-files">No duplicates on disk & DB found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="scanResults" class="results">
      <div class="summary">
        <h2>Scan Results</h2>
        <div class="stats">
          <div class="stat">
            <span class="label">Total Files Scanned:</span>
            <span class="value">{{ scanResults.totalScanned }}</span>
          </div>
          <div class="stat">
            <span class="label">Files in Database:</span>
            <span class="value">{{ scanResults.totalInDatabase }}</span>
          </div>
          <div class="stat">
            <span class="label">Orphan Files:</span>
            <span class="value missing">{{ scanResults.totalMissing }}</span>
          </div>
        </div>
      </div>

      <div v-if="scanResults.scanErrors && scanResults.scanErrors.length > 0" class="errors">
        <h3>Scan Errors</h3>
        <div class="error-list">
          <div v-for="error in scanResults.scanErrors" :key="error.path" class="error-item">
            <strong>{{ error.path }}</strong>: {{ error.error }}
          </div>
        </div>
      </div>

      <div v-if="scanResults.missingFiles && scanResults.missingFiles.length > 0" class="missing-files">
        <h3>Orphan Files Not Found in Database</h3>
        <p class="warning-message" style="color: #b26a00; margin-bottom: 1em;">
          <strong>Warning:</strong> 'Find and Fix' will search Civitai for metadata. If found, the file will be renamed to match the database entry.
        </p>
        <div class="file-list">
          <div v-for="file in scanResults.missingFiles" :key="file.fullPath" class="file-item">
            <div class="file-info">
              <div class="file-name">{{ file.fileName }}</div>
              <div class="file-path">{{ file.directory }}</div>
              <div v-if="file.status" class="file-status" :class="file.status">
                {{ file.status === 'processing' ? 'Processing...' : 
                   file.status === 'success' ? '✅ Fixed' : 
                   file.status === 'error' ? '❌ Metadata Not found' : '' }}
              </div>
            </div>
            <div class="file-actions">
              <button 
                @click="fixFile(file)" 
                :disabled="file.status === 'processing' || file.status === 'success' || file.status === 'error'"
                class="fix-btn"
                :class="{ 
                  'processing': file.status === 'processing',
                  'success': file.status === 'success',
                  'error': file.status === 'error'
                }"
              >
                {{ file.status === 'processing' ? 'Processing...' : 
                   file.status === 'success' ? '✅ Fixed' : 
                   file.status === 'error' ? '❌ Error' : 'Find and Fix' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="scanResults.totalScanned > 0" class="no-missing">
        <p>✅ All scanned files were found in the database!</p>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';

export default {
  name: 'CivitDataFetcher',
  setup() {
    const errorHandler = useErrorHandler();
    return { errorHandler };
  },
  data() {
    return {
      isScanning: false,
      scanResults: null,
      scanTimer: 0,
      scanStartTime: null,
      scanInterval: null,
      // Race condition protection
      processingFiles: new Set(),
      pendingOperations: new Map(),
      concurrentOperations: new Set(),
      // Duplicate issues state
      duplicateIssuesLoading: false,
      duplicateIssues: null,
      duplicateIssuesError: null,
      showDuplicateIssues: false,
      // Duplicate issues timer
      duplicateTimer: 0,
      duplicateStartTime: null,
      duplicateInterval: null,
      // Tab state for duplicate issues
      activeDuplicateTab: 'disk',
      // Hash check state
      hashCheckLoading: {},
      hashResults: {},
    }
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
    
    isFileProcessing(filePath) {
      return this.processingFiles.has(filePath);
    },
    
    startFileProcessing(filePath) {
      if (this.processingFiles.has(filePath)) {
        throw new Error(`File ${filePath} is already being processed`);
      }
      this.processingFiles.add(filePath);
    },
    
    endFileProcessing(filePath) {
      this.processingFiles.delete(filePath);
    },
    
    async scanForMissingFiles() {
      const operationId = 'scanForMissingFiles';
      if (this.isOperationInProgress(operationId)) {
        console.log('Scan operation already in progress, skipping...');
        return;
      }
      // Clear duplicate issues result when scanning for orphans
      this.duplicateIssues = null;
      this.duplicateIssuesError = null;
      this.showDuplicateIssues = false;
      this.duplicateTimer = 0;
      this.duplicateStartTime = null;
      if (this.duplicateInterval) {
        clearInterval(this.duplicateInterval);
        this.duplicateInterval = null;
      }
      // Cancel any existing scan operation
      this.cancelPendingOperation(operationId);
      this.startOperation(operationId);
      this.isScanning = true;
      this.scanResults = null;
      // Start timer
      this.scanStartTime = performance.now();
      this.scanTimer = 0;
      if (this.scanInterval) clearInterval(this.scanInterval);
      this.scanInterval = setInterval(() => {
        if (this.isScanning && this.scanStartTime) {
          this.scanTimer = (performance.now() - this.scanStartTime) / 1000;
        }
      }, 10);
      try {
        const signal = this.createOperationController(operationId);
        const data = await apiService.findMissingFiles({ signal });
        console.log('Find missing files API response:', data);
        // Update results if this operation is still active
        if (this.concurrentOperations.has(operationId)) {
          this.scanResults = data;
          this.errorHandler.handleSuccess('Scan completed successfully');
          console.log('Scan results updated:', this.scanResults);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Scan operation was cancelled');
          return;
        }
        this.errorHandler.handleError(error, 'scanning for missing files');
      } finally {
        this.isScanning = false;
        if (this.scanInterval) clearInterval(this.scanInterval);
        if (this.scanStartTime) this.scanTimer = (performance.now() - this.scanStartTime) / 1000;
        this.scanInterval = null;
        this.scanStartTime = null;
        this.removeOperationController(operationId);
        this.endOperation(operationId);
      }
    },
    
    async fixFile(file) {
      // Prevent concurrent operations on the same file
      if (this.isFileProcessing(file.fullPath)) {
        console.log(`File ${file.fileName} is already being processed, skipping...`);
        return;
      }
      
      this.startFileProcessing(file.fullPath);
      
      // Set processing status
      file.status = 'processing';
      
      try {
        // Step 1: Compute SHA256 hash of the file
        const hash = await this.computeFileHash(file.fullPath);
        console.log(`Hash for ${file.fileName}: ${hash}`);
        
        // Step 2: Fetch model version ID from CivitAI
        const modelVersionId = await this.fetchModelVersionId(hash);
        console.log(`Model Version ID for ${file.fileName}: ${modelVersionId}`);
        
        // Step 3: Call the fix-file API
        const result = await apiService.fixFile({
          modelVersionId: modelVersionId,
          filePath: file.fullPath
        });
        
        console.log('File fixed successfully:', result);
        
        // Set success status
        file.status = 'success';
        this.errorHandler.handleSuccess(`File ${file.fileName} fixed successfully`);
        
      } catch (error) {
        console.error('Error fixing file:', error);
        file.status = 'error';
        file.errorMessage = error.message;
        this.errorHandler.handleError(error, `fixing file ${file.fileName}`, { showNotification: false });
      } finally {
        this.endFileProcessing(file.fullPath);
      }
    },
    
    async computeFileHash(filePath) {
      try {
        // Use backend endpoint to compute hash
        const data = await apiService.computeFileHash(filePath);
        return data.hash;
        
      } catch (error) {
        this.errorHandler.handleError(error, 'computing file hash');
        throw new Error(`Failed to compute file hash: ${error.message}`);
      }
    },
    
    async fetchModelVersionId(hash) {
      try {
        const url = `https://civitai.com/api/v1/model-versions/by-hash/${hash}`;
        console.log(`Fetching metadata from: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`CivitAI API error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const modelVersionId = data.id;
        
        if (!modelVersionId) {
          throw new Error("Model version ID not found in CivitAI response");
        }
        
        console.log(`✅ CivitAI data retrieved. Model Version ID: ${modelVersionId}`);
        return modelVersionId;
        
      } catch (error) {
        this.errorHandler.handleError(error, 'fetching model version ID from CivitAI');
        throw new Error(`Failed to fetch model version ID: ${error.message}`);
      }
    },
    onDuplicateIssuesClick() {
      // Clear orphan scan result when scanning for duplicates
      this.scanResults = null;
      this.isScanning = false;
      this.scanTimer = 0;
      this.scanStartTime = null;
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      this.fetchDuplicateIssues();
    },
    async fetchDuplicateIssues() {
      this.duplicateIssuesLoading = true;
      this.duplicateIssuesError = null;
      this.showDuplicateIssues = false;
      this.activeDuplicateTab = 'disk';
      // Start timer
      this.duplicateStartTime = performance.now();
      this.duplicateTimer = 0;
      if (this.duplicateInterval) clearInterval(this.duplicateInterval);
      this.duplicateInterval = setInterval(() => {
        if (this.duplicateIssuesLoading && this.duplicateStartTime) {
          this.duplicateTimer = (performance.now() - this.duplicateStartTime) / 1000;
        }
      }, 10);
      try {
        const data = await apiService.scanUniqueLoras();
        if (data && Array.isArray(data.uniqueFiles)) {
          this.duplicateIssues = data.uniqueFiles.filter(f => f.status !== 'Unique');
        } else {
          this.duplicateIssues = [];
        }
        this.showDuplicateIssues = true;
      } catch (error) {
        this.duplicateIssuesError = error.message || 'Failed to fetch duplicate issues.';
        this.duplicateIssues = [];
        this.showDuplicateIssues = true;
      } finally {
        this.duplicateIssuesLoading = false;
        if (this.duplicateInterval) clearInterval(this.duplicateInterval);
        if (this.duplicateStartTime) this.duplicateTimer = (performance.now() - this.duplicateStartTime) / 1000;
        this.duplicateInterval = null;
        this.duplicateStartTime = null;
      }
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
    async checkHashForGroup(filename) {
      if (this.hashCheckLoading[filename]) return;
      
      this.hashCheckLoading[filename] = true;
      this.hashResults[filename] = null;
      
      try {
        const group = this.duplicateOnDiskGrouped.find(g => g.filename === filename);
        if (!group) return;
        
        const hashPromises = group.paths.map(async (path) => {
          try {
            const data = await apiService.computeFileHash(path);
            return { path, hash: data.hash };
          } catch (error) {
            return { path, hash: null, error: error.message };
          }
        });
        
        const results = await Promise.all(hashPromises);
        const hashes = results.map(r => r.hash).filter(h => h !== null);
        const errors = results.filter(r => r.error);
        
        let resultText = '';
        if (errors.length > 0) {
          resultText = `Error: ${errors.length} file(s) failed to hash`;
        } else if (hashes.length === 0) {
          resultText = 'No valid hashes computed';
        } else {
          const uniqueHashes = new Set(hashes);
          if (uniqueHashes.size === 1) {
            resultText = '✅ Identical ';
          } else {
            resultText = `❌ Files have different hashes (${uniqueHashes.size} unique hashes)`;
          }
        }
        
        this.hashResults[filename] = resultText;
      } catch (error) {
        this.hashResults[filename] = `Error: ${error.message}`;
      } finally {
        this.hashCheckLoading[filename] = false;
      }
    },
  },
  computed: {
    duplicateOnDisk() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate on Disk');
    },
    duplicateInDb() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate in DB');
    },
    duplicateOnDiskAndDb() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate on Disk & DB');
    },
    duplicateOnDiskGrouped() {
      const grouped = {};
      this.duplicateOnDisk.forEach(file => {
        if (!grouped[file.baseName]) {
          grouped[file.baseName] = [];
        }
        grouped[file.baseName].push(file.fullPath);
      });
      return Object.entries(grouped)
        .map(([filename, paths]) => ({ filename, paths: paths.sort() }))
        .sort((a, b) => a.filename.localeCompare(b.filename));
    },
  },
  beforeUnmount() {
    // Cancel all pending operations
    this.pendingOperations.forEach((controller, operationId) => {
      controller.abort();
      console.log(`Cancelled pending operation: ${operationId}`);
    });
    this.pendingOperations.clear();
    
    // Clear processing states
    this.processingFiles.clear();
    
    // Clear concurrent operations
    this.concurrentOperations.clear();
    
    console.log('CivitDataFetcher component unmounted, all cleanup completed');
  }
}
</script>

<style scoped>
.civit-data-fetcher {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.controls {
  margin-top: 2.5rem;
  margin-bottom: 2rem;
}

.scan-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.scan-button:hover:not(:disabled) {
  background: #0056b3;
}

.scan-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.scan-progress {
  margin-top: 1rem;
  color: #666;
}

.results {
  margin-top: 2rem;
}

.summary {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.summary h2 {
  margin-top: 0;
  color: #333;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.stat .label {
  font-weight: 500;
  color: #666;
}

.stat .value {
  font-weight: bold;
  color: #333;
}

.stat .value.missing {
  color: #dc3545;
}

.errors {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.errors h3 {
  color: #721c24;
  margin-top: 0;
}

.error-list {
  margin-top: 1rem;
}

.error-item {
  background: white;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid #dc3545;
}

.missing-files {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 1.5rem;
}

.missing-files h3 {
  color: #856404;
  margin-top: 0;
}

.file-list {
  margin-top: 1rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 0.25rem;
}

.file-path {
  color: #666;
  font-size: 0.9rem;
  word-break: break-all;
  margin-bottom: 0.25rem;
}

.file-status {
  font-size: 0.85rem;
  font-weight: 500;
}

.file-status.processing {
  color: #007bff;
}

.file-status.success {
  color: #28a745;
}

.file-status.error {
  color: #dc3545;
}

.file-actions {
  margin-left: 1rem;
}

.fix-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  min-width: 100px;
}

.fix-btn:hover:not(:disabled) {
  background: #218838;
}

.fix-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.fix-btn.processing {
  background: #007bff;
}

.fix-btn.success {
  background: #28a745;
  cursor: default;
}

.fix-btn.error {
  background: #dc3545;
  cursor: default;
}

.no-missing {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  color: #155724;
}

h1 {
  color: #333;
  margin-bottom: 1rem;
}

h3 {
  margin-bottom: 1rem;
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
.status-unknown {
  color: #888;
  font-weight: bold;
}
.duplicate-issues-section {
  margin-top: 2rem;
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 5px;
}
.unique-loras-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
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
.unique-loras-table td:last-child {
  white-space: nowrap;
}
.no-unique-files {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}
.duplicate-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.duplicate-tab {
  background: #f8f8f8;
  border: 1px solid #007bff;
  color: #007bff;
  padding: 0.5rem 1.5rem;
  border-radius: 5px 5px 0 0;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.duplicate-tab.active {
  background: #007bff;
  color: #fff;
  font-weight: bold;
}
.duplicate-tab:hover:not(.active) {
  background: #e9e9e9;
}
.duplicate-tab-content {
  background: #fff;
  padding: 1rem;
  border-radius: 0 0 5px 5px;
}
.file-path-item {
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #eee;
}
.file-path-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.hash-check-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
}
.hash-check-btn:hover:not(:disabled) {
  background: #218838;
}
.hash-check-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
.hash-result {
  font-size: 12px;
  font-weight: 500;
  padding: 0.25rem 0;
}
.metadata-placeholder {
  color: #666;
  font-style: italic;
  font-size: 12px;
}
</style> 