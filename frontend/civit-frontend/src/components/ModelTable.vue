<template>
  <div class="app-container">
    <h1>Model Database</h1>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Model ID</th>
            <th>Model Name</th>
        <!--    <th>Description</th> -->
            <th>Model Type</th>
            <th>Model NSFW</th>
            <th>Model NSFW Level</th>
            <th>Model Download Count</th>
            <th>Model Version ID</th>
            <th>Model Version Name</th>
       <!--       <th>Version Description</th> -->
            <th>Base Model</th>
            <th>Base Model Type</th>
            <th>Version NSFW Level</th>
            <th>Version Download Count</th>
            <th>File Name</th>
            <th>File Type</th>
            <th>File Download URL</th>
            <th>Size (GB)</th>
            <th>Published At</th>
         <!--    <th>Tags</th>-->
            <th>Downloaded</th>
            <th>File Path</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="model in models" :key="model.modelId">
            <td>{{ model.modelId }}</td>
            <td>{{ model.modelName }}</td>
          <!--    <td>{{ model.modelDescription }}</td>-->
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
           <!--   <td>{{ model.modelVersionDescription }}</td>-->
            <td>{{ model.basemodel }}</td>
            <td>{{ model.basemodeltype }}</td>
            <td>{{ model.modelVersionNsfwLevel }}</td>
            <td>{{ model.modelVersionDownloadCount?.toLocaleString() }}</td>
            <td>{{ model.fileName }}</td>
            <td>{{ model.fileType }}</td>
            <td>{{ model.fileDownloadUrl }}</td>
            <td>{{ model.size_in_gb }}</td>
            <td>{{ model.publishedAt }}</td>
         <!--    <td>{{ model.tags }}</td> -->
            <td>{{ model.isDownloaded }}</td>
            <td>{{ model.file_path }}</td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <button 
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >Previous</button>
        <span>Page {{ currentPage }}</span>
        <button 
          @click="changePage(currentPage + 1)"
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
      itemsPerPage: 20,
      totalItems: 0
    }
  },
  mounted() {
    this.fetchModels()
  },
  methods: {
    async fetchModels() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get(`http://localhost:3000/api/models?page=${this.currentPage}&limit=${this.itemsPerPage}`)
        this.models = response.data.data
        this.totalItems = response.data.total
        console.log('Fetched data:', response.data)
      } catch (error) {
        this.error = 'Failed to load models'
        console.error('Error fetching models:', error)
      } finally {
        this.loading = false
      }
    },
    async changePage(newPage) {
      this.currentPage = newPage
      await this.fetchModels()
    }
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #fff;
}

.app-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 20px;
  color: #000;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  background: #fff;
}

th {
  background: #f8f8f8;
  padding: 12px 15px;
  text-align: left;
  font-weight: 500;
  font-size: 14px;
  color: #000;
  border-bottom: 1px solid #ddd;
}

td {
  padding: 12px 15px;
  font-size: 14px;
  border-bottom: 1px solid #eee;
}

tr:hover {
  background-color: #f8f8f8;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-container {
    padding: 10px;
  }
  
  h1 {
    font-size: 20px;
    margin-bottom: 15px;
  }
  
  th, td {
    padding: 8px 10px;
    font-size: 13px;
  }
}

/* Loading state (optional) */
.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

/* Error state (optional) */
.error {
  color: #dc3545;
  padding: 20px;
  text-align: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

.pagination button:disabled {
  background: #f8f8f8;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background: #f8f8f8;
}
</style>