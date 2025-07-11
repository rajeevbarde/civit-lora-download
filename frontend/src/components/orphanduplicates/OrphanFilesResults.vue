<template>
  <div v-if="scanResults" class="results">
    <!-- Summary Card -->
    <div class="summary-card">
      <div class="card-header">
        <div class="card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2>Scan Results</h2>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17ZM17 21V10H12V5H7V19H17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ scanResults.totalScanned }}</div>
            <div class="stat-label">Total Files Scanned</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon database">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 7V17C4 19.2091 7.58172 21 12 21C16.4183 21 20 19.2091 20 17V7M4 7C4 4.79086 7.58172 3 12 3C16.4183 3 20 4.79086 20 7M4 7C4 9.20914 7.58172 11 12 11C16.4183 11 20 9.20914 20 7M20 17C20 14.7909 16.4183 13 12 13C7.58172 13 4 14.7909 4 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ scanResults.totalInDatabase }}</div>
            <div class="stat-label">Files in Database</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orphan">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value orphan-value">{{ scanResults.totalMissing }}</div>
            <div class="stat-label">Orphan Files</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Errors Section -->
    <div v-if="scanResults.scanErrors && scanResults.scanErrors.length > 0" class="error-card">
      <div class="card-header">
        <div class="card-icon error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>Scan Errors</h3>
      </div>
      <div class="error-list">
        <div v-for="error in scanResults.scanErrors" :key="error.path" class="error-item">
          <div class="error-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="error-content">
            <div class="error-path">{{ error.path }}</div>
            <div class="error-message">{{ error.error }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Missing Files Section -->
    <div v-if="scanResults.missingFiles && scanResults.missingFiles.length > 0" class="missing-files-card">
      <div class="card-header">
        <div class="card-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>Orphan Files Not Found in Database</h3>
      </div>
      
      <div class="warning-banner">
        <div class="warning-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="warning-content">
          <strong>Warning:</strong> 'Find and Fix' will search Civitai for metadata. If found, the file will be renamed to match the database entry.
        </div>
      </div>
      
      <div class="file-list">
        <div v-for="file in scanResults.missingFiles" :key="file.fullPath" class="file-card">
          <div class="file-content">
            <div class="file-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17ZM17 21V10H12V5H7V19H17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="file-info">
              <div class="file-name">{{ file.fileName }}</div>
              <div class="file-path">{{ file.directory }}</div>
              <div v-if="file.status" class="file-status" :class="file.status">
                <div class="status-icon">
                  <svg v-if="file.status === 'processing'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else-if="file.status === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else-if="file.status === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                {{ file.status === 'processing' ? 'Processing...' : 
                   file.status === 'success' ? 'Fixed Successfully' : 
                   file.status === 'error' ? 'Metadata Not Found' : '' }}
              </div>
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
              <div class="btn-icon">
                <svg v-if="file.status === 'processing'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="file.status === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="file.status === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 7V13M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              {{ file.status === 'processing' ? 'Processing...' : 
                 file.status === 'success' ? 'Fixed' : 
                 file.status === 'error' ? 'Error' : 
                 file.fileName.includes('_duplicate') ? 'Delete Later' : 'Find & Fix' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- No Missing Files -->
    <div v-else-if="scanResults.totalScanned > 0" class="success-card">
      <div class="success-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h3>All Files Found!</h3>
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
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

/* Card Styles */
.summary-card,
.error-card,
.missing-files-card,
.success-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.summary-card:hover,
.error-card:hover,
.missing-files-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* Card Header */
.card-header {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.card-header h2,
.card-header h3 {
  margin: 0;
  font-weight: 600;
  font-size: 1.25rem;
}

.card-icon {
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 1rem;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.database {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.orphan {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #718096;
  font-weight: 500;
}

.orphan-value {
  color: #e53e3e;
}

/* Error Card */
.error-card .card-header {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
}

.error-list {
  padding: 1.5rem;
}

.error-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fff5f5;
  border-radius: 8px;
  border-left: 4px solid #e53e3e;
}

.error-icon {
  margin-right: 1rem;
  color: #e53e3e;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.error-content {
  flex: 1;
}

.error-path {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.error-message {
  color: #e53e3e;
  font-size: 0.875rem;
}

/* Missing Files Card */
.missing-files-card .card-header {
  background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
}

.warning-banner {
  display: flex;
  align-items: center;
  margin: 1.5rem;
  padding: 1rem;
  background: #fffaf0;
  border-radius: 8px;
  border: 1px solid #f6ad55;
}

.warning-icon {
  margin-right: 1rem;
  color: #d69e2e;
  flex-shrink: 0;
}

.warning-content {
  color: #744210;
  font-size: 0.875rem;
}

.file-list {
  padding: 0 1.5rem 1.5rem;
}

.file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  margin-bottom: 1rem;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.file-card:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
  transform: translateY(-1px);
}

.file-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.file-icon {
  margin-right: 1rem;
  color: #4a5568;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
  font-size: 1rem;
}

.file-path {
  font-size: 0.75rem;
  color: #718096;
  margin-bottom: 0.5rem;
  word-break: break-all;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.file-status {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-icon {
  margin-right: 0.5rem;
}

.file-status.processing {
  color: #3182ce;
}

.file-status.success {
  color: #38a169;
}

.file-status.error {
  color: #e53e3e;
}

/* Button Styles */
.fix-btn {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-icon {
  margin-right: 0.5rem;
}

.fix-btn:not(:disabled) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.fix-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.fix-btn.processing {
  background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%);
  color: white;
  cursor: default;
}

.fix-btn.success {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  color: white;
  cursor: default;
}

.fix-btn.error {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  color: white;
  cursor: default;
}

.fix-btn.duplicate-file {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%) !important;
  color: white !important;
  cursor: not-allowed;
  opacity: 0.7;
}

.fix-btn:disabled {
  background: #cbd5e0;
  color: #a0aec0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Success Card */
.success-card {
  text-align: center;
  padding: 3rem 2rem;
}

.success-icon {
  margin-bottom: 1.5rem;
  color: #38a169;
}

.success-card h3 {
  margin: 0 0 1rem 0;
  color: #2d3748;
  font-size: 1.5rem;
  font-weight: 600;
}

.success-card p {
  margin: 0;
  color: #38a169;
  font-size: 1.125rem;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .file-card {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .file-actions {
    margin-top: 1rem;
    width: 100%;
  }
  
  .fix-btn {
    width: 100%;
  }
  
  .card-header {
    flex-direction: column;
    text-align: center;
  }
  
  .card-icon {
    margin-right: 0;
    margin-bottom: 1rem;
  }
}

/* Animation for processing status */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.file-status.processing .status-icon svg,
.fix-btn.processing .btn-icon svg {
  animation: spin 1s linear infinite;
}
</style> 