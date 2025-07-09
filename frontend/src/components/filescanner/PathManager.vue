<template>
  <div class="folders-section">
    <div class="folders-header">
      <h2 class="folders-title">LoRA Folders</h2>
      <p class="folders-subtitle">Manage your LoRA directory paths for scanning and validation</p>
    </div>
    
    <!-- Saved Paths Display -->
    <div v-if="savedPaths.length" class="saved-paths-container">
      <div class="paths-header">
        <span class="paths-icon">📁</span>
        <span class="paths-label">Existing LoRA Folders</span>
        <span class="paths-count">({{ savedPaths.length }})</span>
      </div>
      <div class="paths-list">
        <div v-for="(p, idx) in savedPaths" :key="idx" class="path-item">
          <div class="path-content">
            <span class="path-icon">📂</span>
            <span class="path-text">{{ p }}</span>
          </div>
          <button class="delete-path-btn" @click="deletePath(p)" title="Delete this path">
            <span class="delete-icon">🗑️</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- No Paths Message -->
    <div v-else class="no-paths-container">
      <div class="no-paths-content">
        <span class="no-paths-icon">📁</span>
        <h3 class="no-paths-title">No Saved Paths</h3>
        <p class="no-paths-message">Please add a directory path below to get started with LoRA scanning.</p>
      </div>
    </div>
    
    <!-- Add New Path Section -->
    <div class="add-path-section">
      <div class="add-path-header">
        <span class="add-path-icon">➕</span>
        <span class="add-path-label">Add existing LoRA folders containing files</span>
      </div>
      <div class="add-path-form">
        <div class="input-group">
          <input
            v-model="directoryPath"
            type="text"
            placeholder="Enter full Windows directory path (e.g., C:\Users\YourName\Documents\LoRA)"
            class="directory-input"
          />
          <button @click="savePath" class="save-path-btn">
            <span class="save-icon">💾</span>
            <span class="save-text">Save Path</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { useErrorHandler } from '@/composables/useErrorHandler.js';

export default {
  name: 'PathManager',
  emits: ['paths-updated'],
  setup() {
    const errorHandler = useErrorHandler();
    return { errorHandler };
  },
  data() {
    return {
      directoryPath: '',
      savedPaths: [],
    };
  },
  methods: {
    async savePath() {
      if (!this.directoryPath) {
        this.errorHandler.handleWarning('Please enter a directory path.');
        return;
      }
      try {
        await apiService.savePathLegacy(this.directoryPath);
        this.errorHandler.handleSuccess('Path saved successfully');
        await this.fetchSavedPaths();
        this.directoryPath = '';
        this.$emit('paths-updated', this.savedPaths);
      } catch (error) {
        this.errorHandler.handleError(error, 'saving path');
      }
    },
    
    async fetchSavedPaths() {
      try {
        const data = await apiService.getSavedPathsLegacy();
        if (Array.isArray(data.paths)) {
          this.savedPaths = data.paths;
        } else {
          this.savedPaths = [];
        }
      } catch (error) {
        this.errorHandler.handleError(error, 'fetching saved paths', { showNotification: false });
        this.savedPaths = [];
      }
    },
    
    async deletePath(path) {
      try {
        await apiService.deletePathLegacy(path);
        this.errorHandler.handleSuccess('Path deleted successfully');
        await this.fetchSavedPaths();
        this.$emit('paths-updated', this.savedPaths);
      } catch (error) {
        this.errorHandler.handleError(error, 'deleting path');
      }
    },
  },
  async mounted() {
    await this.fetchSavedPaths();
    this.$emit('paths-updated', this.savedPaths);
  },
};
</script>

<style scoped>
/* Simplified Folders Section Styles */
.folders-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #dee2e6;
}

.folders-header {
  margin-bottom: 1rem;
}

.folders-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #495057;
  margin: 0 0 0.25rem 0;
}

.folders-subtitle {
  font-size: 0.9rem;
  color: #6c757d;
  margin: 0;
}

.saved-paths-container {
  background: white;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #dee2e6;
}

.paths-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #dee2e6;
}

.paths-icon {
  font-size: 1rem;
  margin-right: 0.5rem;
}

.paths-label {
  font-weight: 500;
  color: #495057;
  font-size: 0.9rem;
}

.paths-count {
  margin-left: 0.25rem;
  font-size: 0.8rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
}

.paths-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.path-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.path-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.path-icon {
  font-size: 0.9rem;
  margin-right: 0.5rem;
  color: #6c757d;
}

.path-text {
  font-weight: 500;
  color: #495057;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.delete-path-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.delete-path-btn:hover {
  background: #c82333;
}

.delete-icon {
  font-size: 0.8rem;
}

.no-paths-container {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #dee2e6;
  text-align: center;
}

.no-paths-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.no-paths-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.7;
}

.no-paths-title {
  font-size: 1rem;
  font-weight: 500;
  color: #495057;
  margin: 0 0 0.25rem 0;
}

.no-paths-message {
  font-size: 0.85rem;
  color: #6c757d;
  margin: 0;
}

.add-path-section {
  background: white;
  border-radius: 6px;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
}

.add-path-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.add-path-icon {
  font-size: 0.9rem;
  margin-right: 0.5rem;
}

.add-path-label {
  font-weight: 500;
  color: #495057;
  font-size: 0.9rem;
}

.add-path-form {
  display: flex;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.directory-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
}

.directory-input:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.save-path-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.save-path-btn:hover {
  background: #0056b3;
}

.save-icon {
  font-size: 0.8rem;
}

.save-text {
  font-size: 0.85rem;
}
</style> 