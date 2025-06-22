<template>
  <div class="model-table-page">
    <h1>Model Database</h1>
    
    <!-- Notifications -->
    <div v-if="notifications.length > 0" class="notifications-container">
      <div v-for="notification in notifications" :key="notification.id" 
           :class="['notification', `notification-${notification.type}`]">
        <span class="notification-message">{{ notification.message }}</span>
        <button @click="removeNotification(notification.id)" class="notification-close">×</button>
      </div>
      <button @click="clearAllNotifications" class="clear-all-notifications">Clear All</button>
    </div>
    
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
    
    <!-- Bulk Download Controls -->
    <div v-if="selectedModels.length > 0" class="bulk-actions">
      <div class="bulk-info">
        <span>{{ selectedModels.length }} model(s) selected</span>
        <button @click="downloadSelectedModels" class="btn-bulk-download" :disabled="isBulkDownloading">
          {{ isBulkDownloading ? 'Queuing...' : `Download ${selectedModels.length} Models` }}
        </button>
        <button @click="clearSelection" class="btn-clear-selection">Clear Selection</button>
      </div>
    </div>
    
    <!-- Download Status Indicator -->
    <div v-if="downloadingModels.length > 0" class="download-status">
      <div class="status-info">
        <span>🔄 {{ downloadingModels.length }} download(s) in progress</span>
        <button @click="checkDownloadStatus" class="btn-status-check">
          {{ isStatusVisible ? 'Hide Status' : 'Show Status' }}
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="table-container">
      <div class="table-wrapper">
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
              <th class="checkbox-header">
                <input 
                  type="checkbox" 
                  :checked="isAllSelected" 
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                  class="checkbox-select-all"
                >
              </th>
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
                        :disabled="isModelDownloading(model.modelId)"
                        :class="{ 'loading': isModelDownloading(model.modelId) }">
                  {{ isModelDownloading(model.modelId) ? 'Downloading...' : 'Download' }}
                </button>
                <button v-else-if="model.fileDownloadUrl && model.isDownloaded === 3" 
                        @click="downloadModelFile(model)" 
                        class="btn-retry"
                        :disabled="isModelDownloading(model.modelId)"
                        :class="{ 'loading': isModelDownloading(model.modelId) }">
                  {{ isModelDownloading(model.modelId) ? 'Retrying...' : 'Retry' }}
                </button>
                <span v-else-if="model.isDownloaded === 1 || model.isDownloaded === 2" class="status-downloaded">Downloaded</span>
                <span v-else>-</span>
              </td>
              <td class="checkbox-cell">
                <input 
                  type="checkbox" 
                  :value="model.modelId"
                  v-model="selectedModels"
                  :disabled="!canSelectModel(model)"
                  class="checkbox-model"
                >
              </td>
              <td>{{ model.size_in_gb }}</td>
              <td>{{ formatDate(model.publishedAt) }}</td>
              <td>{{ model.isDownloaded }}</td>
              <td>{{ model.file_path }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
      selectedModels: [], // Track selected models for bulk download
      isBulkDownloading: false, // Track bulk download state
      notifications: [], // Track notifications for download status
      isStatusVisible: false, // Track if status is currently shown
    }
  },
  computed: {
    isAllSelected() {
      const selectableModels = this.models.filter(model => this.canSelectModel(model));
      return selectableModels.length > 0 && this.selectedModels.length === selectableModels.length;
    },
    isIndeterminate() {
      const selectableModels = this.models.filter(model => this.canSelectModel(model));
      return this.selectedModels.length > 0 && this.selectedModels.length < selectableModels.length;
    }
  },
  watch: {
    selectedBaseModel() {
      this.currentPage = 1;
      this.selectedModels = []; // Clear selection when filters change
      this.fetchModels();
    },
    selectedDownloaded() {
      this.currentPage = 1;
      this.selectedModels = []; // Clear selection when filters change
      this.fetchModels();
    }
  },
  mounted() {
    this.fetchBaseModels();
    this.fetchModels();
    
    // Start periodic cleanup to check for stuck downloads
    this.startPeriodicCleanup();
  },
  beforeDestroy() {
    // Clean up intervals when component is destroyed
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  },
  methods: {
    canSelectModel(model) {
      // Only allow selection of models that can be downloaded
      return model.fileDownloadUrl && 
             model.isDownloaded !== 1 && 
             model.isDownloaded !== 2;
    },
    toggleSelectAll() {
      const selectableModels = this.models.filter(model => this.canSelectModel(model));
      if (this.isAllSelected) {
        this.selectedModels = [];
      } else {
        this.selectedModels = selectableModels.map(model => model.modelId);
      }
    },
    clearSelection() {
      this.selectedModels = [];
    },
    async downloadSelectedModels() {
      if (this.selectedModels.length === 0) return;
      
      this.isBulkDownloading = true;
      const selectedModelObjects = this.models.filter(model => 
        this.selectedModels.includes(model.modelId)
      );
      
      try {
        // Queue all downloads in parallel
        const downloadPromises = selectedModelObjects.map(async model => {
          if (this.isModelDownloading(model.modelId)) return;
          
          this.downloadingModels.push({
            modelId: model.modelId,
            modelVersionId: model.modelVersionId,
            fileName: model.fileName
          });
          
          try {
            const response = await axios.post('http://localhost:3000/api/download-model-file', {
              url: model.fileDownloadUrl,
              fileName: model.fileName,
              baseModel: model.basemodel,
              modelVersionId: model.modelVersionId
            });
            
            if (response.data && response.data.success) {
              console.log(`Download queued for: ${model.fileName}`);
              // Start polling for this model
              this.startStatusPolling(model.modelVersionId, model.fileName);
            } else {
              console.error(`Failed to queue download for: ${model.fileName}`, response.data.error);
              this.removeFromDownloadingList(model.modelId);
            }
          } catch (err) {
            console.error(`Download failed for: ${model.fileName}`, err.message);
            this.removeFromDownloadingList(model.modelId);
          }
        });
        
        // Wait for all download requests to be queued
        await Promise.all(downloadPromises);
        
        // Clear selection after queuing all downloads
        this.selectedModels = [];
        
      } catch (error) {
        console.error('Bulk download error:', error);
      } finally {
        this.isBulkDownloading = false;
      }
    },
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
      this.selectedModels = []; // Clear selection when changing pages
      await this.fetchModels()
    },
    async downloadModelFile(model) {
      try {
        // Add model to downloading list with modelVersionId for proper tracking
        this.downloadingModels.push({
          modelId: model.modelId,
          modelVersionId: model.modelVersionId,
          fileName: model.fileName
        });
        
        const response = await axios.post('http://localhost:3000/api/download-model-file', {
          url: model.fileDownloadUrl,
          fileName: model.fileName,
          baseModel: model.basemodel,
          modelVersionId: model.modelVersionId
        });
        
        if (response.data && response.data.success) {
          console.log(`Download queued for: ${model.fileName}`);
          // Start polling for status updates
          this.startStatusPolling(model.modelVersionId, model.fileName);
        } else {
          console.error('Failed to queue download:', response.data.error || 'Unknown error');
          // Remove from downloading list on failure
          this.removeFromDownloadingList(model.modelId);
          this.showNotification(`❌ Failed to queue download: ${model.fileName}`, 'error');
        }
      } catch (err) {
        console.error('Download request failed:', err.response?.data?.error || err.message);
        
        // Check if it's a network error vs server error
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
          this.showNotification(`❌ Network error: Cannot connect to server`, 'error');
        } else if (err.response?.status >= 500) {
          this.showNotification(`❌ Server error: Please try again later`, 'error');
        } else {
          this.showNotification(`❌ Download failed: ${err.response?.data?.error || err.message}`, 'error');
        }
        
        // Remove from downloading list on error
        this.removeFromDownloadingList(model.modelId);
      }
    },
    removeFromDownloadingList(modelId) {
      const index = this.downloadingModels.findIndex(item => item.modelId === modelId);
      if (index > -1) {
        this.downloadingModels.splice(index, 1);
      }
    },
    isModelDownloading(modelId) {
      return this.downloadingModels.some(item => item.modelId === modelId);
    },
    startStatusPolling(modelVersionId, fileName) {
      let pollCount = 0;
      const maxPolls = 300; // 10 minutes at 2-second intervals
      
      // Poll for status updates every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          
          // Check if model is still in downloading state
          if (!this.downloadingModels.some(item => item.modelVersionId === modelVersionId)) {
            clearInterval(pollInterval);
            return;
          }
          
          // Check individual model status without triggering loading state
          const response = await axios.get(`http://localhost:3000/api/modeldetail/${modelVersionId}`);
          if (response.data) {
            // Update the specific model in the current data without refreshing entire table
            const modelIndex = this.models.findIndex(m => m.modelVersionId === modelVersionId);
            if (modelIndex !== -1) {
              this.models[modelIndex] = response.data;
            }
            
            // Check if download is complete (status changed from 0 to 1 or 3)
            if (response.data.isDownloaded === 1 || response.data.isDownloaded === 3) {
              // Download completed (success or failed)
              this.removeFromDownloadingListByVersionId(modelVersionId);
              clearInterval(pollInterval);
              
              if (response.data.isDownloaded === 1) {
                console.log(`Download completed successfully for model: ${modelVersionId}`);
                this.showNotification(`✅ Download completed: ${fileName}`, 'success');
              } else {
                console.log(`Download failed for model: ${modelVersionId}`);
                this.showNotification(`❌ Download failed: ${fileName}`, 'error');
              }
            }
          }
        } catch (error) {
          console.error('Error polling for status:', error);
          
          // If we get a 404, the model might not exist in DB yet
          if (error.response && error.response.status === 404) {
            // Don't immediately fail, wait a bit more as the download might still be processing
            if (pollCount > 10) { // Wait at least 20 seconds before giving up
              this.removeFromDownloadingListByVersionId(modelVersionId);
              clearInterval(pollInterval);
              this.showNotification(`❌ Download failed: Model not found in database`, 'error');
            }
          } else if (error.response && error.response.status >= 500) {
            // Server error, try again later
            console.log(`Server error while polling, will retry: ${error.message}`);
          } else {
            // Network error, try again later
            console.log(`Network error while polling, will retry: ${error.message}`);
          }
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          this.removeFromDownloadingListByVersionId(modelVersionId);
          console.log(`Stopped polling for model: ${modelVersionId} (max attempts reached)`);
          this.showNotification(`⏰ Download timeout: Check status manually`, 'warning');
        }
      }, 2000);
    },
    removeFromDownloadingListByVersionId(modelVersionId) {
      const index = this.downloadingModels.findIndex(item => item.modelVersionId === modelVersionId);
      if (index > -1) {
        this.downloadingModels.splice(index, 1);
      }
    },
    showNotification(message, type = 'info') {
      const notification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date()
      };
      
      this.notifications.push(notification);
      
      // Removed automatic timer - user must manually close notifications
    },
    
    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    },
    
    clearAllNotifications() {
      this.notifications = [];
    },
    async checkDownloadStatus() {
      // Toggle status visibility
      this.isStatusVisible = !this.isStatusVisible;
      
      if (!this.isStatusVisible) {
        // Hide status - remove any existing status notifications
        this.notifications = this.notifications.filter(n => !n.message.includes('🔄') && !n.message.includes('⏳') && !n.message.includes('✅') && !n.message.includes('📋'));
        return;
      }
      
      try {
        const response = await axios.get('http://localhost:3000/api/download-status');
        console.log('Download queue status:', response.data);
        
        // Remove any existing status notifications first
        this.notifications = this.notifications.filter(n => !n.message.includes('🔄') && !n.message.includes('⏳') && !n.message.includes('✅') && !n.message.includes('📋'));
        
        // Show queue status to user
        const { active, queued, maxConcurrent } = response.data;
        let statusMessage = '';
        
        if (active > 0) {
          statusMessage += `🔄 ${active} download(s) currently active`;
        }
        
        if (queued > 0) {
          statusMessage += statusMessage ? ` | ` : '';
          statusMessage += `⏳ ${queued} download(s) waiting in queue`;
        }
        
        if (active === 0 && queued === 0) {
          statusMessage = '✅ No downloads in progress';
        }
        
        this.showNotification(statusMessage, 'info');
        
        // Also show current downloading models
        if (this.downloadingModels.length > 0) {
          const downloadingList = this.downloadingModels.map(item => item.fileName).join(', ');
          this.showNotification(`📋 Currently tracking: ${downloadingList}`, 'info');
        }
        
        // Only refresh if there are no active downloads to avoid blinking
        if (this.downloadingModels.length === 0) {
          await this.fetchModels();
        }
      } catch (error) {
        console.error('Failed to check download status:', error);
        this.showNotification('❌ Failed to check download status', 'error');
      }
    },
    startPeriodicCleanup() {
      // Check for stuck downloads every 30 seconds
      this.cleanupInterval = setInterval(async () => {
        if (this.downloadingModels.length > 0) {
          console.log(`Periodic cleanup: Checking ${this.downloadingModels.length} downloading models`);
          
          try {
            // Refresh the table to get latest status
            await this.fetchModels();
            
            // Check if any downloads have completed
            const completedModels = [];
            for (const modelId of this.downloadingModels.map(item => item.modelId)) {
              const model = this.models.find(m => m.modelId === modelId);
              if (model && (model.isDownloaded === 1 || model.isDownloaded === 3)) {
                completedModels.push({ modelId, status: model.isDownloaded, fileName: model.fileName });
              }
            }
            
            // Remove completed models from downloading list
            for (const completed of completedModels) {
              this.removeFromDownloadingList(completed.modelId);
              
              if (completed.status === 1) {
                this.showNotification(`✅ Download completed: ${completed.fileName}`, 'success');
              } else {
                this.showNotification(`❌ Download failed: ${completed.fileName}`, 'error');
              }
            }
            
            if (completedModels.length > 0) {
              console.log(`Periodic cleanup: Found ${completedModels.length} completed downloads`);
            }
          } catch (error) {
            console.error('Error during periodic cleanup:', error);
          }
        }
      }, 30000); // 30 seconds
    },
    formatDate(timestamp) {
      if (!timestamp) return '-';
      
      try {
        const date = new Date(timestamp);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return timestamp; // Return original if invalid
        }
        
        // Format: "Jan 15, 2024 2:30:45 PM"
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) + ' ' + date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      } catch (error) {
        console.error('Error formatting date:', error);
        return timestamp; // Return original if formatting fails
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

.model-table-page {
  width: 100%;
  padding: 16px;
}

h1 {
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 24px;
  color: #1a202c;
  letter-spacing: -0.5px;
}

.filters {
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  color: #495057;
  transition: border-color 0.2s ease;
  min-width: 150px;
}

.filter-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.bulk-actions {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 6px;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bulk-info span {
  font-weight: 500;
  color: #1976d2;
}

.btn-bulk-download {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-bulk-download:hover:not(:disabled) {
  background: #1976d2;
}

.btn-bulk-download:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-clear-selection {
  padding: 8px 16px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-clear-selection:hover {
  background: #d32f2f;
}

.download-status {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
}

.status-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-info span {
  font-weight: 500;
  color: #495057;
}

.btn-status-check {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-status-check:hover {
  background: #0056b3;
}

.table-container {
  width: 100%;
}

.table-wrapper {
  width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
  background: #f2f2f2;
}

td {
  padding: 8px;
  border-bottom: 1px solid #ddd;
}

tr:hover {
  background-color: #f5f5f5;
}

.checkbox-header {
  width: 50px;
  text-align: center;
}

.checkbox-cell {
  width: 50px;
  text-align: center;
  padding: 10px 8px;
}

.checkbox-select-all, .checkbox-model {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-model:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-download {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.btn-download:hover:not(:disabled) {
  background: #218838;
}

.btn-download:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-download.loading {
  background: #6c757d;
}

.btn-retry {
  background: #ffc107;
  color: #212529;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.btn-retry:hover:not(:disabled) {
  background: #e0a800;
}

.btn-retry:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-retry.loading {
  background: #6c757d;
}

.status-downloaded {
  color: #28a745;
  font-weight: 500;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-top: 1px solid #dee2e6;
}

.btn-pagination {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background: #0056b3;
}

.btn-pagination:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.page-info {
  font-weight: 500;
  color: #495057;
  min-width: 80px;
  text-align: center;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #6c757d;
}

.error {
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
}

/* Notifications */
.notifications-container {
  margin-bottom: 16px;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 100%;
}

.notification-success {
  background-color: #d1fae5;
  border: 1px solid #10b981;
  color: #065f46;
}

.notification-error {
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #991b1b;
}

.notification-warning {
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
}

.notification-info {
  background-color: #dbeafe;
  border: 1px solid #3b82f6;
  color: #1e40af;
}

.notification-message {
  flex: 1;
  margin-right: 12px;
  word-wrap: break-word;
}

.notification-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.clear-all-notifications {
  background-color: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.clear-all-notifications:hover {
  background-color: #4b5563;
}
</style>