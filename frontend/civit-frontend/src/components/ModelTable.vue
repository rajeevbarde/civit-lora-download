<template>
  <div class="app-container">
    <h1>Model Database</h1>
    <!-- Filter Controls -->
    <div class="filters">
      <div class="filter-group">
        <label for="baseModelSelect">Base Model:</label>
        <select id="baseModelSelect" v-model="selectedBaseModel">
          <option value="">All</option>
          <option v-for="bm in baseModelOptions" :key="bm" :value="bm">{{ bm }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="downloadedSelect">Downloaded:</label>
        <select id="downloadedSelect" v-model="selectedDownloaded">
          <option value="">All</option>
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>
    </div>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Model ID</th>
            <th>Model Name</th>
            <th>Model Type</th>
            <th>Model NSFW</th>
            <th>Model NSFW Level</th>
            <th>Model Download Count</th>
            <th>Model Version ID</th>
            <th>Model Version Name</th>
            <th>Base Model</th>
            <th>Base Model Type</th>
            <th>Version NSFW Level</th>
            <th>Version Download Count</th>
            <th>File Name</th>
            <th>File Type</th>
            <th>File Download URL</th>
            <th>Size (GB)</th>
            <th>Published At</th>
            <th>Downloaded</th>
            <th>File Path</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="model in models" :key="model.modelId">
            <td>{{ model.modelId }}</td>
            <td>{{ model.modelName }}</td>
            <td>{{ model.modelType }}</td>
            <td>{{ model.modelNsfw }}</td>
            <td>{{ model.modelNsfwLevel }}</td>
            <td>{{ model.modelDownloadCount?.toLocaleString() }}</td>
            <td>
              <a 
                :href="`http://localhost:5173/model/${model.modelVersionId}`" 
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ model.modelVersionId }}
              </a>
            </td>
            <td>{{ model.modelVersionName }}</td>
            <td>{{ model.basemodel }}</td>
            <td>{{ model.basemodeltype }}</td>
            <td>{{ model.modelVersionNsfwLevel }}</td>
            <td>{{ model.modelVersionDownloadCount?.toLocaleString() }}</td>
            <td>{{ model.fileName }}</td>
            <td>{{ model.fileType }}</td>
            <td>
              <button v-if="model.fileDownloadUrl && model.isDownloaded !== 1 && model.isDownloaded !== 2 && model.isDownloaded !== 3" 
                      @click="downloadModelFile(model)" 
                      class="btn-download"
                      :disabled="downloadingModels.includes(model.modelId)"
                      :class="{ 'loading': downloadingModels.includes(model.modelId) }">
                {{ downloadingModels.includes(model.modelId) ? 'Downloading...' : 'Download' }}
              </button>
              <button v-else-if="model.fileDownloadUrl && model.isDownloaded === 3" 
                      @click="downloadModelFile(model)" 
                      class="btn-retry"
                      :disabled="downloadingModels.includes(model.modelId)"
                      :class="{ 'loading': downloadingModels.includes(model.modelId) }">
                {{ downloadingModels.includes(model.modelId) ? 'Retrying...' : 'Retry' }}
              </button>
              <span v-else-if="model.isDownloaded === 1 || model.isDownloaded === 2" class="status-downloaded">Downloaded</span>
              <span v-else>-</span>
            </td>
            <td>{{ model.size_in_gb }}</td>
            <td>{{ model.publishedAt }}</td>
            <td>{{ model.isDownloaded }}</td>
            <td>{{ model.file_path }}</td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <button 
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
          class="btn-pagination"
        >Previous</button>
        <span class="page-info">Page {{ currentPage }}</span>
        <button 
          @click="changePage(currentPage + 1)"
          class="btn-pagination"
        >Next</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      models: [],
      loading: false,
      error: null,
      currentPage: 1,
      itemsPerPage: 50,
      totalItems: 0,
      selectedBaseModel: '',
      selectedDownloaded: '',
      baseModelOptions: [],
      downloadingModels: [], // Track which models are currently downloading
    }
  },
  watch: {
    selectedBaseModel() {
      this.currentPage = 1;
      this.fetchModels();
    },
    selectedDownloaded() {
      this.currentPage = 1;
      this.fetchModels();
    }
  },
  mounted() {
    this.fetchBaseModels();
    this.fetchModels();
  },
  methods: {
    async fetchBaseModels() {
      try {
        const response = await axios.get('http://localhost:3000/api/basemodels');
        this.baseModelOptions = response.data.baseModels || [];
      } catch (error) {
        this.baseModelOptions = [];
      }
    },
    async fetchModels() {
      this.loading = true
      this.error = null
      try {
        const params = {
          page: this.currentPage,
          limit: this.itemsPerPage,
        };
        if (this.selectedBaseModel) params.basemodel = this.selectedBaseModel;
        if (this.selectedDownloaded !== '') params.isDownloaded = this.selectedDownloaded;
        const response = await axios.get('http://localhost:3000/api/models', { params });
        this.models = response.data.data
        this.totalItems = response.data.total
      } catch (error) {
        this.error = 'Failed to load models'
      } finally {
        this.loading = false
      }
    },
    async changePage(newPage) {
      this.currentPage = newPage
      await this.fetchModels()
    },
    async downloadModelFile(model) {
      try {
        // Add model to downloading list
        this.downloadingModels.push(model.modelId);
        
        const response = await axios.post('http://localhost:3000/api/download-model-file', {
          url: model.fileDownloadUrl,
          fileName: model.fileName,
          baseModel: model.basemodel,
          modelVersionId: model.modelVersionId
        });
        if (response.data && response.data.success) {
          this.fetchModels(); // Refresh table
        } else {
          alert(response.data.error || 'Download failed.');
          this.fetchModels(); // Refresh table even on failure
        }
      } catch (err) {
        alert('Download failed: ' + (err.response?.data?.error || err.message));
        this.fetchModels(); // Refresh table even on error
      } finally {
        // Remove model from downloading list
        const index = this.downloadingModels.indexOf(model.modelId);
        if (index > -1) {
          this.downloadingModels.splice(index, 1);
        }
      }
    },
  }
}
</script>


<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  color: #2c3e50;
  background: #f8fafc;
}

.app-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 24px;
}

h1 {
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 32px;
  color: #1a202c;
  letter-spacing: -0.5px;
}

.filters {
  margin-bottom: 24px;
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #2d3748;
  transition: border-color 0.2s ease;
}

.filter-group select:focus {
  outline: none;
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}

.table-wrapper {
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th {
  background: #f7fafc;
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: #4a5568;
  border-bottom: 1px solid #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

td {
  padding: 12px;
  font-size: 14px;
  color: #2d3748;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

tr:hover {
  background-color: #f8fafc;
}

tr:last-child td {
  border-bottom: none;
}

a {
  color: #3182ce;
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: #2c5282;
  text-decoration: underline;
}

.btn-download, .btn-retry {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-width: 80px;
}

.btn-download {
  background: #48bb78;
  color: white;
}

.btn-download:hover:not(:disabled) {
  background: #38a169;
}

.btn-retry {
  background: #ed8936;
  color: white;
}

.btn-retry:hover:not(:disabled) {
  background: #dd6b20;
}

.btn-download:disabled, .btn-retry:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-download.loading, .btn-retry.loading {
  background: #a0aec0;
  cursor: not-allowed;
}

.btn-download.loading::after, .btn-retry.loading::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

@keyframes spin {
  0% { transform: translateY(-50%) rotate(0deg); }
  100% { transform: translateY(-50%) rotate(360deg); }
}

.status-downloaded {
  color: #48bb78;
  font-weight: 500;
  font-size: 12px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #718096;
  font-size: 16px;
}

.error {
  color: #e53e3e;
  padding: 24px;
  text-align: center;
  background: #fed7d7;
  border-radius: 6px;
  margin-bottom: 24px;
}

.pagination {
  margin-top: 24px;
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: #f7fafc;
  border-top: 1px solid #e2e8f0;
}

.btn-pagination {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #4a5568;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-pagination:hover:not(:disabled) {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.btn-pagination:disabled {
  background: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-container {
    padding: 16px;
  }
  
  h1 {
    font-size: 24px;
    margin-bottom: 24px;
  }
  
  .filters {
    gap: 16px;
  }
  
  th, td {
    padding: 10px 8px;
    font-size: 13px;
  }
  
  .pagination {
    padding: 16px;
    gap: 12px;
  }
}
</style>