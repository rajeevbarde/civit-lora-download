<template>
  <div class="summary-section" id="locations">
    <div class="section-header">
      <div class="header-content">
        <span class="header-icon">📁</span>
        <div class="header-text">
          <h2 class="section-title">LoRA folders</h2>
          <p class="section-description">Summary of your LoRA folders and total file counts for easy organization</p>
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
          <button @click="$emit('retry')" class="retry-btn">
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
                <th class="size-header">Total Size</th>
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
                <td class="size-cell">
                  <span class="size-badge">{{ formatFileSize(pathData.totalSize || 0) }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td class="total-label">Total</td>
                <td class="total-count">
                  <span class="total-badge">{{ getTotalSafetensorCount() }}</span>
                </td>
                <td class="total-size">
                  <span class="total-badge">{{ formatFileSize(getTotalFileSize()) }}</span>
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
</template>

<script>
import { formatFileSize } from '../../utils/helpers.js';

export default {
  name: 'LoraFileLocations',
  props: {
    savedPaths: Array,
    pathCounts: Array,
    loadingPaths: Boolean,
    pathError: String
  },
  methods: {
    formatFileSize,
    getTotalSafetensorCount() {
      return this.pathCounts.reduce((total, pathData) => {
        return total + (pathData.count || 0);
      }, 0);
    },
    getTotalFileSize() {
      return this.pathCounts.reduce((total, pathData) => {
        return total + (pathData.totalSize || 0);
      }, 0);
    }
  }
};
</script>

<style scoped>
.summary-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
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
.section-content {
  padding: 32px;
}
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
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.loading-text {
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 500;
}
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
.size-header {
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1rem;
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
  font-size: 1rem;
  font-weight: 600;
  display: inline-block;
  min-width: 40px;
  text-align: center;
}
.size-cell {
  text-align: center !important;
  font-weight: 600;
}
.size-badge {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 600;
  display: inline-block;
  min-width: 60px;
  text-align: center;
}
.total-count {
  text-align: center !important;
}
.total-size {
  text-align: center !important;
}
.total-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 1.125rem;
  font-weight: 700;
  display: inline-block;
  min-width: 60px;
  text-align: center;
}
.no-paths-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}
.no-paths-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 400px;
}
.no-paths-icon {
  font-size: 3rem;
  color: #94a3b8;
}
.no-paths-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.no-paths-message {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
</style> 