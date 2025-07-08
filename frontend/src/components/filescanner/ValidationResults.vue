<template>
  <div v-if="validationResults" class="validation-results-container">
    <h2>Validation Results</h2>
    
    <div class="validation-summary">
      <p><strong>Total files checked:</strong> {{ validationResults.total }}</p>
      <p><strong>Files validated successfully:</strong> {{ validationResults.validated }}</p>
      <p><strong>Files with mismatches:</strong> {{ validationResults.mismatches ? validationResults.mismatches.length : 0 }}</p>
      <p><strong>Errors encountered:</strong> {{ validationResults.errors ? validationResults.errors.length : 0 }}</p>
    </div>
    
    <!-- Mismatches Table -->
    <div v-if="validationResults.mismatches && validationResults.mismatches.length > 0" class="mismatches-section">
      <h3>Mismatches Found</h3>
      <table class="validation-table">
        <thead>
          <tr>
            <th>Database Filename</th>
            <th>Model Version ID</th>
            <th>Database File Path</th>
            <th>Actual Filename</th>
            <th>DB Size (GB)</th>
            <th>Disk Size (GB)</th>
            <th>Issue</th>
            <th>Fix it! (Retry from Lora hub)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(mismatch, idx) in validationResults.mismatches" :key="idx">
            <td>{{ mismatch.fileName }}</td>
            <td>{{ mismatch.modelVersionId }}</td>
            <td>{{ mismatch.file_path }}</td>
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
              <button class="delete-failed-btn" @click="handleDeleteFileAndFail(mismatch, idx)" :disabled="mismatch.deleting">
                {{ mismatch.deleting ? 'Processing...' : 'Delete File and Failed' }}
              </button>
              <span v-if="mismatch.deleteError" class="delete-error">{{ mismatch.deleteError }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Errors Table -->
    <div v-if="validationResults.errors && validationResults.errors.length > 0" class="errors-section">
      <h3>Errors Encountered</h3>
      <table class="validation-table">
        <thead>
          <tr>
            <th>Database Filename</th>
            <th>Model Version ID</th>
            <th>Error Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(error, idx) in validationResults.errors" :key="idx">
            <td>{{ error.fileName }}</td>
            <td>{{ error.modelVersionId }}</td>
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
      return (sizeInKb / 1024 / 1024).toFixed(2);
    },
    
    async handleDeleteFileAndFail(mismatch, idx) {
      this.validationResults.mismatches[idx].deleting = true;
      this.validationResults.mismatches[idx].deleteError = '';
      
      try {
        await apiService.deleteFileAndFail({ 
          modelVersionId: mismatch.modelVersionId, 
          file_path: mismatch.file_path 
        });
        
        // Remove the row from mismatches after successful deletion
        this.validationResults.mismatches.splice(idx, 1);
        this.$emit('mismatch-deleted', idx);
        this.errorHandler.handleSuccess('File deleted and marked as failed.');
      } catch (error) {
        this.validationResults.mismatches[idx].deleteError = 
          error.response?.data?.error || error.message || 'Failed to delete and mark as failed.';
      } finally {
        if (this.validationResults.mismatches[idx]) {
          this.validationResults.mismatches[idx].deleting = false;
        }
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
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

.validation-summary {
  margin-bottom: 1.5rem;
  color: #424242;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #667eea;
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
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  font-size: 14px;
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

/* Enhanced section headers */
.mismatches-section h3,
.errors-section h3 {
  color: #424242;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e0e0e0;
  position: relative;
}

.mismatches-section h3::after,
.errors-section h3::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 60px;
  height: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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