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
      :processed-model-data="processedModelData"
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
  computed: {
    processedModelData() {
      if (!this.model) return {};
      
      const excludedFields = [
        'modelId', 'modelType', 'modelVersionId', 'fileType', 
        'fileDownloadUrl', 'isDownloaded', 'modelDownloadCount', 
        'modelVersionNsfwLevel'
      ];
      
      const nsfwGroups = {
        'Safe': [0],
        'Mild': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        'Moderate': [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
        'NSFW': [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
        'Extreme NSFW': [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]
      };
      
      const fieldOrder = [
        'Model Name / Version', 'Description', 'Model Version Description',
        'NSFW Status', 'NSFW Level', 'Creator', 'Creator ID', 'Published Date',
        'Size', 'File Name', 'File Path', 'Base Model', 'Tags', 'Rating',
        'Rating Count', 'Comment Count', 'Favorite Count'
      ];
      
      return this.processModelFields(excludedFields, nsfwGroups, fieldOrder);
    }
  },
  methods: {
    processModelFields(excludedFields, nsfwGroups, fieldOrder) {
      const processed = {};
      
      // First pass: collect special fields
      const specialFields = this.collectSpecialFields();
      
      // Second pass: process all fields
      for (const [key, value] of Object.entries(this.model)) {
        if (excludedFields.includes(key)) continue;
        
        const { processedValue, processedKey } = this.processField(key, value, specialFields, nsfwGroups);
        if (processedKey) {
          processed[processedKey] = processedValue;
        }
      }
      
      // Reorder fields
      return this.reorderFields(processed, fieldOrder);
    },
    
    collectSpecialFields() {
      const fields = {};
      for (const [key, value] of Object.entries(this.model)) {
        if (key === 'modelName') fields.modelName = value;
        if (key === 'modelVersionName') fields.modelVersionName = value;
        if (key === 'description') fields.description = value;
        if (key === 'modelVersionDescription') fields.modelVersionDescription = value;
      }
      return fields;
    },
    
    processField(key, value, specialFields, nsfwGroups) {
      let processedValue = value;
      let processedKey = key;
      
      // Handle special field combinations
      if (key === 'modelName') {
        processedValue = specialFields.modelVersionName 
          ? `${value} / ${specialFields.modelVersionName}` 
          : value;
        processedKey = 'Model Name / Version';
        return { processedValue, processedKey };
      }
      
      if (key === 'modelVersionName') {
        return { processedValue: null, processedKey: null }; // Skip, combined with modelName
      }
      
      // Handle NSFW fields
      if (key === 'modelNsfw') {
        processedValue = value === 1 ? 'NSFW' : 'SFW';
        processedKey = 'NSFW Status';
      }
      
      if (key === 'modelNsfwLevel') {
        for (const [groupName, levels] of Object.entries(nsfwGroups)) {
          if (levels.includes(value)) {
            processedValue = groupName;
            break;
          }
        }
        processedKey = 'NSFW Level';
      }
      
      // Handle base model combination
      if (key === 'basemodel') {
        const baseModelType = this.model.basemodeltype;
        processedValue = baseModelType ? `${value} (${baseModelType})` : value;
        processedKey = 'Base Model';
      }
      
      if (key === 'basemodeltype') {
        return { processedValue: null, processedKey: null }; // Skip, combined with basemodel
      }
      
      // Handle file size conversion
      if (key === 'size_in_kb' && value !== null && value !== undefined) {
        const sizeInMB = (value / 1024).toFixed(2);
        processedValue = `${sizeInMB} MB`;
        processedKey = 'Size';
      }
      
      // Handle date formatting
      if (key === 'publishedAt' && value) {
        processedValue = new Date(value).toLocaleString();
        processedKey = 'Published Date';
      }
      
      // Handle file path based on download status
      if (key === 'file_path') {
        processedValue = this.getFilePathDisplay(value);
        processedKey = 'File Path';
      }
      
      // Format field names
      processedKey = this.formatFieldName(processedKey);
      
      return { processedValue, processedKey };
    },
    
    getFilePathDisplay(value) {
      const downloadStatus = this.model.isDownloaded;
      const statusMap = {
        1: value && value.trim() !== '' ? value : 'Path not available',
        0: 'Not downloaded',
        3: 'Download failed',
        4: 'Download ignored'
      };
      return statusMap[downloadStatus] || 'Unknown status';
    },
    
    formatFieldName(key) {
      const nameMap = {
        'fileName': 'File Name',
        'description': 'Description',
        'modelVersionDescription': 'Model Version Description',
        'tags': 'Tags',
        'nsfw': 'NSFW',
        'downloadCount': 'Download Count',
        'rating': 'Rating',
        'ratingCount': 'Rating Count',
        'commentCount': 'Comment Count',
        'favoriteCount': 'Favorite Count',
        'creator': 'Creator',
        'creatorId': 'Creator ID'
      };
      return nameMap[key] || key;
    },
    
    reorderFields(processed, fieldOrder) {
      const orderedFields = {};
      
      // Add fields in specified order
      for (const fieldName of fieldOrder) {
        if (processed[fieldName] !== undefined) {
          orderedFields[fieldName] = processed[fieldName];
        }
      }
      
      // Add remaining fields
      for (const [key, value] of Object.entries(processed)) {
        if (!fieldOrder.includes(key)) {
          orderedFields[key] = value;
        }
      }
      
      return orderedFields;
    },
    
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
    
    formatDate,
    
    getRelativeAge(publishedAt) {
      if (!this.model?.publishedAt || !publishedAt) return '';
      
      const current = new Date(this.model.publishedAt);
      const other = new Date(publishedAt);
      const diffMs = other - current;
      
      if (Math.abs(diffMs) < 1000 * 60) return 'Just now';
      
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);
      
      if (diffYear !== 0) {
        return Math.abs(diffYear) + ' year' + (Math.abs(diffYear) > 1 ? 's' : '') + 
               (diffYear > 0 ? ' newer' : ' older');
      }
      if (diffMonth !== 0) {
        return Math.abs(diffMonth) + ' month' + (Math.abs(diffMonth) > 1 ? 's' : '') + 
               (diffMonth > 0 ? ' newer' : ' older');
      }
      if (diffDay !== 0) {
        return Math.abs(diffDay) + ' day' + (Math.abs(diffDay) > 1 ? 's' : '') + 
               (diffDay > 0 ? ' newer' : ' older');
      }
      if (diffHr !== 0) {
        return Math.abs(diffHr) + ' hour' + (Math.abs(diffHr) > 1 ? 's' : '') + 
               (diffHr > 0 ? ' newer' : ' older');
      }
      if (diffMin !== 0) {
        return Math.abs(diffMin) + ' min' + (Math.abs(diffMin) > 1 ? 's' : '') + 
               (diffMin > 0 ? ' newer' : ' older');
      }
      
      return '';
    }
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
  