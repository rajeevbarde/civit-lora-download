<template>
  <div class="model-table-page">
    <!-- Enhanced Header Section -->
    <div class="header-section">
      <h1 class="page-title">LoRA Hub</h1>
      <p class="page-subtitle">Browse, filter, and manage your LoRA model collection</p>
    </div>
    
    <!-- Enhanced Notifications -->
    <div v-if="notifications.length > 0" class="notifications-section">
      <div class="notifications-header">
        <span class="notifications-icon">🔔</span>
        <span class="notifications-label">Notifications</span>
        <span class="notifications-count">({{ notifications.length }})</span>
      </div>
      <div class="notifications-list">
        <div v-for="notification in notifications" :key="notification.id" 
             :class="['notification-item', `notification-${notification.type}`]">
          <div class="notification-content">
            <span class="notification-icon">
              {{ notification.type === 'success' ? '✅' : 
                 notification.type === 'error' ? '❌' : 
                 notification.type === 'warning' ? '⚠️' : 'ℹ️' }}
            </span>
            <span class="notification-message">{{ notification.message }}</span>
          </div>
          <button @click="removeNotification(notification.id)" class="notification-close" title="Dismiss">
            <span class="close-icon">×</span>
          </button>
        </div>
        <button @click="clearAllNotifications" class="clear-all-btn">
          <span class="clear-icon">🗑️</span>
          <span class="clear-text">Clear All</span>
        </button>
      </div>
    </div>
    
    <!-- Enhanced Filter Controls -->
    <div class="filters-section">
      <div class="filters-header">
        <span class="filters-icon">🔍</span>
        <span class="filters-label">Filter Models</span>
      </div>
      <div class="filters-grid">
        <div class="filter-group">
          <label for="baseModelSelect" class="filter-label">Base Model</label>
          <select id="baseModelSelect" v-model="selectedBaseModel" :disabled="isFetchingBaseModels" class="filter-select">
            <option value="">{{ isFetchingBaseModels ? 'Loading...' : 'All Base Models' }}</option>
            <option v-for="bm in baseModelOptions" :key="bm" :value="bm">{{ bm }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="downloadedSelect" class="filter-label">Download Status</label>
          <select id="downloadedSelect" v-model="selectedDownloaded" class="filter-select">
            <option value="">All Status</option>
            <option value="0">Not Downloaded</option>
            <option value="1">Downloaded</option>
            <option value="3">Failed</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="modelNsfwSelect" class="filter-label">Model Content</label>
          <select id="modelNsfwSelect" v-model="selectedModelNsfw" class="filter-select">
            <option value="">All Content</option>
            <option value="0">SFW</option>
            <option value="1">NSFW</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="versionNsfwLevelSelect" class="filter-label">Version Content</label>
          <select id="versionNsfwLevelSelect" v-model="selectedVersionNsfwLevelRange" class="filter-select">
            <option value="">All Levels</option>
            <option value="0">Safe</option>
            <option value="1-15">Mild</option>
            <option value="16-31">Moderate</option>
            <option value="32-47">NSFW</option>
            <option value="48-63">Extreme NSFW</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Enhanced Bulk Download Controls -->
    <div v-if="selectedModels.length > 0" class="bulk-actions-section">
      <div class="bulk-header">
        <span class="bulk-icon">📦</span>
        <span class="bulk-label">Bulk Actions</span>
        <span class="bulk-count">({{ selectedModels.length }} selected)</span>
      </div>
      <div class="bulk-controls">
        <button @click="bulkDownloadSelectedModels" class="bulk-download-btn" :disabled="isBulkDownloading">
          <span class="btn-icon">⬇️</span>
          <span class="btn-text">{{ isBulkDownloading ? 'Queuing...' : `Download ${selectedModels.length} Models` }}</span>
        </button>
        <button @click="clearSelection" class="clear-selection-btn">
          <span class="btn-icon">🗑️</span>
          <span class="btn-text">Clear Selection</span>
        </button>
      </div>
    </div>
    
    <!-- Enhanced Download Status Indicator -->
    <div v-if="downloadingModels.length > 0" class="download-status-section">
      <div class="status-header">
        <span class="status-icon">🔄</span>
        <span class="status-label">Download Status</span>
        <span class="status-count">({{ downloadingModels.length }} in progress)</span>
      </div>
      <div class="status-controls">
        <button @click="checkDownloadStatus" class="status-check-btn" :disabled="isCheckingStatus">
          <span class="btn-icon">👁️</span>
          <span class="btn-text">{{ isCheckingStatus ? 'Checking...' : (isStatusVisible ? 'Hide Status' : 'Show Status') }}</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-section">
      <div class="loading-content">
        <span class="loading-icon">⏳</span>
        <span class="loading-text">Loading LoRA models...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-section">
      <div class="error-content">
        <span class="error-icon">❌</span>
        <h3 class="error-title">Error Loading Models</h3>
        <p class="error-message">{{ error }}</p>
      </div>
    </div>

    <!-- Enhanced Table Section -->
    <div v-else class="table-section">
      <div class="table-header">
        <h2 class="table-title">Model Collection</h2>
        <p class="table-subtitle">Browse and manage your LoRA models</p>
      </div>
      
      <div class="table-container">
        <div class="table-wrapper">
          <table class="models-table">
            <thead>
              <tr>
                <th class="model-header">Model / Version Name</th>
                <th class="base-model-header">Base Model (Type)</th>
                <th class="filename-header">File Name</th>
                <th class="download-header">Download URL</th>
                <th class="checkbox-header">
                  <input type="checkbox"
                         :checked="isAllSelected"
                         :indeterminate.prop="isIndeterminate"
                         @change="toggleSelectAll"
                         class="checkbox-select-all" />
                </th>
                <th class="size-header">File Size</th>
                <th class="downloads-header">Download Count</th>
                <th class="path-header">File Path</th>
                <th class="date-header">Published At</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="model in models" :key="model.modelId" class="model-row">
                <td class="model-cell">
                  <a 
                    :href="`/model/${model.modelId}/${model.modelVersionId}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="model-link"
                  >
                    <span class="model-name">{{ model.modelName }}</span>
                    <span class="version-name">/ {{ model.modelVersionName }}</span>
                  </a>
                </td>
                <td class="base-model-cell">
                  <span class="base-model">{{ model.basemodel }}</span>
                  <span v-if="model.basemodeltype" class="base-model-type">({{ model.basemodeltype }})</span>
                </td>
                <td class="filename-cell">{{ model.fileName }}</td>
                <td class="download-cell">
                  <button v-if="model.fileDownloadUrl && model.isDownloaded !== 1 && model.isDownloaded !== 2 && model.isDownloaded !== 3" 
                          @click="downloadModelFile(model)" 
                          class="download-btn"
                          :disabled="isModelDownloading(model.modelId)"
                          :class="{ 'loading': isModelDownloading(model.modelId) }">
                    <span class="btn-icon">⬇️</span>
                    <span class="btn-text">{{ isModelDownloading(model.modelId) ? 'Downloading...' : 'Download' }}</span>
                  </button>
                  <button v-else-if="model.fileDownloadUrl && model.isDownloaded === 3" 
                          @click="downloadModelFile(model)" 
                          class="retry-btn"
                          :disabled="isModelDownloading(model.modelId)"
                          :class="{ 'loading': isModelDownloading(model.modelId) }">
                    <span class="btn-icon">🔄</span>
                    <span class="btn-text">{{ isModelDownloading(model.modelId) ? 'Retrying...' : 'Retry' }}</span>
                  </button>
                  <span v-else-if="model.isDownloaded === 1 || model.isDownloaded === 2" class="status-downloaded">
                    <span class="status-icon">✅</span>
                    <span class="status-text">Downloaded</span>
                  </span>
                  <span v-else class="no-download">-</span>
                </td>
                <td class="checkbox-cell">
                  <input type="checkbox"
                         :value="model.modelId"
                         v-model="selectedModels"
                         :disabled="!canSelectModel(model)"
                         class="checkbox-model" />
                </td>
                <td class="size-cell">{{ convertToMB(model.size_in_kb) }}</td>
                <td class="downloads-cell">{{ model.modelVersionDownloadCount?.toLocaleString() }}</td>
                <td class="path-cell">{{ model.file_path }}</td>
                <td class="date-cell">{{ formatDate(model.publishedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Enhanced Pagination -->
        <div class="pagination-section">
          <div class="pagination-controls">
            <button 
              :disabled="currentPage === 1 || isChangingPage"
              @click="changePage(currentPage - 1)"
              class="pagination-btn prev-btn"
            >
              <span class="btn-icon">◀️</span>
              <span class="btn-text">{{ isChangingPage ? 'Loading...' : 'Previous' }}</span>
            </button>
            <div class="page-info">
              <span class="page-label">Page</span>
              <span class="page-number">{{ currentPage }}</span>
            </div>
            <button 
              @click="changePage(currentPage + 1)"
              :disabled="isChangingPage"
              class="pagination-btn next-btn"
            >
              <span class="btn-text">{{ isChangingPage ? 'Loading...' : 'Next' }}</span>
              <span class="btn-icon">▶️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';
import { useRouter } from 'vue-router';

export default {
  setup() {
    const errorHandler = useErrorHandler();
    const router = useRouter();
    return { errorHandler, router };
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
      selectedVersionNsfwLevelRange: '',
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
    },
    selectedVersionNsfwLevelRange() {
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
              // Start polling for this model
              this.startStatusPolling(model.modelVersionId, model.fileName);
            } else {
              this.removeFromDownloadingList(model.modelId);
            }
          } catch (err) {
            this.removeFromDownloadingList(model.modelId);
          }
          
          // Small delay between downloads to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Clear selection after queuing all downloads
        this.selectedModels = [];
        
      } finally {
        this.isBulkDownloading = false;
        this.endOperation(operationId);
      }
    },
    async fetchBaseModels() {
      const operationId = 'fetchBaseModels';
      if (this.isOperationInProgress(operationId)) {
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
        if (this.selectedVersionNsfwLevelRange !== '') params.versionNsfwLevelRange = this.selectedVersionNsfwLevelRange;
        
        const signal = this.createRequestController(operationId);
        const response = await apiService.getModels(params, { signal });
        
        // Update data if this operation is still active
        if (this.concurrentOperations.has(operationId)) {
          this.models = response.data;
          this.totalItems = response.total;
        }
      } catch (error) {
        if (error.name === 'AbortError') {
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
          // Start polling for status updates
          this.startStatusPolling(model.modelVersionId, model.fileName);
        } else {
          this.removeFromDownloadingList(model.modelId);
          this.errorHandler.handleError(new Error(response.error || 'Unknown error'), `queuing download for ${model.fileName}`);
        }
      } catch (err) {
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
                this.errorHandler.handleSuccess(`Download completed: ${fileName}`);
              } else {
                this.errorHandler.handleError(new Error('Download failed'), `downloading ${fileName}`);
              }
            }
          }
        } catch (error) {
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
            this.errorHandler.handleWarning(`Server error while polling, will retry: ${error.message}`);
          } else {
            // Network error, try again later
            this.errorHandler.handleWarning(`Network error while polling, will retry: ${error.message}`);
          }
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          this.stopStatusPolling(modelVersionId);
          this.errorHandler.handleWarning(`Download timeout: Check status manually for ${fileName}`);
        }
      }, 2000);
      
      // Store the interval for proper cleanup
      this.statusPollingIntervals.set(modelVersionId, pollInterval);
    },
    stopStatusPolling(modelVersionId) {
      const interval = this.statusPollingIntervals.get(modelVersionId);
      if (interval) {
        clearInterval(interval);
        this.statusPollingIntervals.delete(modelVersionId);
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
        this.errorHandler.handleError(error, 'checking download status');
      } finally {
        this.isCheckingStatus = false;
      }
    },
    startPeriodicCleanup() {
      // Don't start if already running
      if (this.cleanupInterval) {
        return;
      }
      
      // Check for stuck downloads every 30 seconds
      this.cleanupInterval = setInterval(async () => {
        if (this.downloadingModels.length > 0) {
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
          } catch (error) {
            // Don't stop the interval on error, just log it
          }
        }
      }, 30000); // 30 seconds
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
      });
      this.statusPollingIntervals.clear();
    },
    // Race condition protection methods
    cancelPendingRequest(requestId) {
      const controller = this.pendingRequests.get(requestId);
      if (controller) {
        controller.abort();
        this.pendingRequests.delete(requestId);
      }
    },
    
    cancelAllPendingRequests() {
      this.pendingRequests.forEach((controller, requestId) => {
        controller.abort();
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
    convertToMB(kb) {
      if (kb === null || kb === undefined) return '-';
      const mb = kb / 1024;
      return Math.round(mb) + ' MB';
    }
  }
}
</script>


<style scoped>
/* Enhanced Header Section Styles */
.header-section {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 0;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #2c3e50;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.2rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Enhanced Notifications Section */
.notifications-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.notifications-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.notifications-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.notifications-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.notifications-count {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.notification-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.notification-icon {
  font-size: 1.2rem;
}

.notification-message {
  font-weight: 500;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.3s ease;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: #495057;
}

.clear-all-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
  align-self: flex-start;
}

.clear-all-btn:hover {
  background: linear-gradient(135deg, #5a6268 0%, #343a40 100%);
  transform: translateY(-1px);
}

.clear-icon {
  font-size: 1rem;
}

.clear-text {
  font-weight: 600;
}

/* Enhanced Filters Section */
.filters-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.filters-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.filters-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.filters-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background: white;
  font-size: 1rem;
  color: #495057;
  transition: all 0.3s ease;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select:hover {
  border-color: #adb5bd;
}

.filter-select:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Enhanced Bulk Actions Section */
.bulk-actions-section {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #2196f3;
}

.bulk-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #2196f3;
}

.bulk-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #1976d2;
}

.bulk-label {
  font-weight: 600;
  color: #1976d2;
  font-size: 1.1rem;
}

.bulk-count {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #1976d2;
  background: rgba(33, 150, 243, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.bulk-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.bulk-download-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.bulk-download-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.bulk-download-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.clear-selection-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.clear-selection-btn:hover {
  background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Enhanced Download Status Section */
.download-status-section {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #ffc107;
}

.status-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #ffc107;
}

.status-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #f57c00;
}

.status-label {
  font-weight: 600;
  color: #f57c00;
  font-size: 1.1rem;
}

.status-count {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #f57c00;
  background: rgba(255, 193, 7, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.status-controls {
  display: flex;
  gap: 1rem;
}

.status-check-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
  color: #212529;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-check-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffb300 0%, #ffa000 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.status-check-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Loading and Error States */
.loading-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 3rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
  text-align: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-icon {
  font-size: 3rem;
  animation: spin 2s linear infinite;
}

.loading-text {
  font-size: 1.2rem;
  color: #6c757d;
  font-weight: 500;
}

.error-section {
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #feb2b2;
  text-align: center;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-icon {
  font-size: 3rem;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #c53030;
  margin: 0;
}

.error-message {
  font-size: 1rem;
  color: #742a2a;
  margin: 0;
  line-height: 1.5;
}

/* Enhanced Table Section */
.table-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.table-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.table-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
}

.table-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.table-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.table-wrapper {
  width: 100%;
}

.models-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.model-header,
.base-model-header,
.filename-header,
.download-header,
.checkbox-header,
.size-header,
.downloads-header,
.path-header,
.date-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.checkbox-header {
  width: 60px;
  text-align: center;
}

.model-row {
  transition: all 0.3s ease;
}

.model-row:hover {
  background: #f8f9fa;
  transform: translateX(4px);
}

.model-cell,
.base-model-cell,
.filename-cell,
.download-cell,
.checkbox-cell,
.size-cell,
.downloads-cell,
.path-cell,
.date-cell {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  font-size: 0.95rem;
  line-height: 1.5;
}

.model-cell {
  font-weight: 500;
}

.model-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.model-link:hover {
  color: #5a6fd8;
  text-decoration: underline;
}

.model-name {
  font-weight: 600;
  color: #2c3e50;
}

.version-name {
  font-size: 0.9rem;
  color: #6c757d;
}

.base-model {
  font-weight: 500;
  color: #495057;
}

.base-model-type {
  font-size: 0.9rem;
  color: #6c757d;
  font-style: italic;
}

.filename-cell {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #495057;
}

.download-cell {
  text-align: center;
}

.download-btn,
.retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-width: 100px;
  justify-content: center;
}

.download-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.download-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #218838 0%, #1ea085 100%);
  transform: translateY(-1px);
}

.download-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
}

.retry-btn {
  background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
  color: #212529;
}

.retry-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffb300 0%, #ffa000 100%);
  transform: translateY(-1px);
}

.retry-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
}

.status-downloaded {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #28a745;
  font-weight: 600;
}

.status-icon {
  font-size: 1rem;
}

.status-text {
  font-size: 0.9rem;
}

.no-download {
  color: #6c757d;
  font-style: italic;
}

.checkbox-cell {
  text-align: center;
  width: 60px;
}

.checkbox-select-all,
.checkbox-model {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
}

.checkbox-model:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.size-cell,
.downloads-cell {
  text-align: center;
  font-weight: 500;
}

.path-cell {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: #495057;
  word-break: break-all;
}

.date-cell {
  font-size: 0.9rem;
  color: #6c757d;
}

/* Enhanced Pagination */
.pagination-section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pagination-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.pagination-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.page-label {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
}

.page-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

/* Button Icons and Text */
.btn-icon {
  font-size: 1rem;
}

.btn-text {
  font-weight: 600;
}

/* Loading Animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.download-btn.loading,
.retry-btn.loading {
  position: relative;
  color: transparent;
}

.download-btn.loading::after,
.retry-btn.loading::after {
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

/* Responsive Design */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1.1rem;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .bulk-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .status-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .table-title {
    font-size: 1.5rem;
  }
  
  .table-subtitle {
    font-size: 1rem;
  }
  
  .table-container {
    padding: 1rem;
  }
  
  .model-header,
  .base-model-header,
  .filename-header,
  .download-header,
  .checkbox-header,
  .size-header,
  .downloads-header,
  .path-header,
  .date-header,
  .model-cell,
  .base-model-cell,
  .filename-cell,
  .download-cell,
  .checkbox-cell,
  .size-cell,
  .downloads-cell,
  .path-cell,
  .date-cell {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
  }
  
  .pagination-controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .pagination-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Base container styles */
.model-table-page {
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
}
</style>