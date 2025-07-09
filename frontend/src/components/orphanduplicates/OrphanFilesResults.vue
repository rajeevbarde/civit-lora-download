<template>
  <div v-if="scanResults" class="results">
    <div class="summary">
      <h2>Scan Results</h2>
      <div class="stats">
        <div class="stat">
          <span class="label">Total Files Scanned:</span>
          <span class="value">{{ scanResults.totalScanned }}</span>
        </div>
        <div class="stat">
          <span class="label">Files in Database:</span>
          <span class="value">{{ scanResults.totalInDatabase }}</span>
        </div>
        <div class="stat">
          <span class="label">Orphan Files:</span>
          <span class="value missing">{{ scanResults.totalMissing }}</span>
        </div>
      </div>
    </div>

    <div v-if="scanResults.scanErrors && scanResults.scanErrors.length > 0" class="errors">
      <h3>Scan Errors</h3>
      <div class="error-list">
        <div v-for="error in scanResults.scanErrors" :key="error.path" class="error-item">
          <strong>{{ error.path }}</strong>: {{ error.error }}
        </div>
      </div>
    </div>

    <div v-if="scanResults.missingFiles && scanResults.missingFiles.length > 0" class="missing-files">
      <h3>Orphan Files Not Found in Database</h3>
      <p class="warning-message" style="color: #b26a00; margin-bottom: 1em;">
        <strong>Warning:</strong> 'Find and Fix' will search Civitai for metadata. If found, the file will be renamed to match the database entry.
      </p>
      <div class="file-list">
        <div v-for="file in scanResults.missingFiles" :key="file.fullPath" class="file-item">
          <div class="file-info">
            <div class="file-name">{{ file.fileName }}</div>
            <div class="file-path">{{ file.directory }}</div>
            <div v-if="file.status" class="file-status" :class="file.status">
              {{ file.status === 'processing' ? 'Processing...' : 
                 file.status === 'success' ? '✅ Fixed' : 
                 file.status === 'error' ? '❌ Metadata Not found' : '' }}
            </div>
          </div>
          <div class="file-actions">
            <button 
              @click="$emit('fix-file', file)" 
              :disabled="file.status === 'processing' || file.status === 'success' || file.status === 'error' || file.fileName.includes('_duplicate')"
              class="fix-btn"
              :class="{ 
                'processing': file.status === 'processing',
                'success': file.status === 'success',
                'error': file.status === 'error',
                'duplicate-file': file.fileName.includes('_duplicate')
              }"
            >
              {{ file.status === 'processing' ? 'Processing...' : 
                 file.status === 'success' ? '✅ Fixed' : 
                 file.status === 'error' ? '❌ Error' : 
                 file.fileName.includes('_duplicate') ? 'Delete me later' : 'Find and Fix' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="scanResults.totalScanned > 0" class="no-missing">
      <p>✅ All scanned files were found in the database!</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrphanFilesResults',
  props: {
    scanResults: {
      type: Object,
      default: null
    }
  },
  emits: ['fix-file']
}
</script>

<style scoped>
.results {
  margin-top: 2rem;
}

.summary {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.summary h2 {
  margin-top: 0;
  color: #333;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.stat .label {
  font-weight: 500;
  color: #666;
}

.stat .value {
  font-weight: bold;
  color: #333;
}

.stat .value.missing {
  color: #dc3545;
}

.errors {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.errors h3 {
  color: #721c24;
  margin-top: 0;
}

.error-list {
  margin-top: 1rem;
}

.error-item {
  background: white;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid #dc3545;
}

.missing-files {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 1.5rem;
}

.missing-files h3 {
  color: #856404;
  margin-top: 0;
}

.file-list {
  margin-top: 1rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 0.25rem;
}

.file-path {
  font-size: 11px;
  color: #666;
  margin-bottom: 0.25rem;
  word-break: break-all;
}

.file-status {
  font-size: 0.85rem;
  font-weight: 500;
}

.file-status.processing {
  color: #007bff;
}

.file-status.success {
  color: #28a745;
}

.file-status.error {
  color: #dc3545;
}

.file-actions {
  margin-left: 1rem;
}

.fix-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  min-width: 100px;
}

.fix-btn:hover:not(:disabled) {
  background: #218838;
}

.fix-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.fix-btn.processing {
  background: #007bff;
}

.fix-btn.success {
  background: #28a745;
  cursor: default;
}

.fix-btn.error {
  background: #dc3545;
  cursor: default;
}

.fix-btn.duplicate-file {
  background: #dc3545;
  color: white;
  cursor: not-allowed;
  opacity: 0.8;
}

.fix-btn.duplicate-file:hover {
  background: #dc3545;
  cursor: not-allowed;
}

.no-missing {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  color: #155724;
}
</style> 