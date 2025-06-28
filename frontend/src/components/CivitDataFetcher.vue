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
                  <th>Actions</th>
                  <th>Result</th>
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
                      :disabled="hashCheckLoading[group.filename] || hashCheckedFiles.has(group.filename)"
                      class="hash-check-btn"
                    >
                      {{ hashCheckLoading[group.filename] ? 'Calculating...' : 'Check Hash' }}
                    </button>
                    <div v-if="hashResults[group.filename]" class="hash-result">
                      {{ hashResults[group.filename] }}
                    </div>
                  </td>
                  <td>
                    <button 
                      @click="identifyMetadataForGroup(group.filename)"
                      :disabled="metadataLoading[group.filename] || !hashCheckedFiles.has(group.filename) || identifiedFiles.has(group.filename)"
                      :title="!hashCheckedFiles.has(group.filename) ? 'Please check hash first' : identifiedFiles.has(group.filename) ? 'Already identified' : ''"
                      class="metadata-btn"
                    >
                      {{ metadataLoading[group.filename] ? 'Searching...' : 'Identify' }}
                    </button>
                    <div v-if="metadataResults[group.filename]" class="metadata-result">
                      <div v-html="metadataResults[group.filename]"></div>
                    </div>
                  </td>
                  <td>
                    <!-- Actions column - show for both identical and non-identical hash files -->
                    <div v-if="hashCheckedFiles.has(group.filename) && hashResults[group.filename] && identicalHashModels[group.filename]">
                      <div v-for="(path, pathIdx) in group.paths" :key="pathIdx" class="action-item">
                        <div class="file-path">{{ path }}</div>
                        <select 
                          v-model="selectedActions[path]" 
                          class="action-dropdown"
                          :disabled="!identicalHashModels[group.filename] || identicalHashModels[group.filename].length === 0"
                        >
                          <option 
                            v-for="model in getModelsForPath(path, group.filename)" 
                            :key="`${model.modelId}-${model.modelVersionId}`"
                            :value="`${model.modelId}/${model.modelVersionId}/${model.fileName}`"
                          >
                            {{ model.modelId }}/{{ model.modelVersionId }}/{{ model.fileName }}
                          </option>
                          <option value="_duplicate">rename as _duplicate</option>
                        </select>
                      </div>
                      <button 
                        @click="registerActions(group.filename)"
                        :disabled="!hasSelectedActions(group.filename)"
                        class="register-btn"
                      >
                        Register
                      </button>
                    </div>
                  </td>
                  <td>
                    <!-- Result column - display registration results -->
                    <div v-if="registrationResults[group.filename]" class="registration-result">
                      <div v-for="(result, path) in registrationResults[group.filename]" :key="path" class="result-item">
                        <div class="result-path"><strong>Path:</strong> {{ path }}</div>
                        <div class="result-action"><strong>Action:</strong> {{ result.action }}</div>
                        <div class="result-status" :class="result.status">
                          <strong>Status:</strong> {{ result.message }}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-if="duplicateOnDiskGrouped.length === 0"><td colspan="6" class="no-unique-files">No duplicates on disk found.</td></tr>
              </tbody>
            </table>
          </div>
          <div v-show="activeDuplicateTab === 'db'">
            <table class="unique-loras-table">
              <thead>
                <tr>
                  <th>Full Path</th>
                  <th>Database check</th>
                  <th>Identify metadata</th>
                  <th>Action</th>
                  <th>Results</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(file, idx) in duplicateInDb" :key="file.fullPath + idx">
                  <td>{{ file.fullPath }}</td>
                  <td>
                    <button 
                      class="db-check-btn" 
                      @click="onDatabaseCheck(file)"
                      :disabled="dbCheckLoading[file.fullPath] || dbCheckedFiles.has(file.fullPath)"
                    >
                      {{ dbCheckLoading[file.fullPath] ? 'Checking...' : dbCheckedFiles.has(file.fullPath) ? 'Completed' : 'Check' }}
                    </button>
                    <div v-if="dbCheckResults[file.fullPath]" class="db-check-result">
                      <div v-if="dbCheckResults[file.fullPath].success" class="db-check-success">
                        <div class="db-check-count">Found {{ dbCheckResults[file.fullPath].count }} model(s):</div>
                        <div v-for="(model, index) in dbCheckResults[file.fullPath].models" :key="index" class="model-link-item">
                          <div class="model-link-container">
                            <a 
                              :href="model.url" 
                              target="_blank" 
                              class="model-link"
                            >
                              {{ model.modelId }}/{{ model.modelVersionId }}
                            </a>
                            <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                          </div>
                        </div>
                      </div>
                      <div v-else class="db-check-error">
                        {{ dbCheckResults[file.fullPath].message }}
                      </div>
                    </div>
                  </td>
                  <td>
                    <button 
                      class="identify-metadata-btn" 
                      @click="onIdentifyMetadata(file)"
                      :disabled="identifyMetadataLoading[file.fullPath] || metadataIdentifiedFiles.has(file.fullPath) || !dbCheckedFiles.has(file.fullPath)"
                    >
                      {{ identifyMetadataLoading[file.fullPath] ? 'Identifying...' : metadataIdentifiedFiles.has(file.fullPath) ? 'Completed' : 'Identify' }}
                    </button>
                    <div v-if="identifyMetadataResults[file.fullPath]" class="identify-metadata-result">
                      <div v-html="identifyMetadataResults[file.fullPath]"></div>
                    </div>
                  </td>
                  <td>
                    <div class="action-section">
                      <div v-if="comparisonResults[file.fullPath]" class="comparison-result">
                        <div class="comparison-header">Comparison Results:</div>
                        <div v-if="comparisonResults[file.fullPath].status === 'both_not_found'" class="comparison-both-not-found">
                          ❌ Not found in database or CivitAI
                        </div>
                        <div v-else-if="comparisonResults[file.fullPath].status === 'only_civitai_found'" class="comparison-only-civitai">
                          ✅ Found in CivitAI only
                          <div class="model-info">
                            Model: {{ comparisonResults[file.fullPath].metadataModel.modelId }}/{{ comparisonResults[file.fullPath].metadataModel.modelVersionId }}
                            <span v-if="comparisonResults[file.fullPath].isAlreadyRegistered" class="already-registered-note">(Already registered)</span>
                          </div>
                          <button 
                            class="register-btn"
                            @click="registerModel(file, comparisonResults[file.fullPath].metadataModel)"
                            :disabled="registrationLoading[file.fullPath] || registeredFiles.has(file.fullPath) || comparisonResults[file.fullPath].isAlreadyRegistered"
                          >
                            {{ registrationLoading[file.fullPath] ? 'Registering...' : 
                               registeredFiles.has(file.fullPath) ? 'Completed' : 
                               comparisonResults[file.fullPath].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                          </button>
                        </div>
                        <div v-else-if="comparisonResults[file.fullPath].status === 'only_db_found'" class="comparison-only-db">
                          ✅ Found in database only
                          <div class="db-models">
                            <div v-for="(model, index) in comparisonResults[file.fullPath].dbModels" :key="index" class="db-model-item">
                              <div class="model-link-container">
                                <span>{{ model.modelId }}/{{ model.modelVersionId }}</span>
                                <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-else-if="comparisonResults[file.fullPath].status === 'match_found'" class="comparison-match">
                          ✅ Perfect match found!
                          <div class="match-info">
                            Model: {{ comparisonResults[file.fullPath].metadataModel.modelId }}/{{ comparisonResults[file.fullPath].metadataModel.modelVersionId }}
                            <span v-if="comparisonResults[file.fullPath].isAlreadyRegistered" class="already-registered-note">(Already registered)</span>
                          </div>
                          <button 
                            class="register-btn"
                            @click="registerModel(file, comparisonResults[file.fullPath].metadataModel)"
                            :disabled="registrationLoading[file.fullPath] || registeredFiles.has(file.fullPath) || comparisonResults[file.fullPath].isAlreadyRegistered"
                          >
                            {{ registrationLoading[file.fullPath] ? 'Registering...' : 
                               registeredFiles.has(file.fullPath) ? 'Completed' : 
                               comparisonResults[file.fullPath].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                          </button>
                        </div>
                        <div v-else-if="comparisonResults[file.fullPath].status === 'mismatch'" class="comparison-mismatch">
                          ⚠️ Mismatch detected
                          <div class="mismatch-details">
                            <div class="civitai-model">
                              CivitAI: {{ comparisonResults[file.fullPath].metadataModel.modelId }}/{{ comparisonResults[file.fullPath].metadataModel.modelVersionId }}
                            </div>
                            <div class="db-models">
                              Database: 
                              <div v-for="(model, index) in comparisonResults[file.fullPath].dbModels" :key="index" class="db-model-item">
                                <div class="model-link-container">
                                  <span>{{ model.modelId }}/{{ model.modelVersionId }}</span>
                                  <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <button 
                            class="register-btn"
                            @click="registerModel(file, comparisonResults[file.fullPath].metadataModel)"
                            :disabled="registrationLoading[file.fullPath] || registeredFiles.has(file.fullPath) || comparisonResults[file.fullPath].isAlreadyRegistered"
                          >
                            {{ registrationLoading[file.fullPath] ? 'Registering...' : 
                               registeredFiles.has(file.fullPath) ? 'Completed' : 
                               comparisonResults[file.fullPath].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                          </button>
                        </div>
                      </div>
                      <div v-else class="action-placeholder">
                        Complete Check & Identify to see comparison
                      </div>
                    </div>
                  </td>
                  <td>
                    <div v-if="registrationResults[file.fullPath]" class="registration-result">
                      <div class="result-item">
                        <div class="result-status" :class="registrationResults[file.fullPath].status">
                          <strong>Status:</strong> {{ registrationResults[file.fullPath].message }}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-if="duplicateInDb.length === 0"><td colspan="5" class="no-unique-files">No duplicates in DB found.</td></tr>
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
      // Store detailed hash information for each file group
      hashDetails: {},
      // Track which files have had their hash checked
      hashCheckedFiles: new Set(),
      // Track which files have had their identify button pressed
      identifiedFiles: new Set(),
      // Metadata identification state
      metadataLoading: {},
      metadataResults: {},
      // Store model information for identical hash files
      identicalHashModels: {},
      // Store hash information for each path
      pathHashMapping: {},
      // Store selected actions for each path
      selectedActions: {},
      // Store registration results for each file group
      registrationResults: {},
      // Database check state
      dbCheckLoading: {},
      dbCheckResults: {},
      // Track which files have had their database check completed
      dbCheckedFiles: new Set(),
      // New state for identify metadata
      identifyMetadataLoading: {},
      identifyMetadataResults: {},
      // Track which files have had their metadata identification completed
      metadataIdentifiedFiles: new Set(),
      // New state for registration loading
      registrationLoading: {},
      // Track which files have had their registration completed
      registeredFiles: new Set(),
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
    
    resetOrphanScanState() {
      // Reset all orphan scan related state
      this.scanResults = null;
      this.isScanning = false;
      this.scanTimer = 0;
      this.scanStartTime = null;
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      
      // Reset file processing states
      this.processingFiles.clear();
    },
    
    async scanForMissingFiles() {
      const operationId = 'scanForMissingFiles';
      if (this.isOperationInProgress(operationId)) {
        console.log('Scan operation already in progress, skipping...');
        return;
      }
      
      // Reset all orphan scan state
      this.resetOrphanScanState();
      
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
        const civitaiResponse = await this.fetchModelVersionIdByHash(hash);
        const modelVersionId = civitaiResponse.modelVersionId;
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
    
    async fetchModelVersionIdByHash(hash) {
      try {
        const url = `https://civitai.com/api/v1/model-versions/by-hash/${hash}`;
        console.log(`Fetching model info from CivitAI for hash: ${hash}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`CivitAI API error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          modelId: data.modelId,
          modelVersionId: data.id
        };
        
      } catch (error) {
        console.error('Error fetching model info from CivitAI:', error);
        throw new Error(`Failed to fetch model info from CivitAI: ${error.message}`);
      }
    },
    resetDuplicateIssuesState() {
      // Reset all duplicate issues related state
      this.duplicateIssues = null;
      this.duplicateIssuesError = null;
      this.showDuplicateIssues = false;
      this.activeDuplicateTab = 'disk';
      
      // Reset hash check state
      this.hashCheckLoading = {};
      this.hashResults = {};
      this.hashDetails = {};
      this.hashCheckedFiles.clear();
      this.identifiedFiles.clear();
      
      // Reset metadata state
      this.metadataLoading = {};
      this.metadataResults = {};
      this.identicalHashModels = {};
      this.pathHashMapping = {};
      this.selectedActions = {};
      this.registrationResults = {};
      
      // Reset database check state
      this.dbCheckLoading = {};
      this.dbCheckResults = {};
      this.dbCheckedFiles.clear();
      
      // Reset identify metadata state
      this.identifyMetadataLoading = {};
      this.identifyMetadataResults = {};
      this.metadataIdentifiedFiles.clear();
      
      // Reset registration state
      this.registrationLoading = {};
      this.registeredFiles.clear();
      
      // Reset timers
      this.duplicateTimer = 0;
      this.duplicateStartTime = null;
      if (this.duplicateInterval) {
        clearInterval(this.duplicateInterval);
        this.duplicateInterval = null;
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
      
      // Reset all duplicate issues state
      this.resetDuplicateIssuesState();
      
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
        
        // Store detailed hash information for later use in identify method
        this.hashDetails[filename] = {
          results: results,
          uniqueHashes: new Set(hashes),
          hashGroups: {}
        };
        
        // Group paths by hash
        results.forEach(result => {
          if (result.hash) {
            if (!this.hashDetails[filename].hashGroups[result.hash]) {
              this.hashDetails[filename].hashGroups[result.hash] = [];
            }
            this.hashDetails[filename].hashGroups[result.hash].push(result.path);
            // Store hash mapping for each path
            this.pathHashMapping[result.path] = result.hash;
          }
        });
        
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
        // Mark this file as hash-checked (even if there was an error, the check was attempted)
        this.hashCheckedFiles.add(filename);
      }
    },
    async identifyMetadataForGroup(filename) {
      if (this.metadataLoading[filename]) return;
      
      this.metadataLoading[filename] = true;
      this.metadataResults[filename] = null;
      
      try {
        const group = this.duplicateOnDiskGrouped.find(g => g.filename === filename);
        if (!group) return;
        
        // Get hash details for this file group
        const hashDetail = this.hashDetails[filename];
        if (!hashDetail) {
          this.metadataResults[filename] = 'Error: Hash information not available. Please check hash first.';
          return;
        }
        
        let resultText = '';
        
        if (hashDetail.uniqueHashes.size === 1) {
          // Process only the first file since all are identical
          const firstPath = Object.values(hashDetail.hashGroups)[0][0];
          const pathFilename = firstPath.split('\\').pop().split('/').pop();
          
          try {
            const response = await apiService.searchModelByFilename(pathFilename);
            if (response && response.length > 0) {
              // Store model information for Actions column
              this.identicalHashModels[filename] = response;
              
              resultText = '<div style="margin-bottom: 8px; color: #666; font-style: italic;">📋 Data fetched from database:</div>';
              response.forEach((match, index) => {
                const modelUrl = `http://localhost:5173/model/${match.modelId}/${match.modelVersionId}`;
                resultText += `<div style="margin-bottom: 4px;"><strong>${match.fileName}</strong></div>`;
                resultText += `<a href="${modelUrl}" target="_blank">Model ID: ${match.modelId}, Version ID: ${match.modelVersionId}</a><br>`;
              });
            } else {
              resultText = '❌ No matches found in database';
            }
          } catch (error) {
            resultText = `Error: ${error.message}`;
          }
        } else {
          // Files have different hashes - use CivitAI API approach
          const comparisonResults = [];
          
          // Process each unique hash group
          for (const [hash, paths] of Object.entries(hashDetail.hashGroups)) {
            try {
              // Step 1: Use the hash to get model info from CivitAI
              const civitaiResponse = await this.fetchModelVersionIdByHash(hash);
              
              if (civitaiResponse && civitaiResponse.modelId && civitaiResponse.modelVersionId) {
                // Step 2: Get filename from local DB using the model IDs
                const dbFilename = await this.getFileNameFromDB(civitaiResponse.modelVersionId);
                
                // Only add to results if we got a valid filename
                if (dbFilename) {
                  // Step 3: Create comparison result
                  comparisonResults.push({
                    hash: hash.substring(0, 8) + '...',
                    paths: paths,
                    civitaiModelId: civitaiResponse.modelId,
                    civitaiModelVersionId: civitaiResponse.modelVersionId,
                    dbFilename: dbFilename,
                    modelUrl: `http://localhost:5173/model/${civitaiResponse.modelId}/${civitaiResponse.modelVersionId}`
                  });
                } else {
                  comparisonResults.push({
                    hash: hash.substring(0, 8) + '...',
                    paths: paths,
                    error: 'Model found in CivitAI but not in local database'
                  });
                }
              } else {
                comparisonResults.push({
                  hash: hash.substring(0, 8) + '...',
                  paths: paths,
                  error: 'No model found in CivitAI for this hash'
                });
              }
            } catch (error) {
              comparisonResults.push({
                hash: hash.substring(0, 8) + '...',
                paths: paths,
                error: error.message
              });
            }
          }
          
          // Store model information for Actions column (non-identical hashes)
          this.identicalHashModels[filename] = comparisonResults.filter(result => !result.error).map(result => ({
            modelId: result.civitaiModelId,
            modelVersionId: result.civitaiModelVersionId,
            fileName: result.dbFilename,
            hash: result.hash
          }));
          
          // Format the comparison results
          resultText = '<div style="margin-bottom: 8px; color: #666; font-style: italic;">🔍 Hash-based analysis from CivitAI:</div>';
          
          comparisonResults.forEach((result, index) => {
            if (result.error) {
              resultText += `<div style="margin-bottom: 12px;"><strong>Hash: ${result.hash}</strong></div>`;
              resultText += `<div style="color: #d9534f;">❌ ${result.error}</div>`;
            } else {
              resultText += `<div style="margin-bottom: 12px;"><strong>Hash: ${result.hash}</strong></div>`;
              resultText += `<div style="margin-bottom: 4px;"><strong> ${result.dbFilename}</strong></div>`;
              resultText += `<a href="${result.modelUrl}" target="_blank">Model ID: ${result.civitaiModelId}, Version ID: ${result.civitaiModelVersionId}</a><br>`;
              resultText += `<div style="margin-top: 4px; color: #666;">Files with this hash: ${result.paths.length}</div>`;
            }
            
            if (index < comparisonResults.length - 1) {
              resultText += '<br>';
            }
          });
        }
        
        this.metadataResults[filename] = resultText;
      } catch (error) {
        this.metadataResults[filename] = `Error: ${error.message}`;
      } finally {
        this.metadataLoading[filename] = false;
        // Mark this file as identified (even if there was an error, the identification was attempted)
        this.identifiedFiles.add(filename);
      }
    },
    async getFileNameFromDB(modelVersionId) {
      try {
        const response = await apiService.getFileNameByModelVersionId(modelVersionId);
        if (response && response.fileName) {
          return response.fileName;
        } else {
          console.warn('No filename found for modelVersionId:', modelVersionId);
          return null; // Return null instead of error string
        }
      } catch (error) {
        console.error('Error getting filename from DB:', error);
        return null; // Return null instead of error string
      }
    },
    getModelsForPath(path, filename) {
      const hashDetail = this.hashDetails[filename];
      if (!hashDetail) return [];
      
      const pathHash = this.pathHashMapping[path];
      if (!pathHash) return [];
      
      // For identical hashes, return all models
      if (hashDetail.uniqueHashes.size === 1) {
        return this.identicalHashModels[filename] || [];
      }
      
      // For non-identical hashes, return only models that match this path's hash
      return (this.identicalHashModels[filename] || []).filter(model => {
        // Extract hash from model (it was stored as hash.substring(0, 8) + '...')
        const modelHash = model.hash;
        return modelHash && pathHash.startsWith(modelHash.substring(0, 8));
      });
    },
    async registerActions(filename) {
      // Validate that no dropdowns have the same value (except _duplicate)
      const validationResult = this.validateSelectedActions(filename);
      
      if (!validationResult.isValid) {
        this.errorHandler.handleError(new Error(validationResult.errorMessage), 'validating selected actions', { showNotification: true });
        return;
      }
      
      // Get the file group
      const group = this.duplicateOnDiskGrouped.find(g => g.filename === filename);
      if (!group) {
        this.errorHandler.handleError(new Error('File group not found'), 'registering actions', { showNotification: true });
        return;
      }
      
      // Store the results for display in the result column
      this.registrationResults[filename] = {};
      
      // Process each file path
      for (const path of group.paths) {
        const selectedAction = this.selectedActions[path];
        if (!selectedAction) continue;
        
        try {
          if (selectedAction === '_duplicate') {
            // Rename file on hard drive
            const result = await this.renameFileAsDuplicate(path);
            this.registrationResults[filename][path] = {
              action: selectedAction,
              status: 'success',
              message: 'File renamed'
            };
          } else {
            // Update database with model information
            const [modelId, modelVersionId, fileName] = selectedAction.split('/');
            const result = await this.registerLoraInDatabase(modelId, modelVersionId, fileName, path);
            this.registrationResults[filename][path] = {
              action: selectedAction,
              status: 'success',
              message: 'Lora registered'
            };
          }
        } catch (error) {
          this.registrationResults[filename][path] = {
            action: selectedAction,
            status: 'error',
            message: error.message
          };
          console.error(`Error processing ${path}:`, error);
        }
      }
      
      // Show success message
      this.errorHandler.handleSuccess(`Actions processed for ${filename}`);
    },
    async renameFileAsDuplicate(filePath) {
      try {
        const response = await apiService.renameFileAsDuplicate(filePath);
        return response;
      } catch (error) {
        throw new Error(`Failed to rename file: ${error.message}`);
      }
    },
    async registerLoraInDatabase(modelId, modelVersionId, fileName, fullPath) {
      try {
        const response = await apiService.registerLoraInDatabase({
          modelId: parseInt(modelId),
          modelVersionId: parseInt(modelVersionId),
          fileName: fileName,
          fullPath: fullPath
        });
        return response;
      } catch (error) {
        throw new Error(`Failed to register lora in database: ${error.message}`);
      }
    },
    validateSelectedActions(filename) {
      const group = this.duplicateOnDiskGrouped.find(g => g.filename === filename);
      if (!group) {
        return { isValid: false, errorMessage: 'File group not found' };
      }
      
      // Get all selected values for this file group
      const selectedValues = group.paths
        .map(path => this.selectedActions[path])
        .filter(value => value && value !== ''); // Filter out empty values
      
      // Check if all paths have selected values
      if (selectedValues.length !== group.paths.length) {
        return { isValid: false, errorMessage: 'Please select an action for all files' };
      }
      
      // Create a map to track values (excluding _duplicate)
      const valueCounts = {};
      const duplicateValues = [];
      
      selectedValues.forEach(value => {
        if (value !== '_duplicate') {
          valueCounts[value] = (valueCounts[value] || 0) + 1;
          if (valueCounts[value] === 2) { // First duplicate found
            duplicateValues.push(value);
          }
        }
      });
      
      if (duplicateValues.length > 0) {
        return { 
          isValid: false, 
          errorMessage: `Duplicate values found: ${duplicateValues.join(', ')}. Each file must have a unique action (except "_duplicate").` 
        };
      }
      
      return { isValid: true };
    },
    hasSelectedActions(filename) {
      // Check if any actions are selected for this file group
      const group = this.duplicateOnDiskGrouped.find(g => g.filename === filename);
      if (!group) return false;
      
      const hasAllSelections = group.paths.some(path => this.selectedActions[path] && this.selectedActions[path] !== '');
      
      // Also validate that there are no duplicate values (excluding _duplicate)
      const validationResult = this.validateSelectedActions(filename);
      
      return hasAllSelections && validationResult.isValid;
    },
    onDatabaseCheck(file) {
      // Extract filename from full path
      const filename = file.fullPath.split('\\').pop().split('/').pop();
      
      if (this.dbCheckLoading[file.fullPath] || this.dbCheckedFiles.has(file.fullPath)) return;
      
      this.dbCheckLoading[file.fullPath] = true;
      this.dbCheckResults[file.fullPath] = null;
      
      apiService.searchModelByFilename(filename)
        .then(response => {
          if (response && response.length > 0) {
            // Display all matches found with registration status
            const models = response.map(model => ({
              modelId: model.modelId,
              modelVersionId: model.modelVersionId,
              fileName: model.fileName,
              isDownloaded: model.isDownloaded,
              file_path: model.file_path,
              isRegistered: model.isDownloaded === 1 && model.file_path !== null,
              url: `http://localhost:5173/model/${model.modelId}/${model.modelVersionId}`
            }));
            
            this.dbCheckResults[file.fullPath] = {
              success: true,
              models: models,
              count: models.length
            };
            // Mark as completed
            this.dbCheckedFiles.add(file.fullPath);
          } else {
            this.dbCheckResults[file.fullPath] = {
              success: false,
              message: 'No model found in database'
            };
            // Mark as completed even if no results found
            this.dbCheckedFiles.add(file.fullPath);
          }
        })
        .catch(error => {
          this.dbCheckResults[file.fullPath] = {
            success: false,
            message: error.message || 'Error searching database for model'
          };
          this.errorHandler.handleError(error, 'searching database for model');
          // Mark as completed even on error
          this.dbCheckedFiles.add(file.fullPath);
        })
        .finally(() => {
          this.dbCheckLoading[file.fullPath] = false;
        });
    },
    onIdentifyMetadata(file) {
      // Prevent concurrent operations on the same file
      if (this.identifyMetadataLoading[file.fullPath] || this.metadataIdentifiedFiles.has(file.fullPath)) {
        console.log(`File ${file.fullPath} is already being processed or completed, skipping...`);
        return;
      }
      
      this.identifyMetadataLoading[file.fullPath] = true;
      this.identifyMetadataResults[file.fullPath] = null;
      
      // Step 1: Compute SHA256 hash of the file
      this.computeFileHash(file.fullPath)
        .then(hash => {
          console.log(`Hash for ${file.fullPath}: ${hash}`);
          
          // Step 2: Fetch model version ID from CivitAI
          return this.fetchModelVersionIdByHash(hash);
        })
        .then(civitaiResponse => {
          const modelVersionId = civitaiResponse.modelVersionId;
          const modelId = civitaiResponse.modelId;
          console.log(`Model Version ID for ${file.fullPath}: ${modelVersionId}`);
          
          // Create the model URL
          const modelUrl = `http://localhost:5173/model/${modelId}/${modelVersionId}`;
          
          // Format the result similar to other metadata results in the file
          let resultText = '<div style="margin-bottom: 8px; color: #666; font-style: italic;">📋 Data fetched from CivitAI:</div>';
          resultText += `<div style="margin-bottom: 4px;"><strong>Model ID:</strong> ${modelId}</div>`;
          resultText += `<div style="margin-bottom: 4px;"><strong>Model Version ID:</strong> ${modelVersionId}</div>`;
          resultText += `<a href="${modelUrl}" target="_blank">View Model Details</a><br>`;
          
          this.identifyMetadataResults[file.fullPath] = resultText;
          this.errorHandler.handleSuccess(`Metadata identified for: ${file.fullPath}`);
          // Mark as completed
          this.metadataIdentifiedFiles.add(file.fullPath);
        })
        .catch(error => {
          console.error('Error identifying metadata:', error);
          this.identifyMetadataResults[file.fullPath] = `❌ Error: ${error.message}`;
          this.errorHandler.handleError(error, `identifying metadata for ${file.fullPath}`, { showNotification: false });
          // Mark as completed even on error
          this.metadataIdentifiedFiles.add(file.fullPath);
        })
        .finally(() => {
          this.identifyMetadataLoading[file.fullPath] = false;
        });
    },
    async registerModel(file, model) {
      // Prevent concurrent operations on the same file
      if (this.registrationLoading[file.fullPath] || this.registeredFiles.has(file.fullPath)) {
        console.log(`Registration for ${file.fullPath} is already in progress or completed, skipping...`);
        return;
      }
      
      this.registrationLoading[file.fullPath] = true;
      
      try {
        // Extract filename from the full path
        const fileName = file.fullPath.split('\\').pop().split('/').pop();
        
        // Update database with model information
        const result = await this.registerLoraInDatabase(model.modelId, model.modelVersionId, fileName, file.fullPath);
        this.registrationResults[file.fullPath] = {
          action: `Model ID: ${model.modelId}, Version ID: ${model.modelVersionId}`,
          status: 'success',
          message: 'Lora registered successfully'
        };
        this.errorHandler.handleSuccess(`Model registered successfully for: ${fileName}`);
        // Mark as completed
        this.registeredFiles.add(file.fullPath);
      } catch (error) {
        this.registrationResults[file.fullPath] = {
          action: `Model ID: ${model.modelId}, Version ID: ${model.modelVersionId}`,
          status: 'error',
          message: error.message
        };
        this.errorHandler.handleError(error, `registering model for ${file.fullPath}`, { showNotification: false });
        // Mark as completed even on error
        this.registeredFiles.add(file.fullPath);
      } finally {
        this.registrationLoading[file.fullPath] = false;
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
    // Compare database check and metadata identification results
    comparisonResults() {
      const results = {};
      this.duplicateInDb.forEach(file => {
        const dbCheckResult = this.dbCheckResults[file.fullPath];
        const metadataResult = this.identifyMetadataResults[file.fullPath];
        
        if (dbCheckResult && metadataResult && 
            this.dbCheckedFiles.has(file.fullPath) && 
            this.metadataIdentifiedFiles.has(file.fullPath)) {
          
          // Extract model IDs from database check results
          const dbModels = dbCheckResult.success ? dbCheckResult.models : [];
          
          // Extract model info from metadata results (parse the HTML content)
          let metadataModelId = null;
          let metadataModelVersionId = null;
          
          if (metadataResult && !metadataResult.includes('❌ Error:')) {
            // Parse the metadata result to extract model ID and version ID
            const modelIdMatch = metadataResult.match(/<strong>Model ID:<\/strong> (\d+)/);
            const modelVersionIdMatch = metadataResult.match(/<strong>Model Version ID:<\/strong> (\d+)/);
            
            if (modelIdMatch && modelVersionIdMatch) {
              metadataModelId = parseInt(modelIdMatch[1]);
              metadataModelVersionId = parseInt(modelVersionIdMatch[1]);
            }
          }
          
          // Compare the results
          let comparison = {
            dbModels: dbModels,
            metadataModel: metadataModelId && metadataModelVersionId ? {
              modelId: metadataModelId,
              modelVersionId: metadataModelVersionId
            } : null,
            status: 'unknown',
            isAlreadyRegistered: false
          };
          
          if (dbModels.length === 0 && !metadataModelId) {
            comparison.status = 'both_not_found';
          } else if (dbModels.length === 0 && metadataModelId) {
            comparison.status = 'only_civitai_found';
          } else if (dbModels.length > 0 && !metadataModelId) {
            comparison.status = 'only_db_found';
          } else if (dbModels.length > 0 && metadataModelId) {
            // Check if the metadata model matches any of the database models
            const matchingDbModel = dbModels.find(dbModel => 
              dbModel.modelId === metadataModelId && 
              dbModel.modelVersionId === metadataModelVersionId
            );
            
            if (matchingDbModel) {
              comparison.status = 'match_found';
              // Check if the matching model is already registered
              comparison.isAlreadyRegistered = matchingDbModel.isRegistered;
            } else {
              comparison.status = 'mismatch';
            }
          }
          
          results[file.fullPath] = comparison;
        }
      });
      return results;
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
  padding: 1rem;
  width: 100%;
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
  font-size: 11px;
  color: #666;
  margin-bottom: 0.25rem;
  word-break: break-all;
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
  padding: 0.5rem;
  border-radius: 5px;
  width: 100%;
}
.unique-loras-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  table-layout: fixed;
}
.unique-loras-table th, .unique-loras-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.unique-loras-table th:nth-child(1), .unique-loras-table td:nth-child(1) { /* File Name */
  width: 15%;
}
.unique-loras-table th:nth-child(2), .unique-loras-table td:nth-child(2) { /* File Paths */
  width: 25%;
}
.unique-loras-table th:nth-child(3), .unique-loras-table td:nth-child(3) { /* Hash Check */
  width: 15%;
}
.unique-loras-table th:nth-child(4), .unique-loras-table td:nth-child(4) { /* Identify Metadata */
  width: 15%;
}
.unique-loras-table th:nth-child(5), .unique-loras-table td:nth-child(5) { /* Actions */
  width: 15%;
}
.unique-loras-table th:nth-child(6), .unique-loras-table td:nth-child(6) { /* Result */
  width: 15%;
}
.unique-loras-table th {
  background: #f8f8f8;
  font-weight: bold;
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
  padding: 0.5rem;
  border-radius: 0 0 5px 5px;
  width: 100%;
  overflow-x: auto;
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
.metadata-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
}
.metadata-btn:hover:not(:disabled) {
  background: #138496;
}
.metadata-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
.metadata-result {
  font-size: 11px;
  font-weight: 500;
  padding: 0.25rem 0;
}
.metadata-result div {
  margin: 0;
  white-space: pre;
  font-family: inherit;
}
.metadata-result div a {
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
}
.metadata-result div a:hover {
  color: #0056b3;
}
.action-item {
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #eee;
}
.action-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.action-dropdown {
  width: 100%;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
}
.register-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  margin-top: 0.5rem;
}
.register-btn:hover:not(:disabled) {
  background: #218838;
}
.register-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
.registration-result {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 0.85rem;
}
.result-item {
  margin-bottom: 0.25rem;
}
.result-status {
  font-weight: 500;
}
.result-status.success {
  color: #28a745;
}
.result-status.error {
  color: #dc3545;
}
.db-check-btn {
  background: #ffc107;
  color: #333;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}
.db-check-btn:hover:not(:disabled) {
  background: #ffb300;
}
.db-check-btn:disabled {
  background: #e0e0e0;
  color: #aaa;
  cursor: not-allowed;
}
.db-check-result {
  margin-top: 0.5rem;
  font-size: 12px;
}
.db-check-success {
  color: #28a745;
}
.db-check-error {
  color: #dc3545;
}
.model-link {
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
}
.model-link:hover {
  text-decoration: underline;
}
.db-check-count {
  margin-bottom: 0.5rem;
  font-weight: bold;
}
.model-link-item {
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #dee2e6;
}
.model-link-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.identify-metadata-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
}
.identify-metadata-btn:hover:not(:disabled) {
  background: #138496;
}
.identify-metadata-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
.identify-metadata-result {
  font-size: 11px;
  font-weight: 500;
  padding: 0.25rem 0;
}
.identify-metadata-result div {
  margin: 0;
  white-space: pre;
  font-family: inherit;
}
.identify-metadata-result div a {
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
}
.identify-metadata-result div a:hover {
  color: #0056b3;
}
.action-section {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 0.85rem;
}
.action-placeholder {
  color: #6c757d;
  font-weight: 500;
}
.comparison-result {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 0.85rem;
}
.comparison-header {
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
}
.comparison-both-not-found {
  color: #dc3545;
  font-weight: bold;
}
.comparison-only-civitai {
  color: #28a745;
  font-weight: bold;
}
.comparison-only-db {
  color: #28a745;
  font-weight: bold;
}
.comparison-match {
  color: #28a745;
  font-weight: bold;
}
.comparison-mismatch {
  color: #f0ad4e;
  font-weight: bold;
}
.model-info {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #666;
}
.db-models {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #666;
}
.db-model-item {
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #dee2e6;
}
.db-model-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.model-link-container {
  display: flex;
  align-items: center;
}
.registered-indicator {
  margin-left: 0.25rem;
  font-size: 0.8rem;
  color: #28a745;
}
.already-registered-note {
  color: #dc3545;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}
</style> 