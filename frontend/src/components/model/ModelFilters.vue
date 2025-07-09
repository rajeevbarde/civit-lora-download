<template>
  <div class="filters-section">
    <div class="filters-header">
      <span class="filters-icon">🔍</span>
      <span class="filters-label">Filter Models</span>
    </div>
    <div class="filters-grid">
      <div class="filter-group">
        <label for="baseModelSelect" class="filter-label">Base Model</label>
        <select id="baseModelSelect" v-model="selectedBaseModel" :disabled="isFetchingBaseModels" class="filter-select" @change="onFilterChange">
          <option value="">{{ isFetchingBaseModels ? 'Loading...' : 'All Base Models' }}</option>
          <option v-for="bm in baseModelOptions" :key="bm" :value="bm">{{ bm }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="downloadedSelect" class="filter-label">Download Status</label>
        <select id="downloadedSelect" v-model="selectedDownloaded" class="filter-select" @change="onFilterChange">
          <option value="">All Status</option>
          <option value="0">Not Downloaded</option>
          <option value="1">Downloaded</option>
          <option value="3">Failed</option>
          <option value="4">Ignored</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="modelNsfwSelect" class="filter-label">Model Content</label>
        <select id="modelNsfwSelect" v-model="selectedModelNsfw" class="filter-select" @change="onFilterChange">
          <option value="">All Content</option>
          <option value="0">SFW</option>
          <option value="1">NSFW</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="versionNsfwLevelSelect" class="filter-label">Version Content</label>
        <select id="versionNsfwLevelSelect" v-model="selectedVersionNsfwLevelRange" class="filter-select" @change="onFilterChange">
          <option value="">All Levels</option>
          <option value="0">Safe</option>
          <option value="1-15">Mild</option>
          <option value="16-31">Moderate</option>
          <option value="32-47">NSFW</option>
          <option value="48-63">Extreme NSFW</option>
        </select>
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
/* Enhanced Filters Section */
.filters-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.filters-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.filters-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.filters-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background: white;
  font-size: 1rem;
  color: #495057;
  transition: all 0.3s ease;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select:hover {
  border-color: #adb5bd;
}

.filter-select:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Responsive Design */
@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style> 