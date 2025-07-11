<template>
  <div class="filters-container">
    <div class="filters-toolbar">
      
      <div class="filters-row">
        <div class="filter-item">
          <div class="filter-icon icon-bg-base">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V10C2 16 7 22 12 22C17 22 22 16 22 10V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </div>
          <select v-model="selectedBaseModel" :disabled="isFetchingBaseModels" class="filter-select" @change="onFilterChange">
            <option value="">{{ isFetchingBaseModels ? 'Loading...' : 'All Models' }}</option>
            <option v-for="bm in baseModelOptions" :key="bm" :value="bm">{{ bm }}</option>
          </select>
        </div>

        <div class="filter-item">
          <div class="filter-icon icon-bg-status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <select v-model="selectedDownloaded" class="filter-select" @change="onFilterChange">
            <option value="">All Status</option>
            <option value="0">Not Downloaded</option>
            <option value="1">Downloaded</option>
            <option value="3">Failed</option>
            <option value="4">Ignored</option>
          </select>
        </div>

        <div class="filter-item">
          <div class="filter-icon icon-bg-model">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V10C2 16 7 22 12 22C17 22 22 16 22 10V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M12 9L12 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M9 12L15 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <select v-model="selectedModelNsfw" class="filter-select" @change="onFilterChange">
            <option value="">All Content</option>
            <option value="0">SFW</option>
            <option value="1">NSFW</option>
          </select>
        </div>

        <div class="filter-item">
          <div class="filter-icon icon-bg-version">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V10C2 16 7 22 12 22C17 22 22 16 22 10V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M12 6L12 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M6 12L18 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <select v-model="selectedVersionNsfwLevelRange" class="filter-select" @change="onFilterChange">
            <option value="">All Levels</option>
            <option value="0">Safe</option>
            <option value="1-15">Mild</option>
            <option value="16-31">Moderate</option>
            <option value="32-47">NSFW</option>
            <option value="48-63">Extreme</option>
          </select>
        </div>

        <button class="clear-filters-btn" @click="resetFilters" title="Clear all filters">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Clear</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch } from 'vue';
import { apiService } from '@/utils/api.js';

export default {
  name: 'ModelFilters',
  props: {
    initialFilters: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['filter-change'],
  setup(props, { emit }) {
    const selectedBaseModel = ref('');
    const selectedDownloaded = ref('');
    const selectedModelNsfw = ref('');
    const selectedVersionNsfwLevelRange = ref('');
    const baseModelOptions = ref([]);
    const isFetchingBaseModels = ref(false);

    const fetchBaseModels = async () => {
      isFetchingBaseModels.value = true;
      try {
        const response = await apiService.getBaseModels();
        baseModelOptions.value = response.baseModels || [];
      } catch (error) {
        console.error('Failed to fetch base models:', error);
        baseModelOptions.value = [];
      } finally {
        isFetchingBaseModels.value = false;
      }
    };

    const onFilterChange = () => {
      emit('filter-change', {
        selectedBaseModel: selectedBaseModel.value,
        selectedDownloaded: selectedDownloaded.value,
        selectedModelNsfw: selectedModelNsfw.value,
        selectedVersionNsfwLevelRange: selectedVersionNsfwLevelRange.value
      });
    };

    const resetFilters = () => {
      selectedBaseModel.value = '';
      selectedDownloaded.value = '';
      selectedModelNsfw.value = '';
      selectedVersionNsfwLevelRange.value = '';
      onFilterChange();
    };

    const setFilters = (filters) => {
      if (filters.selectedBaseModel !== undefined) selectedBaseModel.value = filters.selectedBaseModel;
      if (filters.selectedDownloaded !== undefined) selectedDownloaded.value = filters.selectedDownloaded;
      if (filters.selectedModelNsfw !== undefined) selectedModelNsfw.value = filters.selectedModelNsfw;
      if (filters.selectedVersionNsfwLevelRange !== undefined) selectedVersionNsfwLevelRange.value = filters.selectedVersionNsfwLevelRange;
    };

    // Watch for initial filters prop changes
    watch(() => props.initialFilters, (newFilters) => {
      if (newFilters && Object.keys(newFilters).length > 0) {
        setFilters(newFilters);
      }
    }, { immediate: true });

    onMounted(() => {
      fetchBaseModels();
    });

    return {
      selectedBaseModel,
      selectedDownloaded,
      selectedModelNsfw,
      selectedVersionNsfwLevelRange,
      baseModelOptions,
      isFetchingBaseModels,
      onFilterChange,
      resetFilters,
      setFilters
    };
  }
};
</script>

<style scoped>
/* Modern Compact Filters Container */
.filters-container {
  margin: 1.5rem 0;
  display: flex;
  justify-content: center;
}

.filters-toolbar {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  padding: 1rem 1.5rem;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
  max-width: 950px;
  width: 100%;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: nowrap;
}

.filter-item {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0.5rem;
  transition: all 0.2s ease;
  min-width: 180px;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-item:focus-within {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 0.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
}

/* Unique icon backgrounds for each filter */
.icon-bg-base {
  background: #e0f2fe;
  color: #0284c7;
}
.icon-bg-status {
  background: #fef9c3;
  color: #ca8a04;
}
.icon-bg-model {
  background: #fce7f3;
  color: #be185d;
}
.icon-bg-version {
  background: #dcfce7;
  color: #059669;
}

.filter-select {
  border: none;
  background: transparent;
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  width: 100%;
  padding: 0.25rem 0;
}

.filter-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filter-select option {
  background: white;
  color: #374151;
  padding: 0.5rem;
}

.clear-filters-btn {
  margin-left: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%);
  border: 1px solid #38bdf8;
  border-radius: 10px;
  color: #0369a1;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.clear-filters-btn:hover {
  background: linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%);
  color: #0c4a6e;
  box-shadow: 0 2px 8px rgba(56,189,248,0.10);
}

.clear-filters-btn:active {
  background: #bae6fd;
  color: #0369a1;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .filters-toolbar {
    max-width: 100%;
    margin: 0 1rem;
  }
  
  .filters-row {
    gap: 0.75rem;
  }
  
  .filter-item {
    min-width: 160px;
  }
}

@media (max-width: 768px) {
  .filters-container {
    margin: 1rem 0;
  }
  
  .filters-toolbar {
    padding: 1rem;
    margin: 0 0.5rem;
  }
  
  .filters-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .filter-item {
    min-width: auto;
    width: 100%;
  }
  
  .clear-filters-btn {
    align-self: center;
    margin-top: 0.5rem;
  }
}

@media (max-width: 480px) {
  .filters-toolbar {
    padding: 0.75rem;
    margin: 0 0.25rem;
  }
  
  .filter-select {
    font-size: 0.8rem;
  }
}
</style> 