<template>
  <div class="lora-summary-page">
    <!-- Enhanced Header Section -->
    <div class="header-section">
      <h1 class="page-title">LoRA Summary Dashboard</h1>
      <p class="page-subtitle">Comprehensive overview of your LoRA model collection and file organization</p>
    </div>
    
    <div class="summary-content">
      <!-- Enhanced Download Matrix Section -->
      <div class="summary-section">
        <div class="section-header">
          <div class="header-content">
            <span class="header-icon">📊</span>
            <div class="header-text">
              <h2 class="section-title">Model Overview</h2>
              <p class="section-description">Overview of your downloaded LoRA models organized by base model type and content rating</p>
            </div>
          </div>
        </div>
        
        <div class="section-content">
          <div v-if="loading" class="loading-section">
            <div class="loading-content">
              <span class="loading-icon">⏳</span>
              <span class="loading-text">Loading matrix data...</span>
            </div>
          </div>
          
          <div v-else-if="error" class="error-section">
            <div class="error-content">
              <span class="error-icon">❌</span>
              <h3 class="error-title">Error Loading Matrix</h3>
              <p class="error-message">{{ error }}</p>
              <button @click="loadMatrixData" class="retry-btn">
                <span class="btn-icon">🔄</span>
                <span class="btn-text">Retry</span>
              </button>
            </div>
          </div>
          
          <div v-else-if="matrixData" class="matrix-container">
            <div class="matrix-table-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th class="base-model-header">Base Model</th>
                    <th 
                      v-for="nsfwGroup in matrixData.nsfwGroups" 
                      :key="nsfwGroup"
                      class="nsfw-header"
                    >
                      {{ nsfwGroup }}
                    </th>
                    <th class="total-header">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="baseModel in matrixData.baseModels" 
                    :key="baseModel"
                    class="matrix-row"
                  >
                    <td class="base-model-cell">{{ baseModel }}</td>
                    <td 
                      v-for="nsfwGroup in matrixData.nsfwGroups" 
                      :key="nsfwGroup"
                      class="count-cell"
                      :class="{ 'zero-count': matrixData.matrix[baseModel][nsfwGroup] === 0 }"
                    >
                      {{ matrixData.matrix[baseModel][nsfwGroup] }}
                    </td>
                    <td class="total-cell">
                      {{ getRowTotal(baseModel) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td class="total-label">Total</td>
                    <td 
                      v-for="nsfwGroup in matrixData.nsfwGroups" 
                      :key="nsfwGroup"
                      class="column-total"
                    >
                      {{ getColumnTotal(nsfwGroup) }}
                    </td>
                    <td class="grand-total">{{ getGrandTotal() }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div v-else class="no-data-section">
            <div class="no-data-content">
              <span class="no-data-icon">📭</span>
              <h3 class="no-data-title">No Matrix Data</h3>
              <p class="no-data-message">No matrix data available at the moment.</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Enhanced Filepath Analytics Section -->
      <div class="summary-section">
        <div class="section-header">
          <div class="header-content">
            <span class="header-icon">📁</span>
            <div class="header-text">
              <h2 class="section-title">File Locations</h2>
              <p class="section-description">Summary of your LoRA file locations and total file counts for easy organization</p>
            </div>
          </div>
        </div>
        
        <div class="section-content">
          <div v-if="loadingPaths" class="loading-section">
            <div class="loading-content">
              <span class="loading-icon">⏳</span>
              <span class="loading-text">Loading filepath data...</span>
            </div>
          </div>
          
          <div v-else-if="pathError" class="error-section">
            <div class="error-content">
              <span class="error-icon">❌</span>
              <h3 class="error-title">Error Loading Filepaths</h3>
              <p class="error-message">{{ pathError }}</p>
              <button @click="loadPathData" class="retry-btn">
                <span class="btn-icon">🔄</span>
                <span class="btn-text">Retry</span>
              </button>
            </div>
          </div>
          
          <div v-else-if="savedPaths && savedPaths.length > 0" class="paths-container">
            <div class="paths-summary">
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-icon">📁</span>
                  <div class="stat-content">
                    <span class="stat-value">{{ savedPaths.length }}</span>
                    <span class="stat-label">Total Paths</span>
                  </div>
                </div>
                <div class="stat-item">
                  <span class="stat-icon">📄</span>
                  <div class="stat-content">
                    <span class="stat-value">{{ getTotalSafetensorCount() }}</span>
                    <span class="stat-label">Safetensor Files</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="paths-table-container">
              <table class="paths-table">
                <thead>
                  <tr>
                    <th class="path-header">Directory Path</th>
                    <th class="count-header">Safetensor Files</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(pathData, index) in pathCounts" :key="index" class="path-row">
                    <td class="path-cell">
                      <div class="path-content">
                        <span class="path-icon">📂</span>
                        <span class="path-text">{{ pathData.path }}</span>
                      </div>
                    </td>
                    <td class="count-cell">
                      <span class="count-badge">{{ pathData.count }}</span>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td class="total-label">Total</td>
                    <td class="total-count">
                      <span class="total-badge">{{ getTotalSafetensorCount() }}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div v-else class="no-paths-section">
            <div class="no-paths-content">
              <span class="no-paths-icon">📁</span>
              <h3 class="no-paths-title">No Saved Filepaths</h3>
              <p class="no-paths-message">No saved filepaths found. Add some paths in the Scanner section to get started.</p>
            </div>
          </div>
        </div>
      </div>
      <!-- End of File Locations section -->
    </div>
    <!-- Latest Updated Checkpoints Section (moved outside summary-content) -->
    <div class="latest-checkpoints-container">
      <div class="summary-section">
        <div class="section-header">
          <div class="header-content">
            <span class="header-icon">⏰</span>
            <div class="header-text">
              <h2 class="section-title">Latest Updated Checkpoints</h2>
              <p class="section-description">Recently updated checkpoints with their model and version names</p>
            </div>
          </div>
        </div>
        <div class="section-content">
          <div v-if="loadingCheckpoints" class="loading-section">
            <div class="loading-content">
              <span class="loading-icon">⏳</span>
              <span class="loading-text">Loading latest updated checkpoints...</span>
            </div>
          </div>
          <div v-else-if="checkpointsError" class="error-section">
            <div class="error-content">
              <span class="error-icon">❌</span>
              <h3 class="error-title">Error Loading Checkpoints</h3>
              <p class="error-message">{{ checkpointsError }}</p>
              <button @click="loadLatestCheckpoints" class="retry-btn">
                <span class="btn-icon">🔄</span>
                <span class="btn-text">Retry</span>
              </button>
            </div>
          </div>
          <div v-else-if="latestCheckpoints && latestCheckpoints.length > 0">
            <table class="checkpoints-table">
              <thead>
                <tr>
                  <th>Model / Version</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(cp, idx) in latestCheckpoints" :key="idx">
                  <td>
                    <a :href="`/model/${cp.modelId}/${cp.modelVersionId}`" target="_blank" rel="noopener">
                      {{ cp.modelName }} / {{ cp.modelVersionName }}
                    </a>
                  </td>
                  <td>{{ formatRelativeTime(cp.last_updated) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="no-data-section">
            <div class="no-data-content">
              <span class="no-data-icon">📭</span>
              <h3 class="no-data-title">No Recent Checkpoints</h3>
              <p class="no-data-message">No recently updated checkpoints found.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '../utils/api.js';

function getRelativeTime(dateString) {
  // Parse as UTC and convert to local time
  const utcDate = new Date(dateString + 'Z'); // Ensures UTC parsing
  const now = new Date();
  const diff = Math.floor((now - utcDate) / 1000); // in seconds
  if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} month${Math.floor(diff / 2592000) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(diff / 31536000)} year${Math.floor(diff / 31536000) !== 1 ? 's' : ''} ago`;
}

export default {
  name: 'LoRASummary',
  data() {
    return {
      matrixData: null,
      loading: false,
      error: null,
      loadingPaths: false,
      pathError: null,
      savedPaths: [],
      pathCounts: [],
      latestCheckpoints: [],
      loadingCheckpoints: false,
      checkpointsError: null
    };
  },
  mounted() {
    this.loadMatrixData();
    this.loadPathData();
    this.loadLatestCheckpoints();
  },
  methods: {
    async loadMatrixData() {
      this.loading = true;
      this.error = null;
      
      try {
        this.matrixData = await apiService.getDownloadMatrix();
      } catch (err) {
        this.error = err.message || 'Failed to load matrix data';
        console.error('Error loading matrix data:', err);
      } finally {
        this.loading = false;
      }
    },
    
    getRowTotal(baseModel) {
      if (!this.matrixData) return 0;
      return this.matrixData.nsfwGroups.reduce((total, nsfwGroup) => {
        return total + this.matrixData.matrix[baseModel][nsfwGroup];
      }, 0);
    },
    
    getColumnTotal(nsfwGroup) {
      if (!this.matrixData) return 0;
      return this.matrixData.baseModels.reduce((total, baseModel) => {
        return total + this.matrixData.matrix[baseModel][nsfwGroup];
      }, 0);
    },
    
    getGrandTotal() {
      if (!this.matrixData) return 0;
      return this.matrixData.baseModels.reduce((total, baseModel) => {
        return total + this.getRowTotal(baseModel);
      }, 0);
    },
    
    async loadPathData() {
      this.loadingPaths = true;
      this.pathError = null;
      
      try {
        const response = await apiService.getSavedPaths();
        this.savedPaths = response.paths || [];
        
        // Load safetensor counts for each path
        if (this.savedPaths.length > 0) {
          this.pathCounts = await apiService.getSafetensorCounts();
        }
      } catch (err) {
        this.pathError = err.message || 'Failed to load filepath data';
        console.error('Error loading filepath data:', err);
      } finally {
        this.loadingPaths = false;
      }
    },
    
    getTotalSafetensorCount() {
      return this.pathCounts.reduce((total, pathData) => {
        return total + (pathData.count || 0);
      }, 0);
    },
    async loadLatestCheckpoints() {
      this.loadingCheckpoints = true;
      this.checkpointsError = null;
      try {
        this.latestCheckpoints = await apiService.getLatestUpdatedCheckpoints();
      } catch (err) {
        this.checkpointsError = err.message || 'Failed to load latest updated checkpoints';
      } finally {
        this.loadingCheckpoints = false;
      }
    },
    formatRelativeTime(dateString) {
      return getRelativeTime(dateString);
    }
  }
};
</script>

<style scoped>
.lora-summary-page {
  width: 100%;
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}

/* Header Section */
.header-section {
  margin-bottom: 32px;
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.025em;
}

.page-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 400;
  margin: 0;
  line-height: 1.6;
}

/* Summary Content */
.summary-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Summary Section */
.summary-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

/* Section Header */
.section-header {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-text {
  flex: 1;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #1e293b;
  letter-spacing: -0.025em;
}

.section-description {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* Section Content */
.section-content {
  padding: 32px;
}

/* Loading Section */
.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-icon {
  font-size: 2rem;
  animation: pulse 2s infinite;
}

.loading-text {
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Error Section */
.error-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 400px;
}

.error-icon {
  font-size: 3rem;
  color: #ef4444;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.error-message {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.retry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

.retry-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 1rem;
}

.btn-text {
  font-weight: 600;
}

/* No Data Section */
.no-data-section,
.no-paths-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}

.no-data-content,
.no-paths-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 400px;
}

.no-data-icon,
.no-paths-icon {
  font-size: 3rem;
  color: #94a3b8;
}

.no-data-title,
.no-paths-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.no-data-message,
.no-paths-message {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* Matrix Container */
.matrix-container {
  margin-top: 0;
}

.matrix-table-container {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 600px;
}

.matrix-table th,
.matrix-table td {
  padding: 16px 12px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.matrix-table th {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-weight: 700;
  color: #1e293b;
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 0.875rem;
  letter-spacing: 0.025em;
}

.base-model-header {
  text-align: left !important;
  min-width: 180px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
}

.nsfw-header {
  min-width: 120px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
}

.total-header {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%) !important;
  font-weight: 800 !important;
  min-width: 100px;
  color: #1e293b !important;
}

.base-model-cell {
  text-align: left !important;
  font-weight: 600;
  background: #f8fafc;
  color: #1e293b;
  font-size: 0.875rem;
}

.count-cell {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e293b;
}

.zero-count {
  color: #94a3b8;
  background: #f8fafc;
  font-weight: 400;
}

.total-cell {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  font-weight: 700;
  color: #1e293b;
}

.total-row {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
}

.total-label {
  font-weight: 800;
  text-align: left !important;
  color: #1e293b;
  font-size: 0.875rem;
}

.column-total {
  font-weight: 800;
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  color: #1e293b;
}

.grand-total {
  font-weight: 800;
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  color: white;
  font-size: 1rem;
}

/* Paths Container */
.paths-container {
  margin-top: 0;
}

.paths-summary {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.summary-stats {
  display: flex;
  gap: 32px;
  justify-content: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.stat-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border-radius: 8px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.paths-table-container {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.paths-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 600px;
}

.paths-table th,
.paths-table td {
  padding: 16px 12px;
  text-align: left;
  border: 1px solid #e2e8f0;
}

.paths-table th {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-weight: 700;
  color: #1e293b;
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 0.875rem;
  letter-spacing: 0.025em;
}

.path-header {
  min-width: 400px;
}

.count-header {
  min-width: 150px;
  text-align: center !important;
}

.path-cell {
  vertical-align: middle;
}

.path-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.path-icon {
  font-size: 1.25rem;
  color: #3b82f6;
}

.path-text {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.875rem;
  color: #1e293b;
  word-break: break-all;
  line-height: 1.4;
}

.count-cell {
  text-align: center !important;
  font-weight: 600;
}

.count-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-block;
  min-width: 40px;
  text-align: center;
}

.total-count {
  text-align: center !important;
}

.total-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 700;
  display: inline-block;
  min-width: 60px;
  text-align: center;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .lora-summary-page {
    padding: 16px;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .summary-content {
    gap: 24px;
  }
  
  .section-header {
    padding: 20px 24px;
  }
  
  .section-content {
    padding: 24px;
  }
  
  .header-content {
    gap: 12px;
  }
  
  .header-icon {
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
  }
  
  .section-title {
    font-size: 1.25rem;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 16px;
  }
  
  .stat-item {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .lora-summary-page {
    padding: 12px;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .page-subtitle {
    font-size: 0.875rem;
  }
  
  .summary-content {
    gap: 20px;
  }
  
  .section-header {
    padding: 16px 20px;
  }
  
  .section-content {
    padding: 20px;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .header-icon {
    align-self: center;
  }
  
  .section-title {
    font-size: 1.125rem;
  }
  
  .section-description {
    font-size: 0.875rem;
  }
  
  .matrix-table,
  .paths-table {
    font-size: 0.75rem;
    min-width: 500px;
  }
  
  .matrix-table th,
  .matrix-table td,
  .paths-table th,
  .paths-table td {
    padding: 12px 8px;
  }
  
  .base-model-header {
    min-width: 140px;
  }
  
  .nsfw-header {
    min-width: 80px;
  }
  
  .path-header {
    min-width: 300px;
  }
  
  .count-header {
    min-width: 100px;
  }
  
  .loading-content,
  .error-content,
  .no-data-content,
  .no-paths-content {
    padding: 0 16px;
  }
  
  .loading-icon,
  .error-icon,
  .no-data-icon,
  .no-paths-icon {
    font-size: 2rem;
  }
  
  .loading-text,
  .error-title,
  .no-data-title,
  .no-paths-title {
    font-size: 1rem;
  }
  
  .error-message,
  .no-data-message,
  .no-paths-message {
    font-size: 0.875rem;
  }
  
  .retry-btn {
    padding: 10px 20px;
    font-size: 0.875rem;
  }
  
  .stat-item {
    padding: 12px 16px;
  }
  
  .stat-icon {
    font-size: 1.25rem;
    width: 32px;
    height: 32px;
  }
  
  .stat-value {
    font-size: 1.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .lora-summary-page {
    padding: 8px;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 0.8rem;
  }
  
  .section-header {
    padding: 12px 16px;
  }
  
  .section-content {
    padding: 16px;
  }
  
  .matrix-table,
  .paths-table {
    font-size: 0.7rem;
    min-width: 400px;
  }
  
  .matrix-table th,
  .matrix-table td,
  .paths-table th,
  .paths-table td {
    padding: 8px 6px;
  }
  
  .base-model-header {
    min-width: 120px;
  }
  
  .nsfw-header {
    min-width: 60px;
  }
  
  .path-header {
    min-width: 250px;
  }
  
  .count-header {
    min-width: 80px;
  }
  
  .path-content {
    gap: 8px;
  }
  
  .path-icon {
    font-size: 1rem;
  }
  
  .path-text {
    font-size: 0.75rem;
  }
  
  .count-badge {
    padding: 4px 8px;
    font-size: 0.75rem;
    min-width: 32px;
  }
  
  .total-badge {
    padding: 6px 12px;
    font-size: 0.875rem;
    min-width: 50px;
  }
}

.checkpoints-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.checkpoints-table th, .checkpoints-table td {
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  text-align: left;
}
.checkpoints-table th {
  background: #f1f5f9;
  font-weight: 600;
}
.checkpoints-table tr:nth-child(even) {
  background: #f8fafc;
}

.latest-checkpoints-container {
  max-width: 1400px;
  margin: 32px auto 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
</style> 