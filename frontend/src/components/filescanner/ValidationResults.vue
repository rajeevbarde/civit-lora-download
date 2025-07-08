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
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 5px;
}

.validation-summary {
  margin-bottom: 1rem;
  color: #333;
}

.mismatches-section {
  margin-bottom: 1rem;
}

.validation-table {
  width: 100%;
  border-collapse: collapse;
}

.validation-table th, .validation-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.validation-table th {
  background: #f8f8f8;
  font-weight: bold;
}

.issue-badge {
  background: #f0ad4e;
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
}

.expected-info {
  font-size: 0.8rem;
  color: #666;
}

.errors-section {
  margin-top: 1rem;
}

.error-message {
  color: #d9534f;
  font-weight: bold;
}

.delete-failed-btn {
  background-color: #ff9800;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}

.delete-failed-btn:hover:not(:disabled) {
  background-color: #fb8c00;
}

.delete-failed-btn:disabled {
  background-color: #ffe0b2;
  color: #bdbdbd;
  cursor: not-allowed;
}

.delete-error {
  display: block;
  color: #d9534f;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
</style> 