<template>
  <div class="action-section">
    <div class="button-group">
      <button 
        @click="$emit('fetch-metadata')" 
        :disabled="fetchingMetadata || cachingImages"
        class="fetch-metadata-btn"
      >
        <span v-if="fetchingMetadata" class="btn-spinner">⏳</span>
        <span v-else class="btn-icon">🔄</span>
        {{ fetchingMetadata ? 'Fetching Metadata...' : 'Fetch Metadata' }}
      </button>
      
      <button 
        v-if="showCacheButton"
        @click="$emit('cache-images')" 
        :disabled="fetchingMetadata || cachingImages"
        class="cache-images-btn"
      >
        <span v-if="cachingImages" class="btn-spinner">⏳</span>
        <span v-else class="btn-icon">🖼️</span>
        {{ cachingImages ? 'Caching Images...' : 'Cache Images' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActionSection',
  props: {
    fetchingMetadata: {
      type: Boolean,
      default: false
    },
    cachingImages: {
      type: Boolean,
      default: false
    }
  },
  emits: ['fetch-metadata', 'cache-images'],
  computed: {
    showCacheButton() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('dungeon') === 'true';
    }
  }
};
</script>

<style scoped>
.action-section {
  display: flex;
  justify-content: center;
  margin: 2rem 0;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e8ed;
}

.button-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.fetch-metadata-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.fetch-metadata-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.fetch-metadata-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.cache-images-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.cache-images-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.cache-images-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon, .btn-spinner {
  font-size: 1.1rem;
}

.btn-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 