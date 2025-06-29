<template>
  <div class="lora-summary-page">
    <h1>LoRA Summary Page</h1>
    
    <div class="summary-content">
      <div class="summary-card">
        <h2>Download Matrix</h2>
        <p>Matrix showing downloaded LoRA counts by base model and NSFW level (isDownloaded = 1)</p>
        
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading matrix data...</p>
        </div>
        
        <div v-else-if="error" class="error-container">
          <p class="error-message">{{ error }}</p>
          <button @click="loadMatrixData" class="retry-button">Retry</button>
        </div>
        
        <div v-else-if="matrixData" class="matrix-container">
          <div class="matrix-table-wrapper">
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
        
        <div v-else class="no-data">
          <p>No matrix data available.</p>
        </div>
      </div>
      
      <!-- Filepath Analytics Section -->
      <div class="summary-card">
        <h2>Filepath Analytics</h2>
        <p>Saved directory paths for LoRA file scanning</p>
        
        <div v-if="loadingPaths" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading filepath data...</p>
        </div>
        
        <div v-else-if="pathError" class="error-container">
          <p class="error-message">{{ pathError }}</p>
          <button @click="loadPathData" class="retry-button">Retry</button>
        </div>
        
        <div v-else-if="savedPaths && savedPaths.length > 0" class="paths-container">
          <div class="paths-summary">
            <div class="path-stat">
              <span class="stat-label">Total Paths:</span>
              <span class="stat-value">{{ savedPaths.length }}</span>
            </div>
          </div>
          
          <div class="paths-table-wrapper">
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
                      <span class="path-icon">📁</span>
                      <span class="path-text">{{ pathData.path }}</span>
                    </div>
                  </td>
                  <td class="count-cell">
                    <span class="count-value">{{ pathData.count }}</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td class="total-label">Total</td>
                  <td class="total-count">{{ getTotalSafetensorCount() }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        <div v-else class="no-paths">
          <p>No saved filepaths found.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '../utils/api.js';

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
      pathCounts: []
    };
  },
  mounted() {
    this.loadMatrixData();
    this.loadPathData();
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
    }
  }
};
</script>

<style scoped>
.lora-summary-page {
  width: 100%;
  padding: 16px;
}

h1 {
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 16px;
  color: #1a202c;
  letter-spacing: -0.5px;
}

h2 {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #374151;
}

p {
  margin-bottom: 24px;
  color: #6b7280;
}

.summary-content {
  margin-top: 32px;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.loading-container {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  text-align: center;
  padding: 40px;
}

.error-message {
  color: #dc2626;
  margin-bottom: 16px;
}

.retry-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-button:hover {
  background: #2563eb;
}

.matrix-container {
  margin-top: 24px;
}

.matrix-table-wrapper {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 600px;
}

.matrix-table th,
.matrix-table td {
  padding: 12px 8px;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.matrix-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  position: sticky;
  top: 0;
  z-index: 10;
}

.base-model-header {
  text-align: left !important;
  min-width: 150px;
}

.nsfw-header {
  min-width: 100px;
}

.total-header {
  background: #f3f4f6 !important;
  font-weight: 700 !important;
  min-width: 80px;
}

.base-model-cell {
  text-align: left !important;
  font-weight: 500;
  background: #f9fafb;
}

.count-cell {
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.zero-count {
  color: #9ca3af;
  background: #fafafa;
}

.total-cell {
  background: #f3f4f6;
  font-weight: 600;
}

.total-row {
  background: #f3f4f6;
}

.total-label {
  font-weight: 700;
  text-align: left !important;
}

.column-total {
  font-weight: 700;
  background: #e5e7eb;
}

.grand-total {
  font-weight: 700;
  background: #d1d5db;
  color: #1f2937;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .lora-summary-page {
    padding: 8px;
  }
  
  h1 {
    font-size: 24px;
    margin-bottom: 12px;
  }
  
  h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }
  
  .summary-card {
    padding: 16px;
  }
  
  .matrix-table {
    font-size: 12px;
  }
  
  .matrix-table th,
  .matrix-table td {
    padding: 8px 4px;
  }
}

.matrix-stats {
  flex-direction: column;
  gap: 16px;
}

/* Filepath Analytics Styles */
.paths-container {
  margin-top: 16px;
}

.paths-summary {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.path-stat {
  display: flex;
  align-items: center;
  gap: 8px;
}

.paths-table-wrapper {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.paths-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 600px;
}

.paths-table th,
.paths-table td {
  padding: 12px 8px;
  text-align: left;
  border: 1px solid #e5e7eb;
}

.paths-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  position: sticky;
  top: 0;
  z-index: 10;
}

.path-header {
  min-width: 300px;
}

.count-header {
  min-width: 120px;
  text-align: center !important;
}

.path-cell {
  vertical-align: middle;
}

.count-cell {
  text-align: center !important;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.count-value {
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  color: #1f2937;
}

.total-row {
  background: #f3f4f6;
}

.total-label {
  font-weight: 700;
}

.total-count {
  font-weight: 700;
  text-align: center !important;
  background: #d1d5db;
  color: #1f2937;
}

.paths-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.path-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.path-item:hover {
  background: #e9ecef;
}

.path-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.path-icon {
  font-size: 16px;
}

.path-text {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #495057;
  word-break: break-all;
}

.path-index {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  background: #dee2e6;
  padding: 4px 8px;
  border-radius: 4px;
  min-width: 30px;
  text-align: center;
}

.no-paths {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

/* Responsive adjustments for filepath analytics */
@media (max-width: 768px) {
  .path-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .path-content {
    width: 100%;
  }
  
  .path-index {
    align-self: flex-end;
  }
}
</style> 