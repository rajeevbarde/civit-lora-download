<template>
  <div v-if="showBadDownloads" class="bad-downloads-section">
    <h2 class="section-title">Bad Downloads - Duplicate Filenames</h2>
    <div v-if="badDownloadsLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Scanning for duplicate filenames...</span>
    </div>
    <div v-else-if="badDownloadsError" class="error-card">{{ badDownloadsError }}</div>
    <div v-else-if="badDownloads && badDownloads.length > 0" class="results-container">
      <div class="results-header">
        <h3 class="results-title">Found {{ badDownloads.length }} duplicate filenames</h3>
        <p class="results-subtitle">These files have the same name but may be corrupted or incomplete due to bad downloads</p>
      </div>
      
      <div class="table-container">
        <table class="bad-downloads-table">
          <thead>
            <tr>
              <th class="filename-column">Filename</th>
              <th class="paths-column">Full Paths (Duplicates)</th>
              <th class="bad-download-column">Bad Download</th>
              <th class="action-column">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in badDownloads" :key="index" class="table-row">
              <td class="filename-cell">
                <div class="filename-content">
                  <span class="filename-text">{{ item.filename }}</span>
                  <span class="duplicate-count">({{ item.paths ? item.paths.length : 0 }} duplicates)</span>
                </div>
              </td>
              <td class="paths-cell">
                <div class="paths-list">
                  <div 
                    v-for="(path, pathIndex) in (item.paths || [])" 
                    :key="pathIndex"
                    class="path-item"
                  >
                    <span class="path-text">{{ path }}</span>
                  </div>
                </div>
              </td>
              <td class="bad-download-cell">
                <button 
                  @click="item && $emit('identify', item)"
                  class="identify-btn"
                  :disabled="item && item.identifying"
                >
                  <span class="btn-icon">🔍</span>
                  <span class="btn-text">{{ item && item.identifying ? 'Identifying...' : 'Identify' }}</span>
                </button>
              </td>
              <td class="action-cell">
                <div v-if="item && item.hashResult" class="action-content">
                  <div class="hash-result">{{ item.hashResult }}</div>
                  <div v-if="item.hashResult.includes('✅ Identical')" class="action-message">
                    <div class="message-text">Files are not corrupted. Use duplicate/orphan button to fix it.</div>
                  </div>
                  <div v-else-if="item.hashResult.includes('❌')" class="action-message">
                    <div class="message-text">Files have different hashes - potential bad downloads detected.</div>
                  </div>
                </div>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
    <div v-else class="no-results">
      <div class="no-results-icon">✅</div>
      <h3 class="no-results-title">No duplicate filenames found</h3>
      <p class="no-results-subtitle">All files appear to have unique names across folders</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BadDownloadsResults',
  props: {
    showBadDownloads: {
      type: Boolean,
      default: false
    },
    badDownloadsLoading: {
      type: Boolean,
      default: false
    },
    badDownloadsError: {
      type: String,
      default: null
    },
    badDownloads: {
      type: Array,
      default: () => []
    }
  },
  emits: ['identify']
}
</script>

<style scoped>
.bad-downloads-section {
  margin-top: 2rem;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
}

.section-title {
  margin: 0;
  padding: 1.5rem 1.5rem 1rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1.5rem;
  color: #6c757d;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #ff6b6b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-card {
  margin: 1.5rem;
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  font-weight: 500;
}

.results-container {
  padding: 1.5rem;
}

.results-header {
  margin-bottom: 1.5rem;
  text-align: center;
}

.results-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
}

.results-subtitle {
  color: #6c757d;
  margin: 0;
  font-size: 0.95rem;
}

.table-container {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.bad-downloads-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.bad-downloads-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filename-column {
  width: 25%;
  min-width: 180px;
}

.paths-column {
  width: 55%;
}

.bad-download-column {
  width: 10%;
  min-width: 100px;
}

.action-column {
  width: 10%;
  min-width: 150px;
}

.bad-downloads-table td {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  vertical-align: top;
}

.table-row:hover {
  background: #f8f9fa;
}

.filename-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filename-text {
  font-weight: 600;
  color: #2c3e50;
  word-break: break-word;
}

.duplicate-count {
  font-size: 0.85rem;
  color: #ff6b6b;
  font-weight: 500;
}

.paths-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.path-item {
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #ff6b6b;
}

.path-text {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #1a1a1a;
  word-break: break-all;
  font-weight: 600;
}



.identify-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.identify-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.identify-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-icon {
  font-size: 0.9rem;
}

.btn-text {
  font-weight: 600;
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hash-result {
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.5rem;
  border-radius: 4px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.action-message {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-text {
  font-size: 0.85rem;
  color: #495057;
  font-weight: 500;
}

.no-results {
  text-align: center;
  padding: 3rem 1.5rem;
  color: #6c757d;
}

.no-results-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.no-results-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
}

.no-results-subtitle {
  margin: 0;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .filename-column {
    width: 25%;
    min-width: 120px;
  }
  
  .paths-column {
    width: 45%;
  }
  
  .bad-download-column {
    width: 30%;
    min-width: 120px;
  }
  
  .bad-downloads-table th,
  .bad-downloads-table td {
    padding: 0.75rem 0.5rem;
  }
  
  .filename-text {
    font-size: 0.9rem;
  }
  
  .path-text {
    font-size: 0.8rem;
  }
  
  .identify-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }
}
</style> 