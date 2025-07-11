<template>
  <div class="metadata-page">
    <PageHeader />
    
    <div class="page-content">
      <!-- Statistics Cards -->
      <StatisticsGrid 
        :statistics="statistics" 
        :loading="loading" 
        :error="error" 
      />

      <!-- Loading State -->
      <LoadingState v-if="loading" />

      <!-- Error State -->
      <ErrorState 
        v-if="error" 
        :error="error" 
        @retry="loadStatistics" 
      />

      <!-- Action Section -->
      <ActionSection 
        v-if="!loading && !error"
        :fetching-metadata="fetchingMetadata"
        :caching-images="cachingImages"
        @fetch-metadata="fetchMetadata"
        @cache-images="cacheImages"
      />

      <!-- Progress Section -->
      <ProgressSection 
        v-if="fetchingMetadata || completed || cachingImages || cacheCompleted"
        :progress="progress"
        :completed="completed"
        :fetching-metadata="fetchingMetadata"
        :caching-images="cachingImages"
        :cache-completed="cacheCompleted"
        @clear-progress="clearProgress"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, inject, nextTick, watch } from 'vue';
import { apiService } from '../utils/api.js';
import {
  PageHeader,
  StatisticsGrid,
  LoadingState,
  ErrorState,
  ActionSection,
  ProgressSection
} from '../components/metadata';

export default {
  name: 'MetadataPage',
  components: {
    PageHeader,
    StatisticsGrid,
    LoadingState,
    ErrorState,
    ActionSection,
    ProgressSection
  },
  setup() {
    // Reactive state
    const statistics = ref({});
    const loading = ref(false);
    const error = ref(null);
    const fetchingMetadata = ref(false);
    const cachingImages = ref(false);
    const progress = ref([]);
    const completed = ref(false);
    const cacheCompleted = ref(false);
    const cancelFetch = ref(false);
    const cancelCache = ref(false);
    const abortController = ref(null);
    const cacheAbortController = ref(null);

    // Inject notification functions
    const showSuccess = inject('showSuccess');
    const showError = inject('showError');

    // Methods
    const loadStatistics = async () => {
      loading.value = true;
      error.value = null;
      try {
        statistics.value = await apiService.getMetadataStatistics();
      } catch (err) {
        error.value = err.message || 'Failed to load metadata statistics';
        console.error('Error loading metadata statistics:', err);
      } finally {
        loading.value = false;
      }
    };

    const fetchMetadata = async () => {
      // If already fetching, cancel the operation
      if (fetchingMetadata.value) {
        cancelFetch.value = true;
        if (abortController.value) {
          abortController.value.abort();
        }
        fetchingMetadata.value = false;
        showSuccess?.('Metadata fetching cancelled');
        return;
      }

      // Start fetching
      fetchingMetadata.value = true;
      cancelFetch.value = false;
      completed.value = false;
      progress.value = [];
      
      // Create new AbortController for this operation
      abortController.value = new AbortController();
      
      try {
        // Get LoRAs that need metadata with abort signal
        const lorasToProcess = await apiService.getRegisteredLoras({
          signal: abortController.value.signal
        });
        
        if (!lorasToProcess || lorasToProcess.length === 0) {
          showSuccess?.('No LoRAs found that need metadata fetching');
          return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process each LoRA individually
        for (const lora of lorasToProcess) {
          // Check for cancellation
          if (cancelFetch.value || abortController.value.signal.aborted) {
            console.log('Metadata fetching cancelled by user');
            break;
          }

          const progressItem = {
            modelId: lora.modelId,
            modelVersionId: lora.modelVersionId,
            modelName: lora.modelName,
            modelVersionName: lora.modelVersionName,
            status: 'fetching',
            message: 'Fetching metadata from CivitAI...',
            timestamp: new Date().toISOString()
          };
          progress.value.push(progressItem);
          
          try {
            const result = await apiService.fetchSingleLoRAMetadata(
              lora.modelId, 
              lora.modelVersionId,
              { signal: abortController.value.signal }
            );
            
            // Check for cancellation after each API call
            if (cancelFetch.value || abortController.value.signal.aborted) {
              progressItem.status = 'cancelled';
              progressItem.message = 'Cancelled by user';
              break;
            }
            
            if (result.success) {
              progressItem.status = 'success';
              progressItem.message = result.message;
              progressItem.triggerWords = result.triggerWords;
              successCount++;
            } else {
              progressItem.status = 'error';
              progressItem.message = result.message;
              errorCount++;
            }
          } catch (error) {
            // Check if the error is due to cancellation
            if (error.name === 'AbortError' || abortController.value.signal.aborted) {
              progressItem.status = 'cancelled';
              progressItem.message = 'Cancelled by user';
              break;
            } else {
              progressItem.status = 'error';
              progressItem.message = `❌ Failed: ${error.message}`;
              errorCount++;
            }
          }
        }
        
        // Show final results
        if (cancelFetch.value || abortController.value.signal.aborted) {
          const message = `Fetching cancelled. Processed ${successCount + errorCount} LoRAs: ${successCount} successful, ${errorCount} failed`;
          showSuccess?.(message);
        } else {
          const message = `Processed ${lorasToProcess.length} LoRAs: ${successCount} successful, ${errorCount} failed`;
          showSuccess?.(message);
          // Reload statistics and mark as completed only if not cancelled
          await loadStatistics();
          completed.value = true;
        }
        
      } catch (err) {
        // Check if the error is due to cancellation
        if (err.name === 'AbortError' || abortController.value.signal.aborted) {
          console.log('Metadata fetching cancelled');
          showSuccess?.('Metadata fetching cancelled');
        } else {
          console.error('Error fetching metadata:', err);
          showError?.(err.message || 'Failed to fetch metadata');
        }
      } finally {
        fetchingMetadata.value = false;
        cancelFetch.value = false;
        abortController.value = null;
      }
    };

        const cacheImages = async () => {
      // If already caching, cancel the operation
      if (cachingImages.value) {
        cancelCache.value = true;
        if (cacheAbortController.value) {
          cacheAbortController.value.abort();
        }
        cachingImages.value = false;
        showSuccess?.('Image caching cancelled');
        return;
      }

      // Start caching
      cachingImages.value = true;
      cancelCache.value = false;
      cacheCompleted.value = false;
      progress.value = [];
      
      // Create new AbortController for this operation
      cacheAbortController.value = new AbortController();
      
      try {
        // Get all JSON files to process
        const jsonFilesResult = await apiService.getJsonFiles({
          signal: cacheAbortController.value.signal
        });
        
        if (!jsonFilesResult.success || !jsonFilesResult.files || jsonFilesResult.files.length === 0) {
          showSuccess?.('No JSON files found to process');
          return;
        }
        
        const jsonFiles = jsonFilesResult.files;
        
        // Create a simple progress item
        const progressItem = {
          modelId: 'Cache',
          modelVersionId: 'Images',
          modelName: 'Image Caching',
          modelVersionName: 'In Progress...',
          status: 'fetching',
          message: `Processing ${jsonFiles.length} JSON files with concurrent downloads...`,
          timestamp: new Date().toISOString()
        };
        progress.value.push(progressItem);
        
        // Process all files at once (backend handles concurrency)
        const result = await apiService.cacheImages({
          signal: cacheAbortController.value.signal
        });
        
        // Check for cancellation
        if (cancelCache.value || cacheAbortController.value.signal.aborted) {
          progressItem.status = 'cancelled';
          progressItem.message = 'Cancelled by user';
          showSuccess?.('Image caching cancelled');
          return;
        }
        
        if (result.success) {
          progressItem.status = 'success';
          progressItem.message = result.message;
          progressItem.modelVersionName = 'Completed';
          cacheCompleted.value = true;
        } else {
          progressItem.status = 'error';
          progressItem.message = result.message || 'Failed to cache images';
        }
        
      } catch (err) {
        // Check if the error is due to cancellation
        if (err.name === 'AbortError' || cacheAbortController.value.signal.aborted) {
          showSuccess?.('Image caching cancelled');
        } else {
          console.error('Error caching images:', err);
          showError?.(err.message || 'Failed to cache images');
        }
      } finally {
        cachingImages.value = false;
        cancelCache.value = false;
        cacheAbortController.value = null;
      }
    };

    const clearProgress = () => {
      progress.value = [];
      completed.value = false;
      cacheCompleted.value = false;
    };

    // Auto-scroll to bottom of progress list
    const scrollToBottom = () => {
      nextTick(() => {
        const progressList = document.querySelector('.progress-list');
        if (progressList) {
          progressList.scrollTop = progressList.scrollHeight;
        }
      });
    };

    // Watch for changes in progress array and auto-scroll
    watch(progress, () => {
      scrollToBottom();
    }, { deep: true });

    // Lifecycle
    onMounted(() => {
      loadStatistics();
    });

    return {
      statistics,
      loading,
      error,
      fetchingMetadata,
      cachingImages,
      progress,
      completed,
      cacheCompleted,
      cancelFetch,
      cancelCache,
      abortController,
      cacheAbortController,
      loadStatistics,
      fetchMetadata,
      cacheImages,
      clearProgress
    };
  }
};
</script>

<style scoped>
/* Main Layout */
.metadata-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style> 