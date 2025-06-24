<template>
  <div class="civit-data-fetcher">
    <h1>Orphan LORA Identifier</h1>
    <p class="page-summary">
      This page scans your folders for files not yet registered in the database. It lists these untracked files and allows you to fetch their metadata from Civitai. If metadata is found, the file is automatically renamed to match the database and the table is updated, ensuring your local files and database stay in sync.
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
      
      <div v-if="isScanning" class="scan-progress">
        <p>Scanning directories for files not found in database...</p>
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
      concurrentOperations: new Set()
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
    }
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
</style> 