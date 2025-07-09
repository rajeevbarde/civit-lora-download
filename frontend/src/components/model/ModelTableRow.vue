<template>
  <tr class="model-row">
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
      <div class="related-lora-block">
        <span class="related-lora-label">Related LoRA:</span>
        <template v-if="getRelatedLoraStatus(model).hasRelated">
          <span class="related-lora-yes"> {{ 'yes' }}<span v-if="getRelatedLoraStatus(model).relative"> ({{ getRelatedLoraStatus(model).relative }})</span></span>
        </template>
        <template v-else>
          <span class="related-lora-no"> no</span>
        </template>
      </div>
    </td>
    <td class="base-model-cell">
      <span class="base-model">{{ model.basemodel }}</span>
      <span v-if="model.basemodeltype" class="base-model-type">({{ model.basemodeltype }})</span>
    </td>
    <td class="filename-cell">{{ model.fileName }}</td>
    <td class="download-cell">
      <button v-if="model.fileDownloadUrl && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING && model.isDownloaded !== DOWNLOAD_STATUS.FAILED && model.isDownloaded !== DOWNLOAD_STATUS.IGNORED" 
              @click="downloadModelFile(model)" 
              class="download-btn"
              :disabled="isModelDownloading(model.modelId)"
              :class="{ 'loading': isModelDownloading(model.modelId) }">
        <span class="btn-icon">⬇️</span>
        <span class="btn-text">{{ isModelDownloading(model.modelId) ? 'Downloading...' : 'Download' }}</span>
      </button>
      <button v-if="model.fileDownloadUrl && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING && model.isDownloaded !== DOWNLOAD_STATUS.FAILED && model.isDownloaded !== DOWNLOAD_STATUS.IGNORED"
              @click="ignoreModelStatus(model)"
              class="ignore-btn">
        <span class="btn-icon">🚫</span>
        <span class="btn-text">Ignore</span>
      </button>
      <button v-else-if="model.fileDownloadUrl && model.isDownloaded === DOWNLOAD_STATUS.FAILED" 
              @click="downloadModelFile(model)" 
              class="retry-btn"
              :disabled="isModelDownloading(model.modelId)"
              :class="{ 'loading': isModelDownloading(model.modelId) }">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">{{ isModelDownloading(model.modelId) ? 'Retrying...' : 'Retry' }}</span>
      </button>
      <span v-else-if="model.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED" class="status-downloaded">
        <span class="status-icon">✅</span>
        <span class="status-text">Downloaded</span>
      </span>
      <span v-else-if="model.isDownloaded === DOWNLOAD_STATUS.IGNORED" class="status-ignored">
        <span class="status-icon">🚫</span>
        <span class="status-text">Ignored</span>
      </span>
      <span v-else class="no-download">-</span>
    </td>
    <td class="checkbox-cell">
      <input type="checkbox"
             :value="model.modelId"
             :checked="isSelected"
             @change="handleSelectionChange"
             :disabled="!canSelectModel(model)"
             class="checkbox-model" />
    </td>
    <td class="size-cell">{{ convertToMB(model.size_in_kb) }}</td>
    <td class="downloads-cell">{{ model.modelVersionDownloadCount?.toLocaleString() }}</td>
    <td class="path-cell">{{ model.file_path }}</td>
    <td class="date-cell">{{ formatDate(model.publishedAt) }}</td>
  </tr>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { formatDate } from '@/utils/helpers.js';
import { DOWNLOAD_STATUS } from '@/utils/constants.js';
import { apiService } from '@/utils/api.js';

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
    },
    relatedLoraMap: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['download-model', 'selection-change', 'ignore-model'],
  setup(props, { emit }) {
    const DOWNLOAD_STATUS_REF = DOWNLOAD_STATUS;

    const isSelected = computed(() => {
      return props.selectedModels.includes(props.model.modelId);
    });

    const canSelectModel = (model) => {
      return model.fileDownloadUrl && 
             model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && 
             model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING && 
             model.isDownloaded !== DOWNLOAD_STATUS.FAILED && 
             model.isDownloaded !== DOWNLOAD_STATUS.IGNORED;
    };

    const isModelDownloading = (modelId) => {
      return props.downloadingModels.some(item => item.modelId === modelId);
    };

    const downloadModelFile = (model) => {
      emit('download-model', model);
    };

    const ignoreModelStatus = async (model) => {
      try {
        await apiService.ignoreModel(model.modelVersionId);
        emit('ignore-model', model);
      } catch (error) {
        console.error('Failed to ignore model:', error);
      }
    };

    const handleSelectionChange = (event) => {
      const modelId = props.model.modelId;
      const isChecked = event.target.checked;
      
      if (isChecked) {
        // Add to selection
        const newSelection = [...props.selectedModels, modelId];
        emit('selection-change', newSelection);
      } else {
        // Remove from selection
        const newSelection = props.selectedModels.filter(id => id !== modelId);
        emit('selection-change', newSelection);
      }
    };

    const convertToMB = (kb) => {
      if (kb === null || kb === undefined) return '-';
      const mb = kb / 1024;
      return Math.round(mb) + ' MB';
    };

    const getRelatedLoraStatus = (model) => {
      const arr = props.relatedLoraMap[model.modelId];
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
        else if (diffDay > 0) relative = `${diffDay} day${diffDay > 1 ? 's' : ''} ${diffMs > 0 ? 'newer' : 'older'}`;
        else relative = diffMs > 0 ? 'newer' : 'older';
      }
      
      return { hasRelated: true, relative };
    };

    return {
      DOWNLOAD_STATUS: DOWNLOAD_STATUS_REF,
      isSelected,
      canSelectModel,
      isModelDownloading,
      downloadModelFile,
      ignoreModelStatus,
      handleSelectionChange,
      convertToMB,
      getRelatedLoraStatus,
      formatDate
    };
  }
};
</script>

<style scoped>
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

.status-ignored {
  color: #888;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ignore-btn {
  background: #ffe5b2;
  color: #b85c00;
  border: 1px solid #ffb84d;
  border-radius: 4px;
  padding: 4px 10px;
  margin-left: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
  font-size: 0.8rem;
}

.ignore-btn:hover {
  background: #ffd699;
  color: #a04a00;
}

.no-download {
  color: #6c757d;
  font-style: italic;
}

.checkbox-cell {
  text-align: center;
  width: 60px;
}

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

.related-lora-block {
  margin-top: 8px;
  display: block;
  line-height: 1.2;
}

.related-lora-label {
  color: #b0b3b8;
  font-size: 0.92em;
  font-weight: bold;
  margin-right: 2px;
}

.related-lora-yes {
  color: #17643a;
  font-weight: bold;
  font-size: 0.92em;
}

.related-lora-no {
  color: #b91c1c;
  font-weight: bold;
  font-size: 0.92em;
}

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
}
</style> 