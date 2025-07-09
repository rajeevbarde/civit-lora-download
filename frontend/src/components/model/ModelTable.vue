<template>
  <div class="table-section">
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
            <ModelTableRow
              v-for="model in models"
              :key="model.modelId"
              :model="model"
              :selected-models="selectedModels"
              :downloading-models="downloadingModels"
              :related-lora-map="relatedLoraMap"
              @download-model="handleDownloadModel"
              @selection-change="handleSelectionChange"
              @ignore-model="handleIgnoreModel"
            />
          </tbody>
        </table>
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
import { ref, computed, watch } from 'vue';
import { DOWNLOAD_STATUS } from '@/utils/constants.js';
import ModelTableRow from './ModelTableRow.vue';
import ModelPagination from './ModelPagination.vue';

export default {
  name: 'ModelTable',
  components: {
    ModelTableRow,
    ModelPagination
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

    const toggleSelectAll = () => {
      const selectableModels = props.models.filter(model => canSelectModel(model));
      if (isAllSelected.value) {
        emit('select-all', []);
      } else {
        emit('select-all', selectableModels.map(model => model.modelId));
      }
    };

    const handleDownloadModel = (model) => {
      emit('download-model', model);
    };

    const handleSelectionChange = (newSelection) => {
      emit('selection-change', newSelection);
    };

    const handleIgnoreModel = (model) => {
      emit('ignore-model', model);
    };

    const handlePageChange = (newPage) => {
      emit('page-change', newPage);
    };

    return {
      DOWNLOAD_STATUS: DOWNLOAD_STATUS_REF,
      isAllSelected,
      isIndeterminate,
      canSelectModel,
      toggleSelectAll,
      handleDownloadModel,
      handleSelectionChange,
      handleIgnoreModel,
      handlePageChange
    };
  }
}
</script>

<style scoped>
/* Enhanced Table Section */
.table-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
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

.checkbox-select-all {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
}

/* Responsive Design */
@media (max-width: 768px) {
  .table-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
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
  .date-header {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
  }
}
</style> 