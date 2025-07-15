<template>
  <div>
    <slot 
      :message="message"
      :saved-paths="savedPaths"
      :validating-files="validatingFiles"
      :validation-results="validationResults"
      :scanning-unique-loras="scanningUniqueLoras"
      :unique-loras-results="uniqueLorasResults"
      :orphan-files="orphanFiles"
      :registering="registering"
      :register-result="registerResult"
      :register-timer="registerTimer"
      :has-saved-paths="hasSavedPaths"
      :handle-scan-click="handleScanClick"
      :handle-validate-click="handleValidateClick"
      :handle-register-click="handleRegisterClick"
      :handle-mismatch-deleted="handleMismatchDeleted"
    />
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';
import { useTimer } from '@/composables/useTimer.js';

export default {
  name: 'FileScannerLogic',
  props: {
    savedPaths: {
      type: Array,
      default: () => []
    }
  },
  setup() {
    const errorHandler = useErrorHandler();
    const { timer: registerTimer, startTimer: startRegisterTimer, stopTimer: stopRegisterTimer } = useTimer();
    
    return { 
      errorHandler,
      registerTimer,
      startRegisterTimer,
      stopRegisterTimer
    };
  },
  data() {
    return {
      message: '',
      validatingFiles: false,
      validationResults: null,
      // Race condition protection
      pendingOperations: new Map(),
      concurrentOperations: new Set(),
      scanningUniqueLoras: false,
      uniqueLorasResults: null,
      orphanFiles: [], // Store orphan files
      orphanScanStatus: '',
      registering: false,
      registerResult: null,
    };
  },
  computed: {
    hasSavedPaths() {
      return this.savedPaths && this.savedPaths.length > 0;
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
    
    // Event handlers for components
    
    handleScanClick(data) {
      if (data && data.error) {
        this.message = data.error;
        this.errorHandler.handleWarning(data.error);
        return;
      }
      this.scanUniqueLoras();
    },
    
    handleValidateClick() {
      this.validateDownloadedFiles();
    },
    
    handleRegisterClick(files) {
      this.registerUnregisteredFiles(files);
    },
    
    handleMismatchDeleted(idx) {
      // Handle mismatch deletion if needed
      this.$forceUpdate && this.$forceUpdate();
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
      if (!this.hasSavedPaths) {
        this.message = 'No saved paths to scan. Please add some paths first.';
        this.errorHandler.handleWarning('No saved paths to scan. Please add some paths first.');
        return;
      }
      this.cancelPendingOperation(operationId);
      this.startOperation(operationId);
      this.scanningUniqueLoras = true;
      this.message = 'Scanning for unique loRA...';
      this.uniqueLorasResults = null;
      
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
        // Clear message if not an error
        if (this.message === 'Scanning for unique loRA...') {
          this.message = '';
        }
      }
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
    
    async registerUnregisteredFiles(files) {
      this.registering = true;
      this.registerResult = null;
      this.startRegisterTimer();
      
      try {
        const payload = files.map(f => ({ baseName: f.baseName, fullPath: f.fullPath }));
        const result = await apiService.registerUnregisteredFiles(payload, { timeout: 2700000 });
        
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
        this.stopRegisterTimer();
      }
    },
  },
  beforeUnmount() {
    // Cancel all pending operations
    this.pendingOperations.forEach((controller, operationId) => {
      controller.abort();
    });
    this.pendingOperations.clear();
    
    // Clear concurrent operations
    this.concurrentOperations.clear();
  }
};
</script>

<style scoped>
/* No styles needed - this is a logic-only component */
</style> 