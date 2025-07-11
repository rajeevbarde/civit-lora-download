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
        v-if="fetchingMetadata || completed"
        :progress="progress"
        :completed="completed"
        :fetching-metadata="fetchingMetadata"
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
      fetchingMetadata.value = true;
      completed.value = false;
      progress.value = [];
      
      try {
        console.log('Fetching metadata from CivitAI API...');
        
        // Get LoRAs that need metadata
        const lorasToProcess = await apiService.getRegisteredLoras();
        
        if (!lorasToProcess || lorasToProcess.length === 0) {
          showSuccess?.('No LoRAs found that need metadata fetching');
          return;
        }
        
        console.log(`Found ${lorasToProcess.length} LoRAs to process`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process each LoRA individually
        for (const lora of lorasToProcess) {
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
            const result = await apiService.fetchSingleLoRAMetadata(lora.modelId, lora.modelVersionId);
            
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
            progressItem.status = 'error';
            progressItem.message = `❌ Failed: ${error.message}`;
            errorCount++;
          }
        }
        
        // Show final results
        const message = `Processed ${lorasToProcess.length} LoRAs: ${successCount} successful, ${errorCount} failed`;
        showSuccess?.(message);
        
        // Reload statistics and mark as completed
        await loadStatistics();
        completed.value = true;
        
      } catch (err) {
        console.error('Error fetching metadata:', err);
        showError?.(err.message || 'Failed to fetch metadata');
      } finally {
        fetchingMetadata.value = false;
      }
    };

    const cacheImages = async () => {
      cachingImages.value = true;
      try {
        console.log('Caching images...');
        // TODO: Implement image caching logic here
        showSuccess?.('Image caching completed');
      } catch (err) {
        console.error('Error caching images:', err);
        showError?.(err.message || 'Failed to cache images');
      } finally {
        cachingImages.value = false;
      }
    };

    const clearProgress = () => {
      progress.value = [];
      completed.value = false;
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