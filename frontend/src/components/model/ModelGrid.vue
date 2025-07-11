<template>
  <div class="grid-section">
    <div class="grid-container">
             <!-- Select All Checkbox, Legend, and Pagination -->
       <div class="select-all-container">
         <div class="left-section">
           <label class="select-all-label">
             <input type="checkbox"
                    :checked="isAllSelected"
                    :indeterminate.prop="isIndeterminate"
                    @change="toggleSelectAll"
                    class="checkbox-select-all" />
             <span class="select-all-text">Select All</span>
           </label>
           <div class="legend-separator">|</div>
           <div class="legend-text">* Related LoRA</div>
         </div>
         
         <div class="right-section">
           <div class="simple-pagination">
             <button 
               @click="handlePageChange(currentPage - 1)"
               :disabled="currentPage <= 1 || isChangingPage"
               class="simple-page-btn"
               :class="{ 'disabled': currentPage <= 1 || isChangingPage }">
               ←
             </button>
             <span class="simple-page-info">Page <span class="page-number">{{ currentPage }}</span></span>
             <button 
               @click="handlePageChange(currentPage + 1)"
               :disabled="isChangingPage"
               class="simple-page-btn"
               :class="{ 'disabled': isChangingPage }">
               →
             </button>
           </div>
         </div>
       </div>

      <!-- Grid Layout -->
      <div class="models-grid">
        <div
          v-for="model in models"
          :key="model.modelId"
          class="model-card"
          :class="{ 'selected': isModelSelected(model.modelId) }"
        >
                     <!-- Image Thumbnail -->
           <div class="model-thumbnail">
             <!-- Individual Checkbox - Top Left -->
             <div class="card-checkbox">
               <input type="checkbox"
                      :value="model.modelId"
                      :checked="isModelSelected(model.modelId)"
                      @change="handleSelectionChange"
                      :disabled="!canSelectModel(model)"
                      class="checkbox-model" />
             </div>
             <!-- Base Model Value - Below Checkbox -->
             <div class="base-model-value">
               <div class="base-model-text">{{ model.basemodel }}</div>
               <div v-if="model.basemodeltype" class="base-model-type">{{ model.basemodeltype }}</div>
               <div class="variants-indicator">
                 <span v-if="getRelatedLoraStatus(model).hasRelated" class="variants-yes">Yes</span>
                 <span v-else class="variants-no">No</span>
                 <span class="variants-text">*</span>
               </div>
             </div>
             <!-- Image Slider -->
             <div class="thumbnail-container">
               <ImageSlider 
                 :model-id="model.modelId"
                 :model-version-id="model.modelVersionId"
                 size="small"
                 :disable-preview="true"
                 @error="handleImageError"
               />
             </div>
           </div>

          <!-- Model Information -->
          <div class="model-info">
            <!-- Model Name and Version -->
            <div class="model-header">
              <a 
                :href="`/model/${model.modelId}/${model.modelVersionId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="model-link"
              >
                <h3 class="model-name">{{ model.modelName }}</h3>
                <div class="version-line">
                  <div class="version-badge">{{ model.modelVersionName }}</div>
                  <div class="file-size-badge">
                    <span class="size-icon">💾</span>
                    <span class="size-text">{{ convertToMB(model.size_in_kb) }}</span>
                  </div>
                  <div class="download-count-badge">
                    <span class="download-icon">⬇️</span>
                    <span class="download-text">{{ model.modelVersionDownloadCount?.toLocaleString() }}</span>
                  </div>
                </div>
              </a>
            </div>

            <!-- Download Actions -->
            <div class="model-actions">
              
              <button 
                v-if="model.fileDownloadUrl && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING && model.isDownloaded !== DOWNLOAD_STATUS.FAILED && model.isDownloaded !== DOWNLOAD_STATUS.IGNORED" 
                @click="downloadModelFile(model)" 
                class="action-btn download-btn"
                :disabled="isModelDownloading(model.modelId)"
                :class="{ 'loading': isModelDownloading(model.modelId) }">
                <span class="btn-icon">⬇️</span>
                <span class="btn-text">{{ isModelDownloading(model.modelId) ? 'Downloading...' : 'Download' }}</span>
              </button>
              
              <button 
                v-if="model.fileDownloadUrl && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING && model.isDownloaded !== DOWNLOAD_STATUS.FAILED && model.isDownloaded !== DOWNLOAD_STATUS.IGNORED"
                @click="ignoreModelStatus(model)"
                class="action-btn ignore-btn">
                <span class="btn-icon">🚫</span>
                <span class="btn-text">Ignore</span>
              </button>
              
              <button 
                v-else-if="model.fileDownloadUrl && model.isDownloaded === DOWNLOAD_STATUS.FAILED" 
                @click="downloadModelFile(model)" 
                class="action-btn retry-btn"
                :disabled="isModelDownloading(model.modelId)"
                :class="{ 'loading': isModelDownloading(model.modelId) }">
                <span class="btn-icon">🔄</span>
                <span class="btn-text">{{ isModelDownloading(model.modelId) ? 'Retrying...' : 'Retry' }}</span>
              </button>
              
              <span 
                v-else-if="model.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED" 
                class="status-badge downloaded">
                <span class="status-icon">✅</span>
                <span class="status-text">Downloaded</span>
              </span>
              
              <span 
                v-else-if="model.isDownloaded === DOWNLOAD_STATUS.IGNORED" 
                class="status-badge ignored">
                <span class="status-icon">🚫</span>
                <span class="status-text">Ignored</span>
              </span>
              
              <span v-else class="status-badge no-download">-</span>
            </div>
            
            <!-- Additional Details Below Buttons -->
            <div class="additional-details">
              <!-- Published Date -->
              <div class="detail-item">
                <span class="detail-label">Published:</span>
                <span class="detail-value">{{ formatDate(model.publishedAt) }}</span>
              </div>
              
              <!-- File Name -->
              <div class="detail-item">
                <span class="detail-label">File:</span>
                <span class="detail-value filename">{{ model.fileName }}</span>
              </div>
              
              <!-- File Path -->
              <div class="detail-item">
                <span class="detail-label">Path:</span>
                <span class="detail-value filepath">{{ model.file_path }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Enhanced Pagination -->
      <ModelPagination
        :current-page="currentPage"
        :is-changing-page="isChangingPage"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { formatDate } from '@/utils/helpers.js';
import { DOWNLOAD_STATUS } from '@/utils/constants.js';
import { apiService } from '@/utils/api.js';
import ModelPagination from './ModelPagination.vue';
import { ImageSlider } from '@/components/common';

export default {
  name: 'ModelGrid',
  components: {
    ModelPagination,
    ImageSlider
  },
  props: {
    models: {
      type: Array,
      default: () => []
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
    },
    currentPage: {
      type: Number,
      default: 1
    },
    isChangingPage: {
      type: Boolean,
      default: false
    }
  },
  emits: ['download-model', 'selection-change', 'ignore-model', 'page-change', 'select-all'],
  setup(props, { emit }) {
    const DOWNLOAD_STATUS_REF = DOWNLOAD_STATUS;

    const isAllSelected = computed(() => {
      const selectableModels = props.models.filter(model => canSelectModel(model));
      return selectableModels.length > 0 && props.selectedModels.length === selectableModels.length;
    });

    const isIndeterminate = computed(() => {
      const selectableModels = props.models.filter(model => canSelectModel(model));
      return props.selectedModels.length > 0 && props.selectedModels.length < selectableModels.length;
    });

    const canSelectModel = (model) => {
      return model.fileDownloadUrl && 
             model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && 
             model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING && 
             model.isDownloaded !== DOWNLOAD_STATUS.FAILED && 
             model.isDownloaded !== DOWNLOAD_STATUS.IGNORED;
    };

    const isModelSelected = (modelId) => {
      // Convert both to strings to ensure consistent comparison
      const modelIdStr = String(modelId);
      return props.selectedModels.some(id => String(id) === modelIdStr);
    };

    const isModelDownloading = (modelId) => {
      return props.downloadingModels.some(item => item.modelId === modelId);
    };

    const toggleSelectAll = () => {
      const selectableModels = props.models.filter(model => canSelectModel(model));
      if (isAllSelected.value) {
        emit('select-all', []);
      } else {
        emit('select-all', selectableModels.map(model => model.modelId));
      }
    };

    const handleSelectionChange = (event) => {
      const modelId = event.target.value;
      const isChecked = event.target.checked;
      
      if (isChecked) {
        const newSelection = [...props.selectedModels, modelId];
        emit('selection-change', newSelection);
      } else {
        // Convert both to strings for consistent comparison
        const modelIdStr = String(modelId);
        const newSelection = props.selectedModels.filter(id => String(id) !== modelIdStr);
        emit('selection-change', newSelection);
      }
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

    const handlePageChange = (newPage) => {
      emit('page-change', newPage);
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

    const handleImageError = (error) => {
      // Handle image loading errors silently or log them
      console.warn('Image loading error:', error);
    };

    return {
      DOWNLOAD_STATUS: DOWNLOAD_STATUS_REF,
      isAllSelected,
      isIndeterminate,
      canSelectModel,
      isModelSelected,
      isModelDownloading,
      toggleSelectAll,
      handleSelectionChange,
      downloadModelFile,
      ignoreModelStatus,
      handlePageChange,
      convertToMB,
      getRelatedLoraStatus,
      formatDate,
      handleImageError
    };
  }
};
</script>

<style scoped>
/* Grid Section */
.grid-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.grid-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

/* Select All Container */
.select-all-container {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.right-section {
  display: flex;
  align-items: center;
}

/* Simple Pagination */
.simple-pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.simple-page-btn {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  font-size: 1rem;
  color: #1976d2;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  transition: all 0.2s;
  font-weight: 600;
}

.simple-page-btn:hover:not(.disabled) {
  background-color: #bbdefb;
  border-color: #64b5f6;
  color: #1565c0;
}

.simple-page-btn.disabled {
  color: #bdbdbd;
  background-color: #f5f5f5;
  border-color: #e0e0e0;
  cursor: not-allowed;
}

.simple-page-info {
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
  min-width: 3rem;
  text-align: center;
}

.page-number {
  color: #1976d2;
  font-weight: 700;
  background: #e3f2fd;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  border: 1px solid #90caf9;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  color: #495057;
}

.legend-separator {
  color: #adb5bd;
  font-weight: 300;
  font-size: 1.2rem;
}

.legend-text {
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

.checkbox-select-all {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #667eea;
  border: 2px solid #667eea;
  border-radius: 4px;
  background: white;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  position: relative;
}

.checkbox-select-all:checked {
  background: #667eea;
  border-color: #667eea;
}

.checkbox-select-all:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.select-all-text {
  font-size: 1rem;
}

/* Models Grid */
.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

/* Model Card */
.model-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  overflow: hidden;
}

.model-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.model-card.selected {
  border-color: #667eea;
  border-width: 3px;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15), 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* Thumbnail */
.model-thumbnail {
  position: relative;
  width: 100%;
  height: 200px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 0.25rem;
  padding-left: 0;
}

.thumbnail-container {
  width: 120px;
  height: 200px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

/* Card Checkbox - Top Right */
.card-checkbox {
  position: absolute;
  top: 8px;
  right: 4px;
  z-index: 10;
}

/* Base Model Value - Below Checkbox */
.base-model-value {
  position: absolute;
  top: 35px;
  right: 4px;
  z-index: 10;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  text-align: right;
}

.base-model-text {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.2;
}

.base-model-type {
  font-size: 0.6rem;
  opacity: 0.9;
  line-height: 1.1;
}

.variants-indicator {
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.variants-yes {
  font-size: 0.6rem;
  font-weight: 600;
  color: #4caf50;
}

.variants-no {
  font-size: 0.6rem;
  font-weight: 600;
  color: #f44336;
}

.variants-text {
  font-size: 0.5rem;
  color: #ffc107;
}

/* Ensure ImageSlider fits the thumbnail size */
.thumbnail-container :deep(.image-slider) {
  width: 120px !important;
  height: 200px !important;
}

.thumbnail-container :deep(.model-image-placeholder) {
  width: 120px !important;
  height: 200px !important;
}

.thumbnail-container :deep(.slider-image) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

.thumbnail-container :deep(.slider-arrow) {
  width: 24px !important;
  height: 24px !important;
  font-size: 0.9rem !important;
}

.thumbnail-container :deep(.image-counter) {
  font-size: 0.6rem !important;
  padding: 1px 6px !important;
}

/* Base Model Value - Below Checkbox */
.base-model-value {
  position: absolute;
  top: 40px;
  right: 4px;
  z-index: 10;
  text-align: right;
}

.base-model-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.base-model-value .base-model-type {
  font-size: 0.75rem;
  color: #6c757d;
  font-style: italic;
  line-height: 1.2;
  margin-top: 2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.variants-indicator {
  margin-top: 3px;
  line-height: 1.2;
}

.variants-text {
  font-size: 0.7rem;
  color: #6c757d;
  margin-right: 2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.variants-yes {
  font-size: 0.84rem;
  color: #17643a;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.variants-no {
  font-size: 0.84rem;
  color: #b91c1c;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.thumbnail-placeholder {
  width: 120px;
  height: 180px;
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
  border: 2px dashed #adb5bd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: #6c757d;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Model Info */
.model-info {
  padding: 0.75rem;
}

.model-header {
  margin-bottom: 1rem;
}

.model-link {
  text-decoration: none;
  color: inherit;
}

.model-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
  background: linear-gradient(135deg, #495057 0%, #6c757d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.version-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.version-badge {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #495057;
  padding: 0.3rem 0.8rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #dee2e6;
  display: inline-block;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* Model Details */
.model-detail {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.detail-label {
  font-weight: 600;
  color: #495057;
  min-width: 80px;
  flex-shrink: 0;
}

.detail-value {
  color: #6c757d;
  word-break: break-word;
}

.detail-value.filename {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

.detail-value.filepath {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

.base-model-type {
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

.related-yes {
  color: #17643a;
  font-weight: 600;
}

.related-no {
  color: #b91c1c;
  font-weight: 600;
}

/* Checkbox Styling */
.checkbox-model {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #667eea;
  border: 2px solid #667eea;
  border-radius: 4px;
  background: white;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  position: relative;
}

.checkbox-model:checked {
  background: #667eea;
  border-color: #667eea;
}

.checkbox-model:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.checkbox-model:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  border-color: #ccc;
}

/* Actions */
.model-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Additional Details Below Buttons */
.additional-details {
  margin-top: 0.25rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.75rem;
  line-height: 1.3;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item .detail-label {
  font-weight: 500;
  color: #6c757d;
  min-width: 60px;
  flex-shrink: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item .detail-value {
  color: #495057;
  word-break: break-word;
  font-size: 0.75rem;
}

.detail-item .detail-value.filename {
  font-family: 'Courier New', monospace;
  font-size: 0.7rem;
  color: #495057;
}

.detail-item .detail-value.filepath {
  font-family: 'Courier New', monospace;
  font-size: 0.7rem;
  color: #6c757d;
}

/* Action Info - File Size and Download Count (moved to version line) */

.file-size-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  border: 1px solid #dee2e6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.size-icon {
  font-size: 0.9rem;
}

.size-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.download-count-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  border: 1px solid #dee2e6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.download-icon {
  font-size: 0.9rem;
}

.download-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
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

.ignore-btn {
  background: #ffe5b2;
  color: #b85c00;
  border: 1px solid #ffb84d;
}

.ignore-btn:hover {
  background: #ffd699;
  color: #a04a00;
}

/* Status Badges */
.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
}

.status-badge.downloaded {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-badge.ignored {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #e9ecef;
}

.status-badge.no-download {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #e9ecef;
  font-style: italic;
}

.status-icon {
  font-size: 1rem;
}

.status-text {
  font-size: 0.9rem;
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

.action-btn.loading {
  position: relative;
  color: transparent;
}

.action-btn.loading::after {
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
  .grid-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .grid-container {
    padding: 1rem;
  }
  
  .models-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .model-info {
    padding: 1rem;
  }
  
  .model-name {
    font-size: 1rem;
  }
  
  .detail-label {
    min-width: 70px;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .models-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}
</style> 