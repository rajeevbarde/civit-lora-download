<template>
  <div class="app-container">
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

.bulk-actions {
  margin-bottom: 20px;
  padding: 16px;
  background: #ebf8ff;
  border: 1px solid #bee3f8;
  border-radius: 8px;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.bulk-info span {
  font-weight: 500;
  color: #2b6cb0;
}

.btn-bulk-download {
  padding: 8px 16px;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-bulk-download:hover:not(:disabled) {
  background: #38a169;
}

.btn-bulk-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-clear-selection {
  padding: 8px 16px;
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-selection:hover {
  background: #cbd5e0;
}

.download-status {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.status-info span {
  font-weight: 500;
  color: #0369a1;
}

.btn-status-check {
  padding: 6px 12px;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-status-check:hover {
  background: #0284c7;
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

.checkbox-header {
  width: 40px;
  text-align: center;
}

.checkbox-cell {
  width: 40px;
  text-align: center;
  padding: 12px 8px;
}

.checkbox-select-all, .checkbox-model {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3182ce;
}

.checkbox-model:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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

.notifications-container {
  margin-bottom: 20px;
  position: relative;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 6px;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.notification-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.notification-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.notification-warning {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fed7aa;
}

.notification-info {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.notification-message {
  flex: 1;
  margin-right: 12px;
}

.notification-close {
  background: none;
  border: none;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.notification-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.clear-all-notifications {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.clear-all-notifications:hover {
  background: #4b5563;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>