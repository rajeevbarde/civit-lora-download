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
/* Enhanced Folders Section Styles */
.folders-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.folders-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.folders-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.folders-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.saved-paths-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.paths-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.paths-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.paths-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.paths-count {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.paths-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.path-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.path-item:hover {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.path-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.path-icon {
  font-size: 1.2rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.path-text {
  font-weight: 700;
  color: #495057;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  word-break: break-all;
}

.delete-path-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-left: 1rem;
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-path-btn:hover {
  background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.delete-icon {
  font-size: 1rem;
}

.no-paths-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
  text-align: center;
}

.no-paths-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.no-paths-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.no-paths-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
}

.no-paths-message {
  font-size: 1rem;
  color: #6c757d;
  margin: 0;
  line-height: 1.5;
}

.add-path-section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.add-path-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.add-path-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #28a745;
}

.add-path-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.add-path-form {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.input-group {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 1rem;
}

.directory-input {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #fff;
  color: #495057;
}

.directory-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.directory-input::placeholder {
  color: #adb5bd;
  font-style: italic;
}

.save-path-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  justify-content: center;
}

.save-path-btn:hover {
  background: linear-gradient(135deg, #218838 0%, #1ea085 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.save-path-btn:active {
  transform: translateY(0);
}

.save-icon {
  font-size: 1.1rem;
}

.save-text {
  font-weight: 600;
}

/* Responsive design for folders section */
@media (max-width: 768px) {
  .folders-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .folders-title {
    font-size: 1.5rem;
  }
  
  .folders-subtitle {
    font-size: 1rem;
  }
  
  .add-path-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-group {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .save-path-btn {
    width: 100%;
  }
  
  .path-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .delete-path-btn {
    margin-left: 0;
    align-self: flex-end;
  }
}
</style> 