<template>
  <div class="model-table-page">
    <!-- Enhanced Header Section -->
    <ModelTableHeader />
    
    <!-- Enhanced Notifications -->
    <ModelNotifications 
      ref="notificationsRef"
      :notifications="notifications"
      @remove-notification="removeNotification"
      @clear-all="clearAllNotifications"
    />
    
    <!-- Enhanced Filter Controls -->
    <ModelFilters 
      :initial-filters="savedFilters"
      @filter-change="handleFilterChange"
    />
    
    <!-- Enhanced Bulk Download Controls -->
    <ModelBulkActions 
      :selected-models="selectedModels"
      :is-bulk-downloading="isBulkDownloading"
      @bulk-download="bulkDownloadSelectedModels"
      @clear-selection="clearSelection"
    />
    
    <!-- Enhanced Download Status Indicator -->
    <ModelDownloadStatus 
      :downloading-models="downloadingModels"
      :is-checking-status="isCheckingStatus"
      :is-status-visible="isStatusVisible"
      @check-status="checkDownloadStatus"
    />

    <!-- Loading State -->
    <ModelLoadingState v-if="loading" />

    <!-- Error State -->
    <ModelErrorState v-else-if="error" :error="error" />

    <!-- Enhanced Grid Section -->
    <ModelGrid 
      v-else
      :models="models"
      :selected-models="selectedModels"
      :downloading-models="downloadingModels"
      :related-lora-map="relatedLoraMap"
      :current-page="currentPage"
      :is-changing-page="isChangingPage"
      @download-model="downloadModelFile"
      @selection-change="handleSelectionChange"
      @ignore-model="ignoreModelStatus"
      @page-change="changePage"
      @select-all="handleSelectAll"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, onBeforeUnmount, onDeactivated, onActivated, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { inject } from 'vue';
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';
import { DOWNLOAD_STATUS } from '@/utils/constants.js';

// Import all the new components
import {
  ModelTableHeader,
  ModelNotifications,
  ModelFilters,
  ModelBulkActions,
  ModelDownloadStatus,
  ModelGrid,
  ModelLoadingState,
  ModelErrorState
} from '@/components/model/index.js';

export default {
  name: 'ModelTablePage',
  components: {
    ModelTableHeader,
    ModelNotifications,
    ModelFilters,
    ModelBulkActions,
    ModelDownloadStatus,
    ModelGrid,
    ModelLoadingState,
    ModelErrorState
  },
  setup() {
    const errorHandler = useErrorHandler();
    const router = useRouter();
    const showSuccess = inject('showSuccess');
    const showError = inject('showError');
    const notificationsRef = ref(null);

    // Reactive data
    const models = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const currentPage = ref(1);
    const itemsPerPage = ref(50);
    const totalItems = ref(0);
    const selectedModels = ref([]);
    const isChangingPage = ref(false);
    const isBulkDownloading = ref(false);
    const downloadingModels = ref([]);
    const statusPollingIntervals = ref(new Map());
    const notifications = ref([]);
    const isStatusVisible = ref(false);
    const isCheckingStatus = ref(false);
    const pendingRequests = ref(new Map());
    const concurrentOperations = ref(new Set());
    const relatedLoraMap = ref({});
    const relatedLoraLoading = ref({});
    const isRestoringFilters = ref(false);
    const savedFilters = ref({});
    const cleanupInterval = ref(null);

    // Methods
    const handleFilterChange = (filters) => {
      if (isRestoringFilters.value) return;
      
      currentPage.value = 1;
      selectedModels.value = [];
      saveFiltersToLocalStorage(filters);
      fetchModels();
    };

    const saveFiltersToLocalStorage = (filters) => {
      localStorage.setItem('loraHubFilters', JSON.stringify(filters));
      savedFilters.value = filters;
    };

    const loadFiltersFromLocalStorage = () => {
      const savedFiltersData = localStorage.getItem('loraHubFilters');
      if (savedFiltersData) {
        try {
          const filters = JSON.parse(savedFiltersData);
          savedFilters.value = filters;
          return filters;
        } catch (e) {
          console.error('Failed to parse saved filters:', e);
        }
      }
      return {};
    };

    const handleSelectionChange = (newSelection) => {
      selectedModels.value = newSelection;
    };

    const handleSelectAll = (newSelection) => {
      selectedModels.value = newSelection;
    };

    const clearSelection = () => {
      selectedModels.value = [];
    };

    const showNotification = (message, type = 'info') => {
      const notification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date()
      };
      
      notifications.value.push(notification);
    };

    const removeNotification = (id) => {
      const index = notifications.value.findIndex(n => n.id === id);
      if (index > -1) {
        notifications.value.splice(index, 1);
      }
    };

    const clearAllNotifications = () => {
      notifications.value = [];
    };

    const canSelectModel = (model) => {
      return model.fileDownloadUrl && 
             model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && 
             model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING && 
             model.isDownloaded !== DOWNLOAD_STATUS.FAILED && 
             model.isDownloaded !== DOWNLOAD_STATUS.IGNORED;
    };

    const bulkDownloadSelectedModels = async () => {
      const operationId = 'bulkDownload';
      if (concurrentOperations.value.has(operationId)) {
        return;
      }
      
      if (selectedModels.value.length === 0) return;
      
      concurrentOperations.value.add(operationId);
      isBulkDownloading.value = true;
      
      const selectedModelObjects = models.value.filter(model => 
        selectedModels.value.includes(model.modelId)
      );
      
      try {
        // Start periodic cleanup if this is the first download
        if (downloadingModels.value.length === 0) {
          startPeriodicCleanup();
        }
        
        // Process downloads sequentially to prevent race conditions
        for (const model of selectedModelObjects) {
          if (isModelDownloading(model.modelId)) {
            continue;
          }
          
          // Add to downloading list
          downloadingModels.value.push({
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
              startStatusPolling(model.modelVersionId, model.fileName);
            } else {
              removeFromDownloadingList(model.modelId);
            }
          } catch (err) {
            removeFromDownloadingList(model.modelId);
          }
          
          // Small delay between downloads to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Clear selection after queuing all downloads
        selectedModels.value = [];
        
      } finally {
        isBulkDownloading.value = false;
        concurrentOperations.value.delete(operationId);
      }
    };

    const fetchModels = async () => {
      const operationId = 'fetchModels';
      if (concurrentOperations.value.has(operationId)) {
        cancelPendingRequest(operationId);
      }
      
      concurrentOperations.value.add(operationId);
      loading.value = true;
      error.value = null;
      
      try {
        const params = {
          page: currentPage.value,
          limit: itemsPerPage.value,
        };
        
        if (savedFilters.value.selectedBaseModel) params.basemodel = savedFilters.value.selectedBaseModel;
        if (savedFilters.value.selectedDownloaded !== '') params.isDownloaded = savedFilters.value.selectedDownloaded;
        if (savedFilters.value.selectedModelNsfw !== '') params.modelNsfw = savedFilters.value.selectedModelNsfw;
        if (savedFilters.value.selectedVersionNsfwLevelRange !== '') params.versionNsfwLevelRange = savedFilters.value.selectedVersionNsfwLevelRange;
        
        const signal = createRequestController(operationId);
        const response = await apiService.getModels(params, { signal });
        
        if (concurrentOperations.value.has(operationId)) {
          models.value = response.data;
          totalItems.value = response.total;
          // After models are loaded, fetch related lora for visible models
          fetchRelatedLoraForVisibleModels();
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        errorHandler.handleError(error, 'loading models');
        error.value = 'Failed to load models';
      } finally {
        loading.value = false;
        removeRequestController(operationId);
        concurrentOperations.value.delete(operationId);
      }
    };

    const changePage = async (newPage) => {
      const operationId = 'changePage';
      if (concurrentOperations.value.has(operationId)) {
        return;
      }
      
      concurrentOperations.value.add(operationId);
      isChangingPage.value = true;
      currentPage.value = newPage;
      selectedModels.value = []; // Clear selection when changing pages
      
      try {
        await fetchModels();
      } finally {
        isChangingPage.value = false;
        concurrentOperations.value.delete(operationId);
      }
    };

    const downloadModelFile = async (model) => {
      let timeoutId;
      let finished = false;
      
      // Add model to downloading list with modelVersionId for proper tracking
      downloadingModels.value.push({
        modelId: model.modelId,
        modelVersionId: model.modelVersionId,
        fileName: model.fileName
      });

      // Start periodic cleanup if this is the first download
      if (downloadingModels.value.length === 1) {
        startPeriodicCleanup();
      }

      // Start a 20-second timeout to mark as failed if not started
      timeoutId = setTimeout(() => {
        if (finished) return;
        finished = true;
        removeFromDownloadingList(model.modelId);
        model.isDownloaded = DOWNLOAD_STATUS.FAILED;
        errorHandler.handleError(new Error('Download did not start within 20 seconds'), `downloading ${model.fileName}`);
      }, 20000);

      try {
        const response = await apiService.downloadModelFile({
          url: model.fileDownloadUrl,
          fileName: model.fileName,
          baseModel: model.basemodel,
          modelVersionId: model.modelVersionId
        });

        if (finished) return; // Timeout already triggered
        finished = true;
        clearTimeout(timeoutId);

        if (response && response.success) {
          // Start polling for status updates
          startStatusPolling(model.modelVersionId, model.fileName);
        } else {
          removeFromDownloadingList(model.modelId);
          model.isDownloaded = DOWNLOAD_STATUS.FAILED;
          errorHandler.handleError(new Error(response.error || 'Unknown error'), `queuing download for ${model.fileName}`);
        }
      } catch (err) {
        if (finished) return; // Timeout already triggered
        finished = true;
        clearTimeout(timeoutId);
        removeFromDownloadingList(model.modelId);
        model.isDownloaded = DOWNLOAD_STATUS.FAILED;
        errorHandler.handleError(err, `downloading ${model.fileName}`);
      }
    };

    const removeFromDownloadingList = (modelId) => {
      const index = downloadingModels.value.findIndex(item => item.modelId === modelId);
      if (index > -1) {
        downloadingModels.value.splice(index, 1);
      }
    };

    const isModelDownloading = (modelId) => {
      return downloadingModels.value.some(item => item.modelId === modelId);
    };

    const startStatusPolling = (modelVersionId, fileName) => {
      // Prevent multiple polling intervals for the same model
      if (statusPollingIntervals.value.has(modelVersionId)) {
        return;
      }
      
      let pollCount = 0;
      const maxPolls = 300; // 10 minutes at 2-second intervals
      
      // Poll for status updates every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          
          // Check if model is still in downloading state
          if (!downloadingModels.value.some(item => item.modelVersionId === modelVersionId)) {
            stopStatusPolling(modelVersionId);
            return;
          }
          
          // Check individual model status without triggering loading state
          const response = await apiService.getModelDetail(modelVersionId);
          if (response) {
            // Use Vue's nextTick to ensure DOM updates are synchronized
            nextTick(() => {
              // Update the specific model in the current data without refreshing entire table
              const modelIndex = models.value.findIndex(m => m.modelVersionId === modelVersionId);
              if (modelIndex !== -1) {
                // Create a new object to ensure reactivity
                models.value.splice(modelIndex, 1, { ...response });
              }
            });
            
            // Check if download is complete (status changed from 0 to 1 or 3)
            if (response.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED || response.isDownloaded === DOWNLOAD_STATUS.FAILED) {
              // Download completed (success or failed)
              removeFromDownloadingListByVersionId(modelVersionId);
              stopStatusPolling(modelVersionId);
              
              if (response.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED) {
                errorHandler.handleSuccess(`Download completed: ${fileName}`);
              } else {
                errorHandler.handleError(new Error('Download failed'), `downloading ${fileName}`);
              }
            }
          }
        } catch (error) {
          // If we get a 404, the model might not exist in DB yet
          if (error.response && error.response.status === 404) {
            // Don't immediately fail, wait a bit more as the download might still be processing
            if (pollCount > 10) { // Wait at least 20 seconds before giving up
              removeFromDownloadingListByVersionId(modelVersionId);
              stopStatusPolling(modelVersionId);
              errorHandler.handleError(new Error('Model not found in database'), `downloading ${fileName}`);
            }
          } else if (error.response && error.response.status >= 500) {
            // Server error, try again later
            errorHandler.handleWarning(`Server error while polling, will retry: ${error.message}`);
          } else {
            // Network error, try again later
            errorHandler.handleWarning(`Network error while polling, will retry: ${error.message}`);
          }
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          stopStatusPolling(modelVersionId);
          errorHandler.handleWarning(`Download timeout: Check status manually for ${fileName}`);
        }
      }, 2000);
      
      // Store the interval for proper cleanup
      statusPollingIntervals.value.set(modelVersionId, pollInterval);
    };

    const stopStatusPolling = (modelVersionId) => {
      const interval = statusPollingIntervals.value.get(modelVersionId);
      if (interval) {
        clearInterval(interval);
        statusPollingIntervals.value.delete(modelVersionId);
      }
    };

    const removeFromDownloadingListByVersionId = (modelVersionId) => {
      const index = downloadingModels.value.findIndex(item => item.modelVersionId === modelVersionId);
      if (index > -1) {
        downloadingModels.value.splice(index, 1);
      }
    };

    const checkDownloadStatus = async () => {
      // Toggle status visibility
      isStatusVisible.value = !isStatusVisible.value;
      
      if (!isStatusVisible.value) {
        // Hide status - remove any existing status notifications
        notifications.value = notifications.value.filter(n => !n.message.includes('🔄') && !n.message.includes('⏳') && !n.message.includes('✅') && !n.message.includes('📋'));
        return;
      }
      
      isCheckingStatus.value = true;
      try {
        const response = await apiService.getDownloadStatus();
        
        // Remove any existing status notifications first
        notifications.value = notifications.value.filter(n => !n.message.includes('🔄') && !n.message.includes('⏳') && !n.message.includes('✅') && !n.message.includes('📋'));
        
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
        
        showNotification(statusMessage, 'info');
        
        // Also show current downloading models
        if (downloadingModels.value.length > 0) {
          const downloadingList = downloadingModels.value.map(item => item.fileName).join(', ');
          showNotification(`📋 Currently tracking: ${downloadingList}`, 'info');
        }
        
        // Only refresh if there are no active downloads to avoid blinking
        if (downloadingModels.value.length === 0) {
          await fetchModels();
        }
      } catch (error) {
        errorHandler.handleError(error, 'checking download status');
      } finally {
        isCheckingStatus.value = false;
      }
    };

    const startPeriodicCleanup = () => {
      // Don't start if already running
      if (cleanupInterval.value) {
        return;
      }
      
      // Only start interval if there are downloads in progress
      if (downloadingModels.value.length === 0) {
        return;
      }
      
      // Check for stuck downloads every 30 seconds
      cleanupInterval.value = setInterval(async () => {
        // Stop interval if no downloads are active
        if (downloadingModels.value.length === 0) {
          stopPeriodicCleanup();
          return;
        }
        
        try {
          // Check status of each downloading model individually
          const completedModels = [];
          
          for (const downloadingItem of downloadingModels.value) {
            try {
              const response = await apiService.getModelDetail(downloadingItem.modelVersionId);
              if (response) {
                // Update the specific model in the current data without refreshing entire table
                const modelIndex = models.value.findIndex(m => m.modelVersionId === downloadingItem.modelVersionId);
                if (modelIndex !== -1) {
                  // Create a new object to ensure reactivity
                  models.value.splice(modelIndex, 1, { ...response });
                }
                
                // Check if download is complete
                if (response.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED || response.isDownloaded === DOWNLOAD_STATUS.FAILED) {
                  completedModels.push({ 
                    modelId: downloadingItem.modelId, 
                    status: response.isDownloaded, 
                    fileName: downloadingItem.fileName 
                  });
                }
              }
            } catch (error) {
              // If we get a 404, the model might not exist in DB yet - this is normal for new downloads
              if (error.response && error.response.status === 404) {
                // Don't immediately fail, wait for the model to be registered
                continue;
              }
              // For other errors, log but don't stop the process
              console.warn(`Error checking status for ${downloadingItem.fileName}:`, error.message);
            }
          }
          
          // Remove completed models from downloading list
          for (const completed of completedModels) {
            removeFromDownloadingList(completed.modelId);
            
            if (completed.status === DOWNLOAD_STATUS.DOWNLOADED) {
              errorHandler.handleSuccess(`Download completed: ${completed.fileName}`);
            } else {
              errorHandler.handleError(new Error('Download failed'), `downloading ${completed.fileName}`);
            }
          }
          
          // Stop interval if all downloads are complete
          if (downloadingModels.value.length === 0) {
            stopPeriodicCleanup();
          }
        } catch (error) {
          // Don't stop the interval on error, just log it
          console.warn('Error in periodic cleanup:', error.message);
        }
      }, 30000); // 30 seconds
    };

    const stopPeriodicCleanup = () => {
      if (cleanupInterval.value) {
        clearInterval(cleanupInterval.value);
        cleanupInterval.value = null;
      }
    };

    const cleanupAllIntervals = () => {
      // Clean up periodic cleanup interval
      stopPeriodicCleanup();
      
      // Clean up all status polling intervals
      statusPollingIntervals.value.forEach((interval, modelVersionId) => {
        clearInterval(interval);
      });
      statusPollingIntervals.value.clear();
    };

    // Race condition protection methods
    const cancelPendingRequest = (requestId) => {
      const controller = pendingRequests.value.get(requestId);
      if (controller) {
        controller.abort();
        pendingRequests.value.delete(requestId);
      }
    };
    
    const cancelAllPendingRequests = () => {
      pendingRequests.value.forEach((controller, requestId) => {
        controller.abort();
      });
      pendingRequests.value.clear();
    };
    
    const createRequestController = (requestId) => {
      const controller = new AbortController();
      pendingRequests.value.set(requestId, controller);
      return controller.signal;
    };
    
    const removeRequestController = (requestId) => {
      pendingRequests.value.delete(requestId);
    };

    const getRelatedLoraStatus = (model) => {
      const arr = relatedLoraMap.value[model.modelId];
      if (!arr) return { loading: true };
      if (arr.length <= 1) return { hasRelated: false };
      
      // Find the closest publishedAt (older/newer)
      const currentDate = new Date(model.publishedAt);
      const others = arr.filter(m => m.modelVersionId !== model.modelVersionId);
      let closest = null;
      let minDiff = Infinity;
      
      for (const r of others) {
        if (!r.publishedAt) continue;
        const diff = new Date(r.publishedAt) - currentDate;
        if (Math.abs(diff) < Math.abs(minDiff)) {
          minDiff = diff;
          closest = r;
        }
      }
      
      let relative = '';
      if (closest) {
        const diffMs = new Date(closest.publishedAt) - currentDate;
        const absMs = Math.abs(diffMs);
        const diffDay = Math.floor(absMs / (1000 * 60 * 60 * 24));
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffDay / 365);
        
        if (diffYear > 0) relative = `${diffYear} year${diffYear > 1 ? 's' : ''} ${diffMs > 0 ? 'newer' : 'older'}`;
        else if (diffMonth > 0) relative = `${diffMonth} month${diffMonth > 1 ? 's' : ''} ${diffMs > 0 ? 'newer' : 'older'}`;
        else if (diffDay > 0) relative = `${diffDay} day${diffDay > 1 ? 's' : ''} ${diffDay > 0 ? 'newer' : 'older'}`;
        else relative = diffMs > 0 ? 'newer' : 'older';
      }
      
      return { hasRelated: true, relative };
    };

    const fetchRelatedLoraForVisibleModels = async () => {
      // For each unique modelId on the current page, fetch related lora if not already fetched
      const uniqueModelIds = [...new Set(models.value.map(m => m.modelId))];
      for (const modelId of uniqueModelIds) {
        if (relatedLoraMap.value[modelId] || relatedLoraLoading.value[modelId]) continue;
        relatedLoraLoading.value[modelId] = true;
        try {
          const result = await apiService.getRelatedLoraByModelId(modelId);
          relatedLoraMap.value[modelId] = Array.isArray(result) ? result : [];
        } catch (err) {
          relatedLoraMap.value[modelId] = [];
        } finally {
          relatedLoraLoading.value[modelId] = false;
        }
      }
    };

    const ignoreModelStatus = async (model) => {
      try {
        await apiService.ignoreModel(model.modelVersionId);
        if (showSuccess) showSuccess('Model ignored successfully.');
        // Update the model in-place for instant UI feedback
        model.isDownloaded = DOWNLOAD_STATUS.IGNORED;
      } catch (error) {
        if (showError) showError('Failed to ignore model.');
      }
    };

    // Lifecycle hooks
    onMounted(() => {
      // Restore filter state from localStorage
      const filters = loadFiltersFromLocalStorage();
      if (Object.keys(filters).length > 0) {
        isRestoringFilters.value = true;
        savedFilters.value = filters;
        nextTick(() => {
          isRestoringFilters.value = false;
          fetchModels(); // Always fetch after restoring filters
        });
      } else {
        fetchModels();
      }
      
      // Don't start periodic cleanup automatically - it will start when downloads begin
    });

    onBeforeUnmount(() => {
      // Clean up all intervals
      cleanupAllIntervals();
      
      // Cancel all pending requests
      cancelAllPendingRequests();
      
      // Clear all operations
      concurrentOperations.value.clear();
    });

    onDeactivated(() => {
      // Clean up intervals when component is deactivated (route change)
      cleanupAllIntervals();
    });

    onActivated(() => {
      // Only restart periodic cleanup if there are active downloads
      if (downloadingModels.value.length > 0 && !cleanupInterval.value) {
        startPeriodicCleanup();
      }
    });

    return {
      // Reactive data
      models,
      loading,
      error,
      currentPage,
      itemsPerPage,
      totalItems,
      selectedModels,
      isChangingPage,
      isBulkDownloading,
      downloadingModels,
      notifications,
      isStatusVisible,
      isCheckingStatus,
      relatedLoraMap,
      savedFilters,
      notificationsRef,

      // Methods
      handleFilterChange,
      handleSelectionChange,
      handleSelectAll,
      clearSelection,
      showNotification,
      removeNotification,
      clearAllNotifications,
      canSelectModel,
      bulkDownloadSelectedModels,
      fetchModels,
      changePage,
      downloadModelFile,
      removeFromDownloadingList,
      isModelDownloading,
      startStatusPolling,
      stopStatusPolling,
      removeFromDownloadingListByVersionId,
      checkDownloadStatus,
      startPeriodicCleanup,
      stopPeriodicCleanup,
      cleanupAllIntervals,
      cancelPendingRequest,
      cancelAllPendingRequests,
      createRequestController,
      removeRequestController,
      getRelatedLoraStatus,
      fetchRelatedLoraForVisibleModels,
      ignoreModelStatus
    };
  }
}
</script>

<style scoped>
/* Base container styles */
.model-table-page {
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
}


</style>