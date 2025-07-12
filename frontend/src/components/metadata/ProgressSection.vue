<template>
  <div class="progress-section">
    <div class="progress-header-section">
      <h3>{{ getProgressTitle() }}</h3>
      <button 
        v-if="(completed && !fetchingMetadata) || (cacheCompleted && !cachingImages) || (checkCompleted && !checkingCached)" 
        @click="$emit('clear-progress')" 
        class="clear-progress-btn"
      >
        Clear Progress
      </button>
    </div>
    
    <div v-if="progress.length === 0" class="progress-loading">
      <div class="loading-spinner">⏳</div>
      <p>{{ getLoadingMessage() }}</p>
    </div>
    
    <div v-else class="progress-list">
      <div 
        v-for="item in progress" 
        :key="`${item.modelId}-${item.modelVersionId}`"
        class="progress-item"
        :class="item.status"
      >
        <div class="progress-header">
          <div class="model-link-section">
            <span v-if="item.status === 'success'" class="status-icon">✅</span>
            <span v-else-if="item.status === 'cached'" class="status-icon">📖</span>
            <span v-else-if="item.status === 'notfound'" class="status-icon">🚫</span>
            <span v-else-if="item.status === 'fetching'" class="status-icon">⏳</span>
            <span v-else-if="item.status === 'error'" class="status-icon">❌</span>
            <span v-else-if="item.status === 'skipped'" class="status-icon">⏭️</span>
            <a 
              v-if="item.status === 'success' && !cachingImages"
              :href="`/model/${item.modelId}/${item.modelVersionId}`"
              target="_blank"
              class="model-link"
            >
              {{ item.modelName || 'Unknown Model' }} / {{ item.modelVersionName || 'Unknown Version' }}
            </a>
            <span v-else class="model-text">
              {{ item.modelName || 'Unknown Model' }} / {{ item.modelVersionName || 'Unknown Version' }}
            </span>
          </div>
        </div>
        <div v-if="item.status === 'error'" class="progress-message">{{ item.message }}</div>
        <div v-if="item.triggerWords" class="trigger-words">
          <strong>Trigger Words:</strong> {{ item.triggerWords }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProgressSection',
  props: {
    progress: {
      type: Array,
      default: () => []
    },
    completed: {
      type: Boolean,
      default: false
    },
    fetchingMetadata: {
      type: Boolean,
      default: false
    },
    cachingImages: {
      type: Boolean,
      default: false
    },
    cacheCompleted: {
      type: Boolean,
      default: false
    },
    checkingCached: {
      type: Boolean,
      default: false
    },
    checkCompleted: {
      type: Boolean,
      default: false
    }
  },
  emits: ['clear-progress'],
  methods: {
    getProgressTitle() {
      if (this.checkingCached || this.checkCompleted) {
        return 'Check Cached Status Progress';
      }
      if (this.cachingImages || this.cacheCompleted) {
        return 'Cache Images Progress';
      }
      return 'Processing Progress';
    },
    getLoadingMessage() {
      if (this.checkingCached) {
        return 'Starting cache status check...';
      }
      if (this.cachingImages) {
        return 'Starting image cache...';
      }
      return 'Starting metadata fetch...';
    }
  }
};
</script>

<style scoped>
.progress-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e8ed;
  margin-bottom: 1.5rem;
}

.progress-header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-header-section h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2rem;
  font-weight: 600;
}

.clear-progress-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-progress-btn:hover {
  background: #4b5563;
  transform: translateY(-1px);
}

.progress-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #64748b;
}

.progress-loading .loading-spinner {
  font-size: 2rem;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

.progress-loading p {
  margin: 0;
  font-size: 1rem;
}

.progress-list {
  max-height: 400px;
  overflow-y: auto;
}

.progress-item {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  border-left: 4px solid #e2e8f0;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.progress-item.fetching {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.progress-item.success {
  border-left-color: #10b981;
  background: #ecfdf5;
}

.progress-item.error {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.progress-item.skipped {
  border-left-color: #6b7280;
  background: #f9fafb;
}

.progress-item.cached {
  border-left-color: #8b5cf6;
  background: #f3f4f6;
}

.progress-item.notfound {
  border-left-color: #dc2626;
  background: #fef2f2;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.model-link-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.model-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.model-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.model-text {
  color: #1e293b;
  font-weight: 500;
}

.status-icon {
  font-size: 1.2rem;
}

.progress-message {
  color: #475569;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.trigger-words {
  background: #f1f5f9;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #475569;
  border-left: 3px solid #3b82f6;
}

.trigger-words strong {
  color: #1e293b;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .progress-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>