<template>
  <div class="filters">
    <div class="filter-group">
      <label for="baseModelSelect">Base Model:</label>
      <select id="baseModelSelect" v-model="selectedBaseModel" @change="onFilterChange">
        <option value="">All</option>
        <option v-for="bm in baseModelOptions" :key="bm" :value="bm">{{ bm }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="downloadedSelect">Downloaded:</label>
      <select id="downloadedSelect" v-model="selectedDownloaded" @change="onFilterChange">
        <option value="">All</option>
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';

export default {
  name: 'ModelFilters',
  data() {
    return {
      selectedBaseModel: '',
      selectedDownloaded: '',
      baseModelOptions: [],
    };
  },
  mounted() {
    this.fetchBaseModels();
  },
  methods: {
    async fetchBaseModels() {
      try {
        const response = await apiService.getBaseModels();
        this.baseModelOptions = response.baseModels || [];
      } catch (error) {
        console.error('Failed to fetch base models:', error);
        this.baseModelOptions = [];
      }
    },
    
    onFilterChange() {
      this.$emit('filter-change', {
        baseModel: this.selectedBaseModel,
        downloaded: this.selectedDownloaded
      });
    },
    
    // Public method to reset filters
    resetFilters() {
      this.selectedBaseModel = '';
      this.selectedDownloaded = '';
      this.onFilterChange();
    }
  }
};
</script>

<style scoped>
.filters {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  min-width: 150px;
}

.filter-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
</style> 