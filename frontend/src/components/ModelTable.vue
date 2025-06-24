<template>
  <div class="model-table-page">
    <h1>Model Database</h1>
    
    <!-- Notifications -->
    <div v-if="notifications.length > 0" class="notifications-container">
      <div v-for="notification in notifications" :key="notification.id" 
           :class="['notification', `notification-${notification.type}`]">
        <span class="notification-message">{{ notification.message }}</span>
        <button @click="removeNotification(notification.id)" class="notification-close">×</button>
      </div>
      <button @click="clearAllNotifications" class="clear-all-notifications">Clear All</button>
    </div>
    
    <!-- Filter Controls -->
    <div class="filters">
      <div class="filter-group">
        <label for="baseModelSelect">Base Model:</label>
        <select id="baseModelSelect" v-model="selectedBaseModel" :disabled="isFetchingBaseModels">
          <option value="">{{ isFetchingBaseModels ? 'Loading...' : 'All' }}</option>
          <option v-for="bm in baseModelOptions" :key="bm" :value="bm">{{ bm }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="downloadedSelect">Downloaded:</label>
        <select id="downloadedSelect" v-model="selectedDownloaded">
          <option value="">All</option>
          <option value="0">Not Downloaded</option>
          <option value="1">Downloaded</option>
          <option value="2">Downloading</option>
          <option value="3">Failed</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="modelNsfwSelect">Model NSFW:</label>
        <select id="modelNsfwSelect" v-model="selectedModelNsfw">
          <option value="">All</option>
          <option value="0">0 (Not NSFW)</option>
          <option value="1">1 (NSFW)</option>
        </select>
      </div>
    </div>
    
    <!-- Bulk Download Controls -->
    <div v-if="selectedModels.length > 0" class="bulk-actions">
      <div class="bulk-info">
        <span>{{ selectedModels.length }} model(s) selected</span>
        <button @click="bulkDownloadSelectedModels" class="btn-bulk-download" :disabled="isBulkDownloading">
          {{ isBulkDownloading ? 'Queuing...' : `Download ${selectedModels.length} Models` }}
        </button>
        <button @click="clearSelection" class="btn-clear-selection">Clear Selection</button>
      </div>
    </div>
    
    <!-- Download Status Indicator -->
    <div v-if="downloadingModels.length > 0" class="download-status">
      <div class="status-info">
        <span>🔄 {{ downloadingModels.length }} download(s) in progress</span>
        <button @click="checkDownloadStatus" class="btn-status-check" :disabled="isCheckingStatus">
          {{ isCheckingStatus ? 'Checking...' : (isStatusVisible ? 'Hide Status' : 'Show Status') }}
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Model ID</th>
              <th>Model Name / Version</th>
              <th>Model NSFW</th>
              <th>Model NSFW Level</th>
              <th>Base Model</th>
              <th>Base Model Type</th>
              <th>Version NSFW Level</th>
              <th>Version Download Count</th>
              <th>File Name</th>
              <th>File Download URL</th>
              <th class="checkbox-header">
                <input 
                  type="checkbox" 
                  :checked="isAllSelected" 
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                  class="checkbox-select-all"
                >
              </th>
              <th>Size (GB)</th>
              <th>Published At</th>
              <th>File Path</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="model in models" :key="model.modelId">
              <td>{{ model.modelId }}</td>
              <td>
                <a 
                  :href="`http://localhost:5173/model/${model.modelVersionId}`" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ model.modelName }} / {{ model.modelVersionName }}
                </a>
              </td>
              <td>{{ model.modelNsfw }}</td>
              <td>{{ model.modelNsfwLevel }}</td>
              <td>{{ model.basemodel }}</td>
              <td>{{ model.basemodeltype }}</td>
              <td>{{ model.modelVersionNsfwLevel }}</td>
              <td>{{ model.modelVersionDownloadCount?.toLocaleString() }}</td>
              <td>{{ model.fileName }}</td>
              <td>
                <button v-if="model.fileDownloadUrl && model.isDownloaded !== 1 && model.isDownloaded !== 2 && model.isDownloaded !== 3" 
                        @click="downloadModelFile(model)" 
                        class="btn-download"
                        :disabled="isModelDownloading(model.modelId)"
                        :class="{ 'loading': isModelDownloading(model.modelId) }">
                  {{ isModelDownloading(model.modelId) ? 'Downloading...' : 'Download' }}
                </button>
                <button v-else-if="model.fileDownloadUrl && model.isDownloaded === 3" 
                        @click="downloadModelFile(model)" 
                        class="btn-retry"
                        :disabled="isModelDownloading(model.modelId)"
                        :class="{ 'loading': isModelDownloading(model.modelId) }">
                  {{ isModelDownloading(model.modelId) ? 'Retrying...' : 'Retry' }}
                </button>
                <span v-else-if="model.isDownloaded === 1 || model.isDownloaded === 2" class="status-downloaded">Downloaded</span>
                <span v-else>-</span>
              </td>
              <td class="checkbox-cell">
                <input 
                  type="checkbox" 
                  :value="model.modelId"
                  v-model="selectedModels"
                  :disabled="!canSelectModel(model)"
                  class="checkbox-model"
                >
              </td>
              <td>{{ model.size_in_gb }}</td>
              <td>{{ formatDate(model.publishedAt) }}</td>
              <td>{{ model.file_path }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button 
          :disabled="currentPage === 1 || isChangingPage"
          @click="changePage(currentPage - 1)"
          class="btn-pagination"
        >{{ isChangingPage ? 'Loading...' : 'Previous' }}</button>
        <span class="page-info">Page {{ currentPage }}</span>
        <button 
          @click="changePage(currentPage + 1)"
          :disabled="isChangingPage"
          class="btn-pagination"
        >{{ isChangingPage ? 'Loading...' : 'Next' }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';

export default {
  setup() {
    const errorHandler = useErrorHandler();
    return { errorHandler };
  },
  data() {
    return {
      models: [],
      loading: false,
      error: null,
      currentPage: 1,
      itemsPerPage: 50,
      totalItems: 0,
      selectedModels: [],
      selectedBaseModel: '',
      selectedDownloaded: '',
      selectedModelNsfw: '',
      baseModelOptions: [],
      isFetchingBaseModels: false,
      isChangingPage: false,
      isBulkDownloading: false,
      downloadingModels: [],
      statusPollingIntervals: new Map(),
      notifications: [],
      isStatusVisible: false,
      isCheckingStatus: false,
      // Race condition protection
      pendingRequests: new Map(),
      isFetching: false,
      concurrentOperations: new Set()
    }
  },
  computed: {
    isAllSelected() {
      const selectableModels = this.models.filter(model => this.canSelectModel(model));
      return selectableModels.length > 0 && this.selectedModels.length === selectableModels.length;
    },
    isIndeterminate() {
      const selectableModels = this.models.filter(model => this.canSelectModel(model));
      return this.selectedModels.length > 0 && this.selectedModels.length < selectableModels.length;
    }
  },
  watch: {
    selectedBaseModel() {
      this.currentPage = 1;
      this.selectedModels = []; // Clear selection when filters change
      this.fetchModels();
    },
    selectedDownloaded() {
      this.currentPage = 1;
      this.selectedModels = []; // Clear selection when filters change
      this.fetchModels();
    },
    selectedModelNsfw() {
      this.currentPage = 1;
      this.selectedModels = [];
      this.fetchModels();
    }
  },
  mounted() {
    this.fetchBaseModels();
    this.fetchModels();
    
    // Start periodic cleanup to check for stuck downloads
    this.startPeriodicCleanup();
  },
  beforeUnmount() {
    // Clean up all intervals
    this.cleanupAllIntervals();
    
    // Cancel all pending requests
    this.cancelAllPendingRequests();
    
    // Clear all operations
    this.concurrentOperations.clear();
    
    console.log('Component unmounted, all cleanup completed');
  },
  deactivated() {
    // Clean up intervals when component is deactivated (route change)
    this.cleanupAllIntervals();
  },
  activated() {
    // Restart periodic cleanup if component is reactivated
    if (!this.cleanupInterval) {
      this.startPeriodicCleanup();
    }
  },
  methods: {
    canSelectModel(model) {
      // Only allow selection of models that can be downloaded
      return model.fileDownloadUrl && 
             model.isDownloaded !== 1 && 
             model.isDownloaded !== 2;
    },
    toggleSelectAll() {
      const selectableModels = this.models.filter(model => this.canSelectModel(model));
      if (this.isAllSelected) {
        this.selectedModels = [];
      } else {
        this.selectedModels = selectableModels.map(model => model.modelId);
      }
    },
    clearSelection() {
      this.selectedModels = [];
    },
    async bulkDownloadSelectedModels() {
      const operationId = 'bulkDownload';
      if (this.isOperationInProgress(operationId)) {
        console.log('Bulk download already in progress, skipping...');
        return;
      }
      
      if (this.selectedModels.length === 0) return;
      
      this.startOperation(operationId);
      this.isBulkDownloading = true;
      
      const selectedModelObjects = this.models.filter(model => 
        this.selectedModels.includes(model.modelId)
      );
      
      try {
        // Process downloads sequentially to prevent race conditions
        for (const model of selectedModelObjects) {
          if (this.isModelDownloading(model.modelId)) {
            console.log(`Model ${model.fileName} is already downloading, skipping...`);
            continue;
          }
          
          // Add to downloading list
          this.downloadingModels.push({
            modelId: model.modelId,
            modelVersionId: model.modelVersionId,
            fileName: model.fileName
          });
          
          try {
            const response = await apiService.downloadModelFile({
              url: model.fileDownloadUrl,
              fileName: model.fileName,
              baseModel: model.basemodel,
              modelVersionId: model.modelVersionId
            });
            
            if (response && response.success) {
              console.log(`Download queued for: ${model.fileName}`);
              // Start polling for this model
              this.startStatusPolling(model.modelVersionId, model.fileName);
            } else {
              console.error(`Failed to queue download for: ${model.fileName}`, response.error);
              this.removeFromDownloadingList(model.modelId);
            }
          } catch (err) {
            console.error(`Download failed for: ${model.fileName}`, err.message);
            this.removeFromDownloadingList(model.modelId);
          }
          
          // Small delay between downloads to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Clear selection after queuing all downloads
        this.selectedModels = [];
        
      } catch (error) {
        console.error('Bulk download error:', error);
      } finally {
        this.isBulkDownloading = false;
        this.endOperation(operationId);
      }
    },
    async fetchBaseModels() {
      const operationId = 'fetchBaseModels';
      if (this.isOperationInProgress(operationId)) {
        console.log('Base models fetch already in progress, skipping...');
        return;
      }
      
      this.startOperation(operationId);
      this.isFetchingBaseModels = true;
      
      try {
        const response = await apiService.getBaseModels();
        this.baseModelOptions = response.baseModels || [];
      } catch (error) {
        this.baseModelOptions = [];
      } finally {
        this.isFetchingBaseModels = false;
        this.endOperation(operationId);
      }
    },
    async fetchModels() {
      const operationId = 'fetchModels';
      if (this.isOperationInProgress(operationId)) {
        console.log('Models fetch already in progress, cancelling previous request...');
        this.cancelPendingRequest(operationId);
      }
      
      this.startOperation(operationId);
      this.loading = true;
      this.error = null;
      
      try {
        const params = {
          page: this.currentPage,
          limit: this.itemsPerPage,
        };
        if (this.selectedBaseModel) params.basemodel = this.selectedBaseModel;
        if (this.selectedDownloaded !== '') params.isDownloaded = this.selectedDownloaded;
        if (this.selectedModelNsfw !== '') params.modelNsfw = this.selectedModelNsfw;
        
        const signal = this.createRequestController(operationId);
        const response = await apiService.getModels(params, { signal });
        
        // Update data if this operation is still active
        if (this.concurrentOperations.has(operationId)) {
          this.models = response.data;
          this.totalItems = response.total;
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Models fetch was cancelled');
          return;
        }
        this.errorHandler.handleError(error, 'loading models');
        this.error = 'Failed to load models';
      } finally {
        this.loading = false;
        this.removeRequestController(operationId);
        this.endOperation(operationId);
      }
    },
    async changePage(newPage) {
      const operationId = 'changePage';
      if (this.isOperationInProgress(operationId)) {
        console.log('Page change already in progress, skipping...');
        return;
      }
      
      this.startOperation(operationId);
      this.isChangingPage = true;
      this.currentPage = newPage;
      this.selectedModels = []; // Clear selection when changing pages
      
      try {
        await this.fetchModels();
      } finally {
        this.isChangingPage = false;
        this.endOperation(operationId);
      }
    },
    async downloadModelFile(model) {
      try {
        // Add model to downloading list with modelVersionId for proper tracking
        this.downloadingModels.push({
          modelId: model.modelId,
          modelVersionId: model.modelVersionId,
          fileName: model.fileName
        });
        
        const response = await apiService.downloadModelFile({
          url: model.fileDownloadUrl,
          fileName: model.fileName,
          baseModel: model.basemodel,
          modelVersionId: model.modelVersionId
        });
        
        if (response && response.success) {
          console.log(`Download queued for: ${model.fileName}`);
          // Start polling for status updates
          this.startStatusPolling(model.modelVersionId, model.fileName);
        } else {
          console.error('Failed to queue download:', response.error || 'Unknown error');
          // Remove from downloading list on failure
          this.removeFromDownloadingList(model.modelId);
          this.errorHandler.handleError(new Error(response.error || 'Unknown error'), `queuing download for ${model.fileName}`);
        }
      } catch (err) {
        console.error('Download request failed:', err.response?.data?.error || err.message);
        
        // Remove from downloading list on error
        this.removeFromDownloadingList(model.modelId);
        
        // Use the new error handler for consistent error messaging
        this.errorHandler.handleError(err, `downloading ${model.fileName}`);
      }
    },
    removeFromDownloadingList(modelId) {
      const index = this.downloadingModels.findIndex(item => item.modelId === modelId);
      if (index > -1) {
        this.downloadingModels.splice(index, 1);
      }
    },
    isModelDownloading(modelId) {
      return this.downloadingModels.some(item => item.modelId === modelId);
    },
    startStatusPolling(modelVersionId, fileName) {
      // Prevent multiple polling intervals for the same model
      if (this.statusPollingIntervals.has(modelVersionId)) {
        console.log(`Polling already active for model: ${modelVersionId}`);
        return;
      }
      
      let pollCount = 0;
      const maxPolls = 300; // 10 minutes at 2-second intervals
      
      // Poll for status updates every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          
          // Check if model is still in downloading state
          if (!this.downloadingModels.some(item => item.modelVersionId === modelVersionId)) {
            this.stopStatusPolling(modelVersionId);
            return;
          }
          
          // Check individual model status without triggering loading state
          const response = await apiService.getModelDetail(modelVersionId);
          if (response) {
            // Use Vue's nextTick to ensure DOM updates are synchronized
            this.$nextTick(() => {
              // Update the specific model in the current data without refreshing entire table
              const modelIndex = this.models.findIndex(m => m.modelVersionId === modelVersionId);
              if (modelIndex !== -1) {
                // Create a new object to ensure reactivity
                this.models.splice(modelIndex, 1, { ...response });
              }
            });
            
            // Check if download is complete (status changed from 0 to 1 or 3)
            if (response.isDownloaded === 1 || response.isDownloaded === 3) {
              // Download completed (success or failed)
              this.removeFromDownloadingListByVersionId(modelVersionId);
              this.stopStatusPolling(modelVersionId);
              
              if (response.isDownloaded === 1) {
                console.log(`Download completed successfully for model: ${modelVersionId}`);
                this.errorHandler.handleSuccess(`Download completed: ${fileName}`);
              } else {
                console.log(`Download failed for model: ${modelVersionId}`);
                this.errorHandler.handleError(new Error('Download failed'), `downloading ${fileName}`);
              }
            }
          }
        } catch (error) {
          console.error('Error polling for status:', error);
          
          // If we get a 404, the model might not exist in DB yet
          if (error.response && error.response.status === 404) {
            // Don't immediately fail, wait a bit more as the download might still be processing
            if (pollCount > 10) { // Wait at least 20 seconds before giving up
              this.removeFromDownloadingListByVersionId(modelVersionId);
              this.stopStatusPolling(modelVersionId);
              this.errorHandler.handleError(new Error('Model not found in database'), `downloading ${fileName}`);
            }
          } else if (error.response && error.response.status >= 500) {
            // Server error, try again later
            console.log(`Server error while polling, will retry: ${error.message}`);
          } else {
            // Network error, try again later
            console.log(`Network error while polling, will retry: ${error.message}`);
          }
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          this.stopStatusPolling(modelVersionId);
          console.log(`Stopped polling for model: ${modelVersionId} (max attempts reached)`);
          this.errorHandler.handleWarning(`Download timeout: Check status manually for ${fileName}`);
        }
      }, 2000);
      
      // Store the interval for proper cleanup
      this.statusPollingIntervals.set(modelVersionId, pollInterval);
      console.log(`Started polling for model: ${modelVersionId}`);
    },
    stopStatusPolling(modelVersionId) {
      const interval = this.statusPollingIntervals.get(modelVersionId);
      if (interval) {
        clearInterval(interval);
        this.statusPollingIntervals.delete(modelVersionId);
        console.log(`Stopped polling for model: ${modelVersionId}`);
      }
    },
    removeFromDownloadingListByVersionId(modelVersionId) {
      const index = this.downloadingModels.findIndex(item => item.modelVersionId === modelVersionId);
      if (index > -1) {
        this.downloadingModels.splice(index, 1);
      }
    },
    showNotification(message, type = 'info') {
      const notification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date()
      };
      
      this.notifications.push(notification);
      
      // Removed automatic timer - user must manually close notifications
    },
    
    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    },
    
    clearAllNotifications() {
      this.notifications = [];
    },
    async checkDownloadStatus() {
      // Toggle status visibility
      this.isStatusVisible = !this.isStatusVisible;
      
      if (!this.isStatusVisible) {
        // Hide status - remove any existing status notifications
        this.notifications = this.notifications.filter(n => !n.message.includes('🔄') && !n.message.includes('⏳') && !n.message.includes('✅') && !n.message.includes('📋'));
        return;
      }
      
      this.isCheckingStatus = true;
      try {
        const response = await apiService.getDownloadStatus();
        console.log('Download queue status:', response);
        
        // Remove any existing status notifications first
        this.notifications = this.notifications.filter(n => !n.message.includes('🔄') && !n.message.includes('⏳') && !n.message.includes('✅') && !n.message.includes('📋'));
        
        // Show queue status to user
        const { active, queued, maxConcurrent } = response;
        let statusMessage = '';
        
        if (active > 0) {
          statusMessage += `🔄 ${active} download(s) currently active`;
        }
        
        if (queued > 0) {
          statusMessage += statusMessage ? ` | ` : '';
          statusMessage += `⏳ ${queued} download(s) waiting in queue`;
        }
        
        if (active === 0 && queued === 0) {
          statusMessage = '✅ No downloads in progress';
        }
        
        this.showNotification(statusMessage, 'info');
        
        // Also show current downloading models
        if (this.downloadingModels.length > 0) {
          const downloadingList = this.downloadingModels.map(item => item.fileName).join(', ');
          this.showNotification(`📋 Currently tracking: ${downloadingList}`, 'info');
        }
        
        // Only refresh if there are no active downloads to avoid blinking
        if (this.downloadingModels.length === 0) {
          await this.fetchModels();
        }
      } catch (error) {
        console.error('Failed to check download status:', error);
        this.errorHandler.handleError(error, 'checking download status');
      } finally {
        this.isCheckingStatus = false;
      }
    },
    startPeriodicCleanup() {
      // Don't start if already running
      if (this.cleanupInterval) {
        console.log('Periodic cleanup already running');
        return;
      }
      
      // Check for stuck downloads every 30 seconds
      this.cleanupInterval = setInterval(async () => {
        if (this.downloadingModels.length > 0) {
          console.log(`Periodic cleanup: Checking ${this.downloadingModels.length} downloading models`);
          
          try {
            // Refresh the table to get latest status
            await this.fetchModels();
            
            // Check if any downloads have completed
            const completedModels = [];
            for (const modelId of this.downloadingModels.map(item => item.modelId)) {
              const model = this.models.find(m => m.modelId === modelId);
              if (model && (model.isDownloaded === 1 || model.isDownloaded === 3)) {
                completedModels.push({ modelId, status: model.isDownloaded, fileName: model.fileName });
              }
            }
            
            // Remove completed models from downloading list
            for (const completed of completedModels) {
              this.removeFromDownloadingList(completed.modelId);
              
              if (completed.status === 1) {
                this.errorHandler.handleSuccess(`Download completed: ${completed.fileName}`);
              } else {
                this.errorHandler.handleError(new Error('Download failed'), `downloading ${completed.fileName}`);
              }
            }
            
            if (completedModels.length > 0) {
              console.log(`Periodic cleanup: Found ${completedModels.length} completed downloads`);
            }
          } catch (error) {
            console.error('Error during periodic cleanup:', error);
            // Don't stop the interval on error, just log it
          }
        }
      }, 30000); // 30 seconds
      
      console.log('Periodic cleanup started');
    },
    formatDate(timestamp) {
      if (!timestamp) return '-';
      
      try {
        const date = new Date(timestamp);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return timestamp; // Return original if invalid
        }
        
        // Format: "Jan 15, 2024 2:30:45 PM"
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) + ' ' + date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      } catch (error) {
        console.error('Error formatting date:', error);
        return timestamp; // Return original if formatting fails
      }
    },
    cleanupAllIntervals() {
      // Clean up periodic cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      
      // Clean up all status polling intervals
      this.statusPollingIntervals.forEach((interval, modelVersionId) => {
        clearInterval(interval);
        console.log(`Cleaned up polling interval for model: ${modelVersionId}`);
      });
      this.statusPollingIntervals.clear();
      
      console.log('All intervals cleaned up');
    },
    // Race condition protection methods
    cancelPendingRequest(requestId) {
      const controller = this.pendingRequests.get(requestId);
      if (controller) {
        controller.abort();
        this.pendingRequests.delete(requestId);
        console.log(`Cancelled pending request: ${requestId}`);
      }
    },
    
    cancelAllPendingRequests() {
      this.pendingRequests.forEach((controller, requestId) => {
        controller.abort();
        console.log(`Cancelled pending request: ${requestId}`);
      });
      this.pendingRequests.clear();
    },
    
    createRequestController(requestId) {
      const controller = new AbortController();
      this.pendingRequests.set(requestId, controller);
      return controller.signal;
    },
    
    removeRequestController(requestId) {
      this.pendingRequests.delete(requestId);
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
  }
}
</script>


<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  color: #2c3e50;
  background: #f8fafc;
}

.model-table-page {
  width: 100%;
  padding: 16px;
}

h1 {
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 24px;
  color: #1a202c;
  letter-spacing: -0.5px;
}

.filters {
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  color: #495057;
  transition: border-color 0.2s ease;
  min-width: 150px;
}

.filter-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.bulk-actions {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 6px;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bulk-info span {
  font-weight: 500;
  color: #1976d2;
}

.btn-bulk-download {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-bulk-download:hover:not(:disabled) {
  background: #1976d2;
}

.btn-bulk-download:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-clear-selection {
  padding: 8px 16px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-clear-selection:hover {
  background: #d32f2f;
}

.download-status {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
}

.status-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-info span {
  font-weight: 500;
  color: #495057;
}

.btn-status-check {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-status-check:hover {
  background: #0056b3;
}

.btn-status-check:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

.table-container {
  width: 100%;
}

.table-wrapper {
  width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
  background: #f2f2f2;
}

td {
  padding: 8px;
  border-bottom: 1px solid #ddd;
}

tr:hover {
  background-color: #f5f5f5;
}

.checkbox-header {
  width: 50px;
  text-align: center;
}

.checkbox-cell {
  width: 50px;
  text-align: center;
  padding: 10px 8px;
}

.checkbox-select-all, .checkbox-model {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-model:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-download {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.btn-download:hover:not(:disabled) {
  background: #218838;
}

.btn-download:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-download.loading {
  background: #6c757d;
}

.btn-retry {
  background: #ffc107;
  color: #212529;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.btn-retry:hover:not(:disabled) {
  background: #e0a800;
}

.btn-retry:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-retry.loading {
  background: #6c757d;
}

.status-downloaded {
  color: #28a745;
  font-weight: 500;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-top: 1px solid #dee2e6;
}

.btn-pagination {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background: #0056b3;
}

.btn-pagination:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

.page-info {
  font-weight: 500;
  color: #495057;
  min-width: 80px;
  text-align: center;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
  font-size: 1.1rem;
}

.loading::before {
  content: "⏳ ";
  margin-right: 0.5rem;
}

.btn-download.loading,
.btn-retry.loading {
  position: relative;
  color: transparent;
}

.btn-download.loading::after,
.btn-retry.loading::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
}

/* Notifications */
.notifications-container {
  margin-bottom: 16px;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 100%;
}

.notification-success {
  background-color: #d1fae5;
  border: 1px solid #10b981;
  color: #065f46;
}

.notification-error {
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #991b1b;
}

.notification-warning {
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
}

.notification-info {
  background-color: #dbeafe;
  border: 1px solid #3b82f6;
  color: #1e40af;
}

.notification-message {
  flex: 1;
  margin-right: 12px;
  word-wrap: break-word;
}

.notification-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.clear-all-notifications {
  background-color: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.clear-all-notifications:hover {
  background-color: #4b5563;
}

.filter-group select:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>