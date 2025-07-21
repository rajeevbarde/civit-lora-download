<template>
  <div class="civit-data-fetcher">
    <!-- Header Component -->
    <CivitDataFetcherHeader />
    
    <!-- Controls Component -->
    <CivitDataFetcherControls
      :is-scanning="isScanning"
      :scan-timer="scanTimer"
      :duplicate-issues-loading="duplicateIssuesLoading"
      :duplicate-timer="duplicateTimer"
      :bad-downloads-loading="badDownloadsLoading"
      :bad-downloads-timer="badDownloadsTimer"
      @scan-orphan-files="scanForMissingFiles"
      @scan-duplicate-issues="onDuplicateIssuesClick"
      @scan-bad-downloads="onBadDownloadsClick"
    />
    
    <!-- Duplicate Issues Component -->
    <DuplicateIssuesTabs
      :show-duplicate-issues="showDuplicateIssues"
      :duplicate-issues-loading="duplicateIssuesLoading"
      :duplicate-issues-error="duplicateIssuesError"
      :duplicate-issues="duplicateIssues"
      :active-duplicate-tab="activeDuplicateTab"
      :loading-states="loadingStates"
      :results="results"
      :frontend-base-url="frontendBaseUrl"
      @hash-check="checkHashForGroup"
      @identify-metadata="identifyMetadataForGroup"
      @identify-metadata-single="onIdentifyMetadata"
      @register-actions="registerActions"
      @database-check="onDatabaseCheck"
      @register-model="registerModel"
      @update:active-duplicate-tab="activeDuplicateTab = $event"
    />
    
    <!-- Orphan Files Results Component -->
    <OrphanFilesResults
      :scan-results="scanResults"
      @fix-file="fixFile"
    />
    
    <!-- Bad Downloads Results Component -->
    <BadDownloadsResults
      :show-bad-downloads="showBadDownloads"
      :bad-downloads-loading="badDownloadsLoading"
      :bad-downloads-error="badDownloadsError"
      :bad-downloads="badDownloads"
      @identify="onIdentifyBadDownload"
    />
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';
import { FRONTEND_CONFIG } from '@/utils/constants.js';
import { onMounted, ref } from 'vue';

// Import refactored components
import CivitDataFetcherHeader from '@/components/orphanduplicates/CivitDataFetcherHeader.vue';
import CivitDataFetcherControls from '@/components/orphanduplicates/CivitDataFetcherControls.vue';
import DuplicateIssuesTabs from '@/components/orphanduplicates/DuplicateIssuesTabs.vue';
import OrphanFilesResults from '@/components/orphanduplicates/OrphanFilesResults.vue';
import BadDownloadsResults from '@/components/orphanduplicates/BadDownloadsResults.vue';

export default {
  name: 'CivitDataFetcherRefactored',
  components: {
    CivitDataFetcherHeader,
    CivitDataFetcherControls,
    DuplicateIssuesTabs,
    OrphanFilesResults,
    BadDownloadsResults
  },
  setup() {
    const errorHandler = useErrorHandler();
    const civitaiToken = ref('');
    
    onMounted(async () => {
      try {
        const settings = await apiService.fetchSettings();
        civitaiToken.value = settings.CIVITAI_TOKEN || '';
      } catch (err) {
        // Optionally handle error
      }
    });
    
    return { errorHandler, civitaiToken };
  },
  data() {
    return {
      // Orphan scan state
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
      duplicateTimer: 0,
      duplicateStartTime: null,
      duplicateInterval: null,
      activeDuplicateTab: 'disk',
      
      // Bad downloads state
      badDownloadsLoading: false,
      badDownloads: null,
      badDownloadsError: null,
      showBadDownloads: false,
      badDownloadsTimer: 0,
      badDownloadsStartTime: null,
      badDownloadsInterval: null,
      
      // Hash check state
      hashCheckLoading: {},
      hashResults: {},
      hashDetails: {},
      hashCheckedFiles: new Set(),
      identifiedFiles: new Set(),
      
      // Metadata identification state
      metadataLoading: {},
      metadataResults: {},
      identicalHashModels: {},
      pathHashMapping: {},
      selectedActions: {},
      registrationResults: {},
      
      // Database check state
      dbCheckLoading: {},
      dbCheckResults: {},
      dbCheckedFiles: new Set(),
      
      // Identify metadata state
      identifyMetadataLoading: {},
      identifyMetadataResults: {},
      metadataIdentifiedFiles: new Set(),
      
      // Registration state
      registrationLoading: {},
      registeredFiles: new Set(),
      
      frontendBaseUrl: FRONTEND_CONFIG.BASE_URL,
    }
  },
  computed: {
    loadingStates() {
      return {
        hashCheckLoading: this.hashCheckLoading,
        hashCheckedFiles: this.hashCheckedFiles,
        metadataLoading: this.metadataLoading,
        identifiedFiles: this.identifiedFiles,
        dbCheckLoading: this.dbCheckLoading,
        dbCheckedFiles: this.dbCheckedFiles,
        identifyMetadataLoading: this.identifyMetadataLoading,
        metadataIdentifiedFiles: this.metadataIdentifiedFiles,
        registrationLoading: this.registrationLoading,
        registeredFiles: this.registeredFiles
      }
    },
    results() {
      return {
        hashResults: this.hashResults,
        metadataResults: this.metadataResults,
        identicalHashModels: this.identicalHashModels,
        pathHashMapping: this.pathHashMapping,
        registrationResults: this.registrationResults,
        dbCheckResults: this.dbCheckResults,
        identifyMetadataResults: this.identifyMetadataResults,
        hashDetails: this.hashDetails,
        comparisonResults: this.comparisonResults
      }
    },
    // Compare database check and metadata identification results
    comparisonResults() {
      const results = {};
      // Include both duplicateInDb and duplicateOnDiskAndDb
      const allFiles = [
        ...(this.duplicateInDb || []),
        ...(this.duplicateOnDiskAndDb || [])
      ];
      allFiles.forEach(file => {
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
    },
    duplicateInDb() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate in DB');
    },
    duplicateOnDiskAndDb() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate on Disk & DB');
    },
    duplicateOnDisk() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate on Disk');
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
    duplicateOnDiskAndDbGrouped() {
      const grouped = {};
      this.duplicateOnDiskAndDb.forEach(file => {
        if (!grouped[file.baseName]) {
          grouped[file.baseName] = [];
        }
        grouped[file.baseName].push(file.fullPath);
      });
      return Object.entries(grouped)
        .map(([filename, paths]) => ({ filename, paths: paths.sort() }))
        .sort((a, b) => a.filename.localeCompare(b.filename));
    }
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
      this.scanResults = null;
      this.isScanning = false;
      this.scanTimer = 0;
      this.scanStartTime = null;
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      this.processingFiles.clear();
    },
    
    async scanForMissingFiles() {
      const operationId = 'scanForMissingFiles';
      if (this.isOperationInProgress(operationId)) {
        return;
      }
      
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
        if (this.concurrentOperations.has(operationId)) {
          this.scanResults = data;
          this.errorHandler.handleSuccess('Scan completed successfully');
        }
      } catch (error) {
        if (error.name === 'AbortError') {
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
      if (this.isFileProcessing(file.fullPath)) {
        return;
      }
      
      this.startFileProcessing(file.fullPath);
      file.status = 'processing';
      
      try {
        const hash = await this.computeFileHash(file.fullPath);
        const civitaiResponse = await this.fetchModelVersionIdByHash(hash);
        const modelVersionId = civitaiResponse.modelVersionId;
        
        const result = await apiService.fixFile({
          modelVersionId: modelVersionId,
          filePath: file.fullPath
        });
        
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
        const data = await apiService.computeFileHash(filePath);
        return data.hash;
      } catch (error) {
        this.errorHandler.handleError(error, 'computing file hash');
        throw new Error(`Failed to compute file hash: ${error.message}`);
      }
    },
    
    async fetchModelVersionIdByHash(hash) {
      try {
        let url = `https://civitai.com/api/v1/model-versions/by-hash/${hash}`;
        if (this.civitaiToken) {
          url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(this.civitaiToken);
        }
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
      this.duplicateIssues = null;
      this.duplicateIssuesError = null;
      this.showDuplicateIssues = false;
      this.activeDuplicateTab = 'disk';
      
      this.hashCheckLoading = {};
      this.hashResults = {};
      this.hashDetails = {};
      this.hashCheckedFiles.clear();
      this.identifiedFiles.clear();
      
      this.metadataLoading = {};
      this.metadataResults = {};
      this.identicalHashModels = {};
      this.pathHashMapping = {};
      this.selectedActions = {};
      this.registrationResults = {};
      
      this.dbCheckLoading = {};
      this.dbCheckResults = {};
      this.dbCheckedFiles.clear();
      
      this.identifyMetadataLoading = {};
      this.identifyMetadataResults = {};
      this.metadataIdentifiedFiles.clear();
      
      this.registrationLoading = {};
      this.registeredFiles.clear();
      
      this.duplicateTimer = 0;
      this.duplicateStartTime = null;
      if (this.duplicateInterval) {
        clearInterval(this.duplicateInterval);
        this.duplicateInterval = null;
      }
    },
    
    resetBadDownloadsState() {
      this.badDownloads = null;
      this.badDownloadsError = null;
      this.showBadDownloads = false;
      
      this.badDownloadsTimer = 0;
      this.badDownloadsStartTime = null;
      if (this.badDownloadsInterval) {
        clearInterval(this.badDownloadsInterval);
        this.badDownloadsInterval = null;
      }
    },
    
    onDuplicateIssuesClick() {
      this.scanResults = null;
      this.isScanning = false;
      this.scanTimer = 0;
      this.scanStartTime = null;
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      
      this.resetDuplicateIssuesState();
      this.fetchDuplicateIssues();
    },
    
    onBadDownloadsClick() {
      this.scanResults = null;
      this.isScanning = false;
      this.scanTimer = 0;
      this.scanStartTime = null;
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      
      this.duplicateIssues = null;
      this.duplicateIssuesError = null;
      this.showDuplicateIssues = false;
      this.duplicateTimer = 0;
      this.duplicateStartTime = null;
      if (this.duplicateInterval) {
        clearInterval(this.duplicateInterval);
        this.duplicateInterval = null;
      }
      
      this.resetBadDownloadsState();
      this.fetchBadDownloads();
    },
    
    async fetchDuplicateIssues() {
      this.duplicateIssuesLoading = true;
      this.duplicateIssuesError = null;
      this.showDuplicateIssues = false;
      this.activeDuplicateTab = 'disk';
      
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
    
    async fetchBadDownloads() {
      this.badDownloadsLoading = true;
      this.badDownloadsError = null;
      this.showBadDownloads = false;
      
      this.badDownloadsStartTime = performance.now();
      this.badDownloadsTimer = 0;
      if (this.badDownloadsInterval) clearInterval(this.badDownloadsInterval);
      this.badDownloadsInterval = setInterval(() => {
        if (this.badDownloadsLoading && this.badDownloadsStartTime) {
          this.badDownloadsTimer = (performance.now() - this.badDownloadsStartTime) / 1000;
        }
      }, 10);
      
      try {
        const data = await apiService.scanDuplicateFilenames();
        
        if (data && Array.isArray(data.duplicateFilenames)) {
          this.badDownloads = data.duplicateFilenames;
        } else {
          this.badDownloads = [];
        }
        this.showBadDownloads = true;
        this.errorHandler.handleSuccess('Bad downloads scan completed successfully');
      } catch (error) {
        this.badDownloadsError = error.message || 'Failed to fetch bad downloads.';
        this.badDownloads = [];
        this.showBadDownloads = true;
      } finally {
        this.badDownloadsLoading = false;
        if (this.badDownloadsInterval) clearInterval(this.badDownloadsInterval);
        if (this.badDownloadsStartTime) this.badDownloadsTimer = (performance.now() - this.badDownloadsStartTime) / 1000;
        this.badDownloadsInterval = null;
        this.badDownloadsStartTime = null;
      }
    },
    
    async onIdentifyBadDownload(item) {
      // Set identifying state for this item
      item.identifying = true;
      item.hashResult = null;
      
      try {
        console.log('Identifying bad download for:', item.filename);
        this.errorHandler.handleSuccess(`Identification started for ${item.filename}`);
        
        // Compute hashes for all duplicate files
        const hashPromises = item.paths.map(async (path) => {
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
            resultText = '✅ Identical hashes - files are not corrupted';
          } else {
            resultText = `❌ Files have different hashes (${uniqueHashes.size} unique hashes) - potential bad downloads`;
          }
        }
        
        item.hashResult = resultText;
        this.errorHandler.handleSuccess(`Identification completed for ${item.filename}`);
        
      } catch (error) {
        this.errorHandler.handleError(error, `identifying bad download for ${item.filename}`);
        item.hashResult = `❌ Error: ${error.message}`;
      } finally {
        item.identifying = false;
      }
    },
    

    
    // Methods for duplicate issues functionality
    async checkHashForGroup(filename) {
      if (this.hashCheckLoading[filename]) return;
      
      this.hashCheckLoading[filename] = true;
      this.hashResults[filename] = null;
      
      try {
        let group = this.duplicateOnDiskGrouped.find(g => g.filename === filename);
        if (!group) {
          group = this.duplicateOnDiskAndDbGrouped.find(g => g.filename === filename);
        }
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
        
        this.hashDetails[filename] = {
          results: results,
          uniqueHashes: new Set(hashes),
          hashGroups: {}
        };
        
        results.forEach(result => {
          if (result.hash) {
            if (!this.hashDetails[filename].hashGroups[result.hash]) {
              this.hashDetails[filename].hashGroups[result.hash] = [];
            }
            this.hashDetails[filename].hashGroups[result.hash].push(result.path);
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
        this.hashCheckedFiles.add(filename);
      }
    },
    
    async identifyMetadataForGroup(filename) {
      if (this.metadataLoading[filename]) return;
      
      this.metadataLoading[filename] = true;
      this.metadataResults[filename] = null;
      
      try {
        let group = this.duplicateOnDiskGrouped.find(g => g.filename === filename);
        if (!group) {
          group = this.duplicateOnDiskAndDbGrouped.find(g => g.filename === filename);
        }
        if (!group) return;
        
        const hashDetail = this.hashDetails[filename];
        if (!hashDetail) {
          this.metadataResults[filename] = 'Error: Hash information not available. Please check hash first.';
          return;
        }
        
        let resultText = '';
        
        if (hashDetail.uniqueHashes.size === 1) {
          const firstPath = Object.values(hashDetail.hashGroups)[0][0];
          const pathFilename = firstPath.split('\\').pop().split('/').pop();
          
          try {
            const response = await apiService.searchModelByFilename(pathFilename);
            if (response && response.length > 0) {
              this.identicalHashModels[filename] = response;
              
              resultText = '<div style="margin-bottom: 8px; color: #666; font-style: italic;">📋 Data fetched from database:</div>';
              response.forEach((match, index) => {
                const modelUrl = `${this.frontendBaseUrl}/model/${match.modelId}/${match.modelVersionId}`;
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
          const comparisonResults = [];
          
          for (const [hash, paths] of Object.entries(hashDetail.hashGroups)) {
            try {
              const civitaiResponse = await this.fetchModelVersionIdByHash(hash);
              
              if (civitaiResponse && civitaiResponse.modelId && civitaiResponse.modelVersionId) {
                const dbFilename = await this.getFileNameFromDB(civitaiResponse.modelVersionId);
                
                if (dbFilename) {
                  comparisonResults.push({
                    hash: hash.substring(0, 8) + '...',
                    paths: paths,
                    civitaiModelId: civitaiResponse.modelId,
                    civitaiModelVersionId: civitaiResponse.modelVersionId,
                    dbFilename: dbFilename,
                    modelUrl: `${this.frontendBaseUrl}/model/${civitaiResponse.modelId}/${civitaiResponse.modelVersionId}`
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
          
          this.identicalHashModels[filename] = comparisonResults.filter(result => !result.error).map(result => ({
            modelId: result.civitaiModelId,
            modelVersionId: result.civitaiModelVersionId,
            fileName: result.dbFilename,
            hash: result.hash
          }));
          
          resultText = '<div style="margin-bottom: 8px; color: #666; font-style: italic;">🔍 Hash-based analysis from CivitAI:</div>';
          
          comparisonResults.forEach((result, index) => {
            if (result.error) {
              resultText += `<div style="margin-bottom: 12px;"><strong>Hash: ${result.hash}</strong></div>`;
              resultText += `<div style="color: #d9534f;">❌ ${result.error}</div>`;
            } else {
              resultText += `<div style="margin-bottom: 12px;"><strong>Hash: ${result.hash}</strong></div>`;
              resultText += `<div style="margin-bottom: 4px;"><strong> ${result.dbFilename}</strong></div>`;
              resultText += `<a href="${result.modelUrl}" target="_blank">Model ID: ${result.civitaiModelId}, Version ID: ${result.civitaiModelVersionId}</a><br>`;
              resultText += `<div style="margin-top: 4px; color: #666;"><strong>Files with this hash (${result.paths.length}):</strong></div>`;
              result.paths.forEach(path => {
                resultText += `<div style="margin-left: 12px; font-size: 0.9em; color: #555;">• ${path}</div>`;
              });
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
          return null;
        }
      } catch (error) {
        console.error('Error getting filename from DB:', error);
        return null;
      }
    },
    
    async registerActions(data) {
      const { filename, selectedActions } = data;
      
      // Validate the selected actions
      let group = this.duplicateOnDiskGrouped.find(g => g.filename === filename);
      if (!group) {
        group = this.duplicateOnDiskAndDbGrouped.find(g => g.filename === filename);
      }
      if (!group) {
        this.errorHandler.handleError(new Error('File group not found'), 'registering actions', { showNotification: true });
        return;
      }
      
      // Check if all paths have selected values
      const selectedValues = group.paths
        .map(path => selectedActions[path])
        .filter(value => value && value !== '');
      
      if (selectedValues.length !== group.paths.length) {
        this.errorHandler.handleError(new Error('Please select an action for all files'), 'validating selected actions', { showNotification: true });
        return;
      }
      
      // Check for duplicate values (excluding _duplicate)
      const valueCounts = {};
      const duplicateValues = [];
      
      selectedValues.forEach(value => {
        if (value !== '_duplicate') {
          valueCounts[value] = (valueCounts[value] || 0) + 1;
          if (valueCounts[value] === 2) {
            duplicateValues.push(value);
          }
        }
      });
      
      if (duplicateValues.length > 0) {
        this.errorHandler.handleError(new Error(`Duplicate values found: ${duplicateValues.join(', ')}. Each file must have a unique action (except "_duplicate").`), 'validating selected actions', { showNotification: true });
        return;
      }
      
      this.registrationResults[filename] = {};
      
      for (const path of group.paths) {
        const selectedAction = selectedActions[path];
        if (!selectedAction) continue;
        
        try {
          if (selectedAction === '_duplicate') {
            const result = await this.renameFileAsDuplicate(path);
            this.registrationResults[filename][path] = {
              action: selectedAction,
              status: 'success',
              message: 'File renamed'
            };
          } else {
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
    

    
    onDatabaseCheck(file) {
      const filename = file.fullPath.split('\\').pop().split('/').pop();
      
      if (this.dbCheckLoading[file.fullPath] || this.dbCheckedFiles.has(file.fullPath)) return;
      
      this.dbCheckLoading[file.fullPath] = true;
      this.dbCheckResults[file.fullPath] = null;
      
      apiService.searchModelByFilename(filename)
        .then(response => {
          if (response && response.length > 0) {
            const models = response.map(model => ({
              modelId: model.modelId,
              modelVersionId: model.modelVersionId,
              fileName: model.fileName,
              isDownloaded: model.isDownloaded,
              file_path: model.file_path,
              isRegistered: model.isDownloaded === 1 && model.file_path !== null,
              url: `${this.frontendBaseUrl}/model/${model.modelId}/${model.modelVersionId}`
            }));
            
            this.dbCheckResults[file.fullPath] = {
              success: true,
              models: models,
              count: models.length
            };
            this.dbCheckedFiles.add(file.fullPath);
          } else {
            this.dbCheckResults[file.fullPath] = {
              success: false,
              message: 'No model found in database'
            };
            this.dbCheckedFiles.add(file.fullPath);
          }
        })
        .catch(error => {
          this.dbCheckResults[file.fullPath] = {
            success: false,
            message: error.message || 'Error searching database for model'
          };
          this.errorHandler.handleError(error, 'searching database for model');
          this.dbCheckedFiles.add(file.fullPath);
        })
        .finally(() => {
          this.dbCheckLoading[file.fullPath] = false;
        });
    },
    
    onIdentifyMetadata(file) {
      if (this.identifyMetadataLoading[file.fullPath] || this.metadataIdentifiedFiles.has(file.fullPath)) {
        return;
      }
      
      this.identifyMetadataLoading[file.fullPath] = true;
      this.identifyMetadataResults[file.fullPath] = null;
      
      this.computeFileHash(file.fullPath)
        .then(hash => {
          return this.fetchModelVersionIdByHash(hash);
        })
        .then(civitaiResponse => {
          const modelVersionId = civitaiResponse.modelVersionId;
          const modelId = civitaiResponse.modelId;
          
          const modelUrl = `${this.frontendBaseUrl}/model/${modelId}/${modelVersionId}`;
          
          let resultText = '<div style="margin-bottom: 8px; color: #666; font-style: italic;">📋 Data fetched from CivitAI:</div>';
          resultText += `<div style="margin-bottom: 4px;"><strong>Model ID:</strong> ${modelId}</div>`;
          resultText += `<div style="margin-bottom: 4px;"><strong>Model Version ID:</strong> ${modelVersionId}</div>`;
          resultText += `<a href="${modelUrl}" target="_blank">View Model Details</a><br>`;
          
          this.identifyMetadataResults[file.fullPath] = resultText;
          this.errorHandler.handleSuccess(`Metadata identified for: ${file.fullPath}`);
          this.metadataIdentifiedFiles.add(file.fullPath);
        })
        .catch(error => {
          console.error('Error identifying metadata:', error);
          this.identifyMetadataResults[file.fullPath] = `❌ Error: ${error.message}`;
          this.errorHandler.handleError(error, `identifying metadata for ${file.fullPath}`, { showNotification: false });
          this.metadataIdentifiedFiles.add(file.fullPath);
        })
        .finally(() => {
          this.identifyMetadataLoading[file.fullPath] = false;
        });
    },
    
    async registerModel({ file, model }) {
      if (this.registrationLoading[file.fullPath] || this.registeredFiles.has(file.fullPath)) {
        return;
      }
      
      this.registrationLoading[file.fullPath] = true;
      
      try {
        const fileName = file.fullPath.split('\\').pop().split('/').pop();
        
        const result = await this.registerLoraInDatabase(model.modelId, model.modelVersionId, fileName, file.fullPath);
        this.registrationResults[file.fullPath] = {
          action: `Model ID: ${model.modelId}, Version ID: ${model.modelVersionId}`,
          status: 'success',
          message: 'Lora registered successfully'
        };
        this.errorHandler.handleSuccess(`Model registered successfully for: ${fileName}`);
        this.registeredFiles.add(file.fullPath);
      } catch (error) {
        this.registrationResults[file.fullPath] = {
          action: `Model ID: ${model.modelId}, Version ID: ${model.modelVersionId}`,
          status: 'error',
          message: error.message
        };
        this.errorHandler.handleError(error, `registering model for ${file.fullPath}`, { showNotification: false });
        this.registeredFiles.add(file.fullPath);
      } finally {
        this.registrationLoading[file.fullPath] = false;
      }
    }
  },
  beforeUnmount() {
    this.pendingOperations.forEach((controller, operationId) => {
      controller.abort();
    });
    this.pendingOperations.clear();
    this.processingFiles.clear();
    this.concurrentOperations.clear();
  }
}
</script>

<style scoped>
.civit-data-fetcher {
  padding: 1rem;
  width: 100%;
  margin: 0 auto;
}
</style> 