<template>
  <tr>
    <td>{{ model.modelId }}</td>
    <td>{{ model.modelName }}</td>
    <td>{{ model.modelType }}</td>
    <td>{{ model.modelNsfw }}</td>
    <td>{{ model.modelNsfwLevel }}</td>
    <td>{{ formatNumber(model.modelDownloadCount) }}</td>
    <td>
      <a 
        :href="`${frontendBaseUrl}/model/${model.modelVersionId}`" 
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ model.modelVersionId }}
      </a>
    </td>
    <td>{{ model.modelVersionName }}</td>
    <td>{{ model.basemodel }}</td>
    <td>{{ model.basemodeltype }}</td>
    <td>{{ model.modelVersionNsfwLevel }}</td>
    <td>{{ formatNumber(model.modelVersionDownloadCount) }}</td>
    <td>{{ model.fileName }}</td>
    <td>{{ model.fileType }}</td>
    <td>
      <button 
        v-if="model.fileDownloadUrl && model.isDownloaded !== 1 && model.isDownloaded !== 2 && model.isDownloaded !== 3" 
        @click="downloadModelFile(model)" 
        class="btn-download"
        :disabled="isModelDownloading(model.modelId)"
        :class="{ 'loading': isModelDownloading(model.modelId) }"
      >
        <template v-if="isModelDownloading(model.modelId)">
          <span class="downloading-text">Downloading...</span>
          <span class="progress-bar-container">
            <span class="progress-bar"></span>
          </span>
        </template>
        <template v-else>
          Download
        </template>
      </button>
      <button 
        v-else-if="model.fileDownloadUrl && model.isDownloaded === 3" 
        @click="downloadModelFile(model)" 
        class="btn-retry"
        :disabled="isModelDownloading(model.modelId)"
        :class="{ 'loading': isModelDownloading(model.modelId) }"
      >
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
    <td>{{ (model.size_in_kb / 1024 / 1024).toFixed(2) }}</td>
    <td>{{ formatDate(model.publishedAt) }}</td>
    <td>{{ model.isDownloaded }}</td>
    <td>{{ model.file_path }}</td>
  </tr>
</template>

<script>
import { formatNumber, formatDate } from '@/utils/helpers.js';
import { DOWNLOAD_STATUS, FRONTEND_CONFIG } from '@/utils/constants.js';

export default {
  name: 'ModelTableRow',
  props: {
    model: {
      type: Object,
      required: true
    },
    selectedModels: {
      type: Array,
      default: () => []
    },
    downloadingModels: {
      type: Array,
      default: () => []
    }
  },
  emits: ['download-model', 'selection-change'],
  computed: {
    frontendBaseUrl() {
      return FRONTEND_CONFIG.BASE_URL;
    },
    canSelectModel() {
      return (model) => {
        return model.fileDownloadUrl && 
               model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && 
               model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING &&
               model.isDownloaded !== DOWNLOAD_STATUS.IGNORED;
      };
    },
    
    isModelDownloading() {
      return (modelId) => {
        return this.downloadingModels.some(item => item.modelId === modelId);
      };
    }
  },
  methods: {
    formatNumber,
    formatDate,
    
    downloadModelFile(model) {
      this.$emit('download-model', model);
    }
  },
  
  watch: {
    selectedModels: {
      handler(newValue) {
        this.$emit('selection-change', newValue);
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.btn-download {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.btn-download:hover:not(:disabled) {
  background-color: #218838;
}

.btn-download:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-download.loading {
  background-color: #007bff;
  color: #fff;
  position: relative;
}

.downloading-text {
  color: #fff;
  font-weight: 500;
  font-size: 12px;
  margin-right: 8px;
}

.progress-bar-container {
  display: inline-block;
  vertical-align: middle;
  height: 4px;
  width: 48px;
  background: #cce3fa;
  border-radius: 2px;
  margin-left: 0;
  margin-top: 0;
  position: relative;
  top: 2px;
}

.progress-bar {
  display: block;
  height: 100%;
  width: 60%; /* Simulate progress visually, can be animated if desired */
  background: linear-gradient(90deg, #007bff 60%, #90caf9 100%);
  border-radius: 2px;
  animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
  0% { background-position: 0 0; }
  100% { background-position: 40px 0; }
}

.btn-retry {
  background-color: #ffc107;
  color: #212529;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.btn-retry:hover:not(:disabled) {
  background-color: #e0a800;
}

.btn-retry:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-retry.loading {
  background-color: #6c757d;
}

.status-downloaded {
  color: #28a745;
  font-weight: 500;
}

.checkbox-cell {
  text-align: center;
}

.checkbox-model {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-model:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style> 