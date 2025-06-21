<template>
  <div class="civit-data-fetcher">
    <h1>Civit Data Fetcher</h1>
    
    <div class="controls">
      <button 
        @click="scanForMissingFiles" 
        :disabled="isScanning"
        class="scan-button"
      >
        {{ isScanning ? 'Scanning...' : 'Scan for Missing Files' }}
      </button>
      
      <div v-if="isScanning" class="scan-progress">
        <p>Scanning directories for files not found in database...</p>
      </div>
    </div>

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
            <span class="label">Missing Files:</span>
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
        <h3>Files Not Found in Database</h3>
        <div class="file-list">
          <div v-for="file in scanResults.missingFiles" :key="file.fullPath" class="file-item">
            <div class="file-info">
              <div class="file-name">{{ file.fileName }}</div>
              <div class="file-path">{{ file.directory }}</div>
              <div v-if="file.status" class="file-status" :class="file.status">
                {{ file.status === 'processing' ? 'Processing...' : 
                   file.status === 'success' ? '✅ Fixed' : 
                   file.status === 'error' ? '❌ Error' : '' }}
              </div>
            </div>
            <div class="file-actions">
              <button 
                @click="fixFile(file)" 
                :disabled="file.status === 'processing'"
                class="fix-btn"
                :class="{ 'processing': file.status === 'processing' }"
              >
                {{ file.status === 'processing' ? 'Processing...' : 'Fix File' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="scanResults.totalScanned > 0" class="no-missing">
        <p>✅ All scanned files were found in the database!</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CivitDataFetcher',
  data() {
    return {
      isScanning: false,
      scanResults: null
    }
  },
  methods: {
    async scanForMissingFiles() {
      this.isScanning = true;
      this.scanResults = null;
      
      try {
        const response = await fetch('http://localhost:3000/api/find-missing-files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        this.scanResults = data;
        
      } catch (error) {
        console.error('Error scanning for missing files:', error);
        alert('Error scanning for missing files: ' + error.message);
      } finally {
        this.isScanning = false;
      }
    },
    
    async fixFile(file) {
      // Set processing status
      file.status = 'processing';
      
      try {
        // Step 1: Compute SHA256 hash of the file
        const hash = await this.computeFileHash(file.fullPath);
        console.log(`Hash for ${file.fileName}: ${hash}`);
        
        // Step 2: Fetch model version ID from CivitAI
        const modelVersionId = await this.fetchModelVersionId(hash);
        console.log(`Model Version ID for ${file.fileName}: ${modelVersionId}`);
        
        // Step 3: Call the fix-file API
        const response = await fetch('http://localhost:3000/api/fix-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            modelVersionId: modelVersionId,
            filePath: file.fullPath
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('File fixed successfully:', result);
        
        // Set success status
        file.status = 'success';
        
      } catch (error) {
        console.error('Error fixing file:', error);
        file.status = 'error';
        file.errorMessage = error.message;
        alert(`Error fixing file ${file.fileName}: ${error.message}`);
      }
    },
    
    async computeFileHash(filePath) {
      try {
        // Use backend endpoint to compute hash
        const response = await fetch('http://localhost:3000/api/compute-file-hash', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filePath })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.hash;
        
      } catch (error) {
        console.error('Error computing hash:', error);
        throw new Error(`Failed to compute file hash: ${error.message}`);
      }
    },
    
    async fetchModelVersionId(hash) {
      try {
        const url = `https://civitai.com/api/v1/model-versions/by-hash/${hash}`;
        console.log(`Fetching metadata from: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`CivitAI API error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const modelVersionId = data.id;
        
        if (!modelVersionId) {
          throw new Error("Model version ID not found in CivitAI response");
        }
        
        console.log(`✅ CivitAI data retrieved. Model Version ID: ${modelVersionId}`);
        return modelVersionId;
        
      } catch (error) {
        console.error('Error fetching model version ID:', error);
        throw new Error(`Failed to fetch model version ID: ${error.message}`);
      }
    }
  }
}
</script>

<style scoped>
.civit-data-fetcher {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.controls {
  margin-bottom: 2rem;
}

.scan-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.scan-button:hover:not(:disabled) {
  background: #0056b3;
}

.scan-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.scan-progress {
  margin-top: 1rem;
  color: #666;
}

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
  color: #666;
  font-size: 0.9rem;
  word-break: break-all;
  margin-bottom: 0.25rem;
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

.no-missing {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  color: #155724;
}

h1 {
  color: #333;
  margin-bottom: 1rem;
}

h3 {
  margin-bottom: 1rem;
}
</style> 