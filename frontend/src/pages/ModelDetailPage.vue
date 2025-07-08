<template>
  <div class="app-container">
    <!-- Header Section -->
    <PageHeader 
      title="Model Version Details" 
      subtitle="View detailed information about your selected model version" 
    />

    <!-- Download Actions -->
    <DownloadActions 
      v-if="model"
      :model="model"
      :downloading="downloading"
      :download-status="DOWNLOAD_STATUS"
      @download="downloadModelFile"
      @ignore="ignoreModel"
    />

    <!-- Related LoRA Table -->
    <RelatedLoraTable 
      v-if="relatedLora.length > 0"
      :related-lora="relatedLora"
      :current-model="model"
      :download-status="DOWNLOAD_STATUS"
    />

    <!-- Notification System -->
    <NotificationSystem ref="notificationSystem" />

    <!-- CivitAI Link -->
    <CivitaiLink 
      v-if="model && model.modelId && model.modelVersionId"
      :model-id="model.modelId"
      :model-version-id="model.modelVersionId"
      :civitai-base-url="civitaiBaseUrl"
    />

    <!-- Loading State -->
    <LoadingState v-if="loading" />

    <!-- Error State -->
    <ErrorState v-else-if="error" :error="error" />

    <!-- Model Details -->
    <ModelDetails 
      v-else
      :model="model"
    />
  </div>
</template>

<script>
import { useRoute } from 'vue-router';
import { apiService } from '@/utils/api.js';
import { API_CONFIG, DOWNLOAD_STATUS } from '@/utils/constants.js';
import { formatDate } from '@/utils/helpers.js';
import NotificationSystem from '@/components/common/NotificationSystem.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

// Local Components
import PageHeader from '@/components/modeldetails/PageHeader.vue';
import DownloadActions from '@/components/modeldetails/DownloadActions.vue';
import RelatedLoraTable from '@/components/modeldetails/RelatedLoraTable.vue';
import CivitaiLink from '@/components/modeldetails/CivitaiLink.vue';
import LoadingState from '@/components/modeldetails/LoadingState.vue';
import ErrorState from '@/components/modeldetails/ErrorState.vue';
import ModelDetails from '@/components/modeldetails/ModelDetails.vue';

export default {
  name: 'ModelDetailPage',
  components: { 
    NotificationSystem, 
    LoadingSpinner,
    PageHeader,
    DownloadActions,
    RelatedLoraTable,
    CivitaiLink,
    LoadingState,
    ErrorState,
    ModelDetails
  },
  setup() {
    const route = useRoute();
    return { route };
  },
  data() {
    return {
      model: null,
      loading: false,
      error: null,
      civitaiBaseUrl: API_CONFIG.CIVITAI_BASE_URL.replace('/api/v1', ''),
      downloading: false,
      DOWNLOAD_STATUS,
      pollingInterval: null,
      pollCount: 0,
      maxPolls: 300, // 10 minutes at 2s interval
      relatedLora: []
    };
  },
  mounted() {
    this.fetchModelDetails();
    this.fetchRelatedLora();
  },
  beforeUnmount() {
    this.stopPolling();
  },

  methods: {
    
    async fetchModelDetails() {
      try {
        this.loading = true;
        this.error = null;
        
        const modelVersionId = Number(this.route.params.modelVersionId);
        const urlModelId = Number(this.route.params.modelId);
        
        if (isNaN(modelVersionId)) throw new Error("Invalid model version ID");
        if (isNaN(urlModelId)) throw new Error("Invalid model ID");
        
        const response = await apiService.getModelDetail(modelVersionId);
        this.model = response;
        
        if (this.model && this.model.modelId !== urlModelId) {
          throw new Error(`URL model ID (${urlModelId}) does not match backend model ID (${this.model.modelId})`);
        }
      } catch (err) {
        console.error(err);
        this.error = err.message || "Failed to load model details.";
      } finally {
        this.loading = false;
      }
    },
    
    async fetchRelatedLora() {
      try {
        const modelId = Number(this.route.params.modelId);
        if (isNaN(modelId)) return;
        
        const result = await apiService.getRelatedLoraByModelId(modelId);
        this.relatedLora = Array.isArray(result) ? result : [];
      } catch (err) {
        this.relatedLora = [];
      }
    },
    
    showNotification(message, type = 'info') {
      if (this.$refs.notificationSystem?.showNotification) {
        this.$refs.notificationSystem.showNotification(message, type);
      }
    },
    
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
    
    startPollingForStatus() {
      this.stopPolling();
      this.pollCount = 0;
      
      this.pollingInterval = setInterval(async () => {
        this.pollCount++;
        
        if (!this.model?.modelVersionId) {
          this.stopPolling();
          return;
        }
        
        try {
          const response = await apiService.getModelDetail(this.model.modelVersionId);
          if (response) {
            this.model = { ...response };
            
            if (response.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED) {
              this.showNotification('Download completed: ' + (response.fileName || ''), 'success');
              this.downloading = false;
              this.stopPolling();
            } else if (response.isDownloaded === DOWNLOAD_STATUS.FAILED) {
              this.showNotification('Download failed: ' + (response.fileName || ''), 'error');
              this.downloading = false;
              this.stopPolling();
            }
          }
        } catch (err) {
          // Handle polling errors silently
        }
        
        if (this.pollCount >= this.maxPolls) {
          this.showNotification('Download status polling timed out.', 'warning');
          this.downloading = false;
          this.stopPolling();
        }
      }, 2000);
    },
    
    async downloadModelFile() {
      if (!this.model?.fileDownloadUrl) return;
      
      this.downloading = true;
      this.error = null;
      
      try {
        const payload = {
          url: this.model.fileDownloadUrl,
          fileName: this.model.fileName,
          baseModel: this.model.basemodel,
          modelVersionId: this.model.modelVersionId
        };
        
        const response = await apiService.downloadModelFile(payload);
        
        if (response?.success) {
          this.showNotification('Download started: ' + (this.model.fileName || ''), 'info');
          this.startPollingForStatus();
        } else {
          this.showNotification('Failed to start download: ' + (this.model.fileName || ''), 'error');
          this.downloading = false;
        }
        
        await this.fetchModelDetails();
      } catch (err) {
        this.error = err.message || 'Download failed.';
        this.showNotification('Download failed: ' + (this.model.fileName || ''), 'error');
        this.downloading = false;
      }
    },
    
    async ignoreModel() {
      if (!this.model?.modelVersionId) return;
      
      try {
        await apiService.ignoreModel(this.model.modelVersionId);
        this.model.isDownloaded = DOWNLOAD_STATUS.IGNORED;
        this.showNotification('Model ignored successfully.', 'success');
      } catch (err) {
        this.showNotification('Failed to ignore model.', 'error');
      }
    },
    
    formatDate
  }
};
</script>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-container {
    padding: 1rem;
  }
}
</style>
  