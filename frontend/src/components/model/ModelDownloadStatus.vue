<template>
  <div v-if="downloadingModels.length > 0" class="download-status-section">
    <div class="status-header">
      <span class="status-icon">🔄</span>
      <span class="status-label">Download Status</span>
      <span class="status-count">({{ downloadingModels.length }} in progress)</span>
    </div>
    <div class="status-controls">
      <button @click="checkDownloadStatus" class="status-check-btn" :disabled="isCheckingStatus">
        <span class="btn-icon">👁️</span>
        <span class="btn-text">{{ isCheckingStatus ? 'Checking...' : (isStatusVisible ? 'Hide Status' : 'Show Status') }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'ModelDownloadStatus',
  props: {
    downloadingModels: {
      type: Array,
      default: () => []
    },
    isCheckingStatus: {
      type: Boolean,
      default: false
    },
    isStatusVisible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['check-status'],
  setup(props, { emit }) {
    const checkDownloadStatus = () => {
      emit('check-status');
    };

    return {
      checkDownloadStatus
    };
  }
}
</script>

<style scoped>
/* Enhanced Download Status Section */
.download-status-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #dee2e6;
}

.status-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #dee2e6;
}

.status-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.status-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.status-count {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.status-controls {
  display: flex;
  gap: 1rem;
}

.status-check-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-check-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.status-check-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-icon {
  font-size: 1rem;
}

.btn-text {
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 768px) {
  .status-controls {
    flex-direction: column;
    align-items: stretch;
  }
}
</style> 