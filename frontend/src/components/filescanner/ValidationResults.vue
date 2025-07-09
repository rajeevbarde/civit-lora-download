<template>
  <div v-if="validationResults" class="validation-results-container">
    <div class="validation-header">
      <div class="header-content">
        <h2>🔍 Validation Results</h2>
        <div class="header-subtitle">File integrity and consistency check</div>
      </div>
      <div class="header-icon">📊</div>
    </div>
    
    <div class="validation-summary">
      <div class="summary-grid">
        <div class="summary-card total">
          <div class="card-icon">📁</div>
          <div class="card-content">
            <div class="card-value">{{ validationResults.total }}</div>
            <div class="card-label">Total Files</div>
          </div>
        </div>
        
        <div class="summary-card success">
          <div class="card-icon">✅</div>
          <div class="card-content">
            <div class="card-value">{{ validationResults.validated }}</div>
            <div class="card-label">Validated</div>
          </div>
        </div>
        
        <div class="summary-card warning">
          <div class="card-icon">⚠️</div>
          <div class="card-content">
            <div class="card-value">{{ validationResults.mismatches ? validationResults.mismatches.length : 0 }}</div>
            <div class="card-label">Mismatches</div>
          </div>
        </div>
        
        <div class="summary-card error">
          <div class="card-icon">❌</div>
          <div class="card-content">
            <div class="card-value">{{ validationResults.errors ? validationResults.errors.length : 0 }}</div>
            <div class="card-label">Errors</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mismatches Table -->
    <div v-if="validationResults.mismatches && validationResults.mismatches.length > 0" class="mismatches-section">
      <div class="section-header">
        <div class="section-icon">⚠️</div>
        <div class="section-content">
          <h3>Mismatches Found</h3>
          <div class="section-subtitle">Files with inconsistencies between database and disk</div>
        </div>
      </div>
      <table class="validation-table">
        <thead>
          <tr>
            <th>Database File Path</th>
            <th>Database Filename</th>
            <th>Actual Filename</th>
            <th>DB Size (MB)</th>
            <th>Disk Size (MB)</th>
            <th>Issue</th>
            <th>Delete file and Retry</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(mismatch, idx) in validationResults.mismatches" :key="idx">
            <td>{{ mismatch.file_path }}</td>
            <td>{{ mismatch.fileName }}</td>
            <td>{{ mismatch.actualFileName || 'N/A' }}</td>
            <td>{{ formatSize(mismatch.size_in_kb_db) }}</td>
            <td>{{ formatSize(mismatch.size_in_kb_disk) }}</td>
            <td>
              <span class="issue-badge">{{ mismatch.issue }}</span>
              <div v-if="mismatch.expectedFileName" class="expected-info">
                Expected: {{ mismatch.expectedFileName }}
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button 
                  class="delete-failed-btn" 
                  @click="handleDeleteFileAndFail(mismatch, idx)" 
                  :disabled="mismatch.deleting || mismatch.deleted"
                >
                  {{ mismatch.deleting ? 'Processing...' : mismatch.deleted ? 'Deleted' : 'Delete file' }}
                </button>
                <a 
                  :href="`${$router.resolve({ name: 'ModelDetail', params: { modelId: mismatch.modelId, modelVersionId: mismatch.modelVersionId } }).href}`"
                  target="_blank"
                  class="retry-link"
                >
                  Retry
                </a>
              </div>
              <span v-if="mismatch.deleteError" class="delete-error">{{ mismatch.deleteError }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Errors Table -->
    <div v-if="validationResults.errors && validationResults.errors.length > 0" class="errors-section">
      <div class="section-header">
        <div class="section-icon">❌</div>
        <div class="section-content">
          <h3>Errors Encountered</h3>
          <div class="section-subtitle">Issues that prevented validation</div>
        </div>
      </div>
      <table class="validation-table">
        <thead>
          <tr>
            <th>Database Filename</th>
            <th>Error Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(error, idx) in validationResults.errors" :key="idx">
            <td>{{ error.fileName }}</td>
            <td class="error-message">{{ error.error }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';

export default {
  name: 'ValidationResults',
  props: {
    validationResults: {
      type: Object,
      default: null
    }
  },
  emits: ['mismatch-deleted'],
  setup() {
    const errorHandler = useErrorHandler();
    return { errorHandler };
  },
  methods: {
    formatSize(sizeInKb) {
      if (sizeInKb === undefined || sizeInKb === null) return '';
      return (sizeInKb / 1024).toFixed(2) + ' MB';
    },
    
    async handleDeleteFileAndFail(mismatch, idx) {
      this.validationResults.mismatches[idx].deleting = true;
      this.validationResults.mismatches[idx].deleteError = '';
      
      try {
        await apiService.deleteFileAndFail({ 
          modelVersionId: mismatch.modelVersionId, 
          file_path: mismatch.file_path 
        });
        
        // Mark as deleted instead of removing the row
        this.validationResults.mismatches[idx].deleted = true;
        this.validationResults.mismatches[idx].deleting = false;
        this.$emit('mismatch-deleted', idx);
        this.errorHandler.handleSuccess('File deleted and marked as failed.');
      } catch (error) {
        this.validationResults.mismatches[idx].deleteError = 
          error.response?.data?.error || error.message || 'Failed to delete and mark as failed.';
        this.validationResults.mismatches[idx].deleting = false;
      }
    }
  }
};
</script>

<style scoped>
.validation-results-container {
  margin-top: 2rem;
  background: #fff;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid #f0f0f0;
  overflow: hidden;
}

.validation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  position: relative;
  overflow: hidden;
}

.validation-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.header-content {
  position: relative;
  z-index: 1;
}

.validation-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-subtitle {
  font-size: 0.95rem;
  opacity: 0.9;
  font-weight: 400;
}

.header-icon {
  font-size: 3rem;
  opacity: 0.8;
  position: relative;
  z-index: 1;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.validation-summary {
  margin-bottom: 2rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f0f0f0;
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--card-accent);
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.summary-card.total {
  --card-accent: #2196f3;
}

.summary-card.success {
  --card-accent: #4caf50;
}

.summary-card.warning {
  --card-accent: #ff9800;
}

.summary-card.error {
  --card-accent: #f44336;
}

.card-icon {
  font-size: 2rem;
  margin-right: 1rem;
  opacity: 0.8;
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.card-label {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mismatches-section {
  margin-bottom: 1rem;
}

.validation-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

.validation-table th {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
  padding: 16px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 10;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.validation-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #424242;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.validation-table tbody tr {
  transition: background-color 0.2s ease;
}

.validation-table tbody tr:hover {
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
  border-left: 4px solid #667eea;
}

.validation-table tbody tr:last-child td {
  border-bottom: none;
}

/* Material Design elevation on hover */
.validation-table tbody tr:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-1px);
  transition: all 0.3s ease;
}

.issue-badge {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
  display: inline-block;
  margin-bottom: 0.5rem;
}

.expected-info {
  font-size: 0.85rem;
  color: #666;
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #ff9800;
  margin-top: 0.5rem;
}

.errors-section {
  margin-top: 1rem;
}

.error-message {
  color: #d32f2f;
  font-weight: 600;
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #d32f2f;
}

.delete-failed-btn {
  background: linear-gradient(135deg, #ff5722 0%, #d84315 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-weight: 500;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(255, 87, 34, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.delete-failed-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #e64a19 0%, #bf360c 100%);
  box-shadow: 0 4px 8px rgba(255, 87, 34, 0.4);
  transform: translateY(-1px);
}

.delete-failed-btn:disabled {
  background: linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%);
  color: #757575;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
  opacity: 0.7;
}

.delete-error {
  display: block;
  color: #d32f2f;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  background: #ffebee;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #d32f2f;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.retry-link {
  color: #1976d2;
  text-decoration: none;
  font-weight: 500;
  font-size: 12px;
  transition: all 0.2s ease;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border: 1px solid #e1f5fe;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.retry-link:hover {
  color: #1565c0;
  background: linear-gradient(135deg, #bbdefb 0%, #e1bee7 100%);
  text-decoration: none;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
}

/* Enhanced section headers */
.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
  border-radius: 12px;
  border-left: 4px solid #667eea;
  transition: all 0.3s ease;
}

.section-header:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
}

.section-icon {
  font-size: 2rem;
  margin-right: 1rem;
  opacity: 0.8;
}

.section-content h3 {
  color: #424242;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}

.section-subtitle {
  color: #666;
  font-size: 0.9rem;
  font-weight: 400;
}

/* Responsive design */
@media (max-width: 768px) {
  .validation-results-container {
    padding: 1rem;
  }
  
  .validation-table {
    font-size: 12px;
  }
  
  .validation-table th,
  .validation-table td {
    padding: 8px 6px;
  }
  
  .delete-failed-btn {
    padding: 0.5rem 1rem;
    font-size: 12px;
  }
}
</style> 