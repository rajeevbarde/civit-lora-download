<template>
  <div v-if="selectedModels.length > 0" class="bulk-actions">
    <div class="bulk-info">
      <span>{{ selectedModels.length }} model(s) selected</span>
      <button 
        @click="downloadSelectedModels" 
        class="btn-bulk-download" 
        :disabled="isBulkDownloading"
      >
        {{ isBulkDownloading ? 'Queuing...' : `Download ${selectedModels.length} Models` }}
      </button>
      <button @click="clearSelection" class="btn-clear-selection">Clear Selection</button>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { NOTIFICATION_TYPES } from '@/utils/constants.js';

export default {
  name: 'BulkActions',
  props: {
    selectedModels: {
      type: Array,
      default: () => []
    },
    models: {
      type: Array,
      default: () => []
    },
    isBulkDownloading: {
      type: Boolean,
      default: false
    },
    downloadingModels: {
      type: Array,
      default: () => []
    }
  },
  emits: ['bulk-download-start', 'bulk-download-complete', 'clear-selection', 'add-downloading', 'remove-downloading', 'notification'],
  methods: {
    async downloadSelectedModels() {
      if (this.selectedModels.length === 0) return;
      
      this.$emit('bulk-download-start');
      const selectedModelObjects = this.models.filter(model => 
        this.selectedModels.includes(model.modelId)
      );
      
      try {
        // Queue all downloads in parallel
        const downloadPromises = selectedModelObjects.map(async model => {
          if (this.isModelDownloading(model.modelId)) return;
          
          this.$emit('add-downloading', {
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
              this.$emit('remove-downloading', model.modelId);
            }
          } catch (err) {
            console.error(`Download failed for: ${model.fileName}`, err.message);
            this.$emit('remove-downloading', model.modelId);
          }
        });
        
        // Wait for all download requests to be queued
        await Promise.all(downloadPromises);
        
        // Clear selection after queuing all downloads
        this.$emit('clear-selection');
        
      } catch (error) {
        console.error('Bulk download error:', error);
        this.$emit('notification', 'Bulk download failed', NOTIFICATION_TYPES.ERROR);
      } finally {
        this.$emit('bulk-download-complete');
      }
    },
    
    clearSelection() {
      this.$emit('clear-selection');
    },
    
    isModelDownloading(modelId) {
      return this.downloadingModels.some(item => item.modelId === modelId);
    },
    
    startStatusPolling(modelVersionId, fileName) {
      let pollCount = 0;
      const maxPolls = 300; // 10 minutes at 2-second intervals
      
      // Poll for status updates every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          
          // Check if model is still in downloading state
          if (!this.downloadingModels.some(item => item.modelVersionId === modelVersionId)) {
            clearInterval(pollInterval);
            return;
          }
          
          // Check individual model status
          const response = await apiService.getModelDetail(modelVersionId);
          if (response) {
            // Check if download is complete (status changed from 0 to 1 or 3)
            if (response.isDownloaded === 1 || response.isDownloaded === 3) {
              // Download completed (success or failed)
              this.$emit('remove-downloading-by-version', modelVersionId);
              clearInterval(pollInterval);
              
              if (response.isDownloaded === 1) {
                console.log(`Download completed successfully for model: ${modelVersionId}`);
                this.$emit('notification', `✅ Download completed: ${fileName}`, NOTIFICATION_TYPES.SUCCESS);
              } else {
                console.log(`Download failed for model: ${modelVersionId}`);
                this.$emit('notification', `❌ Download failed: ${fileName}`, NOTIFICATION_TYPES.ERROR);
              }
            }
          }
        } catch (error) {
          console.error('Error polling for status:', error);
          
          // If we get a 404, the model might not exist in DB yet
          if (error.response && error.response.status === 404) {
            // Don't immediately fail, wait a bit more as the download might still be processing
            if (pollCount > 10) { // Wait at least 20 seconds before giving up
              this.$emit('remove-downloading-by-version', modelVersionId);
              clearInterval(pollInterval);
              this.$emit('notification', `❌ Download failed: Model not found in database`, NOTIFICATION_TYPES.ERROR);
            }
          }
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          this.$emit('remove-downloading-by-version', modelVersionId);
          console.log(`Stopped polling for model: ${modelVersionId} (max attempts reached)`);
          this.$emit('notification', `⏰ Download timeout: Check status manually`, NOTIFICATION_TYPES.WARNING);
        }
      }, 2000);
    }
  }
};
</script>

<style scoped>
.bulk-actions {
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-bulk-download {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-bulk-download:hover:not(:disabled) {
  background-color: #1976d2;
}

.btn-bulk-download:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-clear-selection {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-clear-selection:hover {
  background-color: #d32f2f;
}
</style> 