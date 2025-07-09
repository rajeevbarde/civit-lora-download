<template>
  <div v-if="selectedModels.length > 0" class="bulk-actions-section">
    <div class="bulk-header">
      <span class="bulk-icon">📦</span>
      <span class="bulk-label">Bulk Actions</span>
      <span class="bulk-count">({{ selectedModels.length }} selected)</span>
    </div>
    <div class="bulk-controls">
      <button @click="bulkDownload" class="bulk-download-btn" :disabled="isBulkDownloading">
        <span class="btn-icon">⬇️</span>
        <span class="btn-text">{{ isBulkDownloading ? 'Queuing...' : `Download ${selectedModels.length} Models` }}</span>
      </button>
      <button @click="clearSelection" class="clear-selection-btn">
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">Clear Selection</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'ModelBulkActions',
  props: {
    selectedModels: {
      type: Array,
      default: () => []
    },
    isBulkDownloading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['bulk-download', 'clear-selection'],
  setup(props, { emit }) {
    const bulkDownload = () => {
      if (props.selectedModels.length > 0) {
        emit('bulk-download', props.selectedModels);
      }
    };

    const clearSelection = () => {
      emit('clear-selection');
    };

    return {
      bulkDownload,
      clearSelection
    };
  }
}
</script>

<style scoped>
/* Enhanced Bulk Actions Section */
.bulk-actions-section {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #2196f3;
}

.bulk-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #2196f3;
}

.bulk-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #1976d2;
}

.bulk-label {
  font-weight: 600;
  color: #1976d2;
  font-size: 1.1rem;
}

.bulk-count {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #1976d2;
  background: rgba(33, 150, 243, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.bulk-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.bulk-download-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.bulk-download-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.bulk-download-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.clear-selection-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.clear-selection-btn:hover {
  background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-icon {
  font-size: 1rem;
}

.btn-text {
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 768px) {
  .bulk-controls {
    flex-direction: column;
    align-items: stretch;
  }
}
</style> 