<template>
  <div class="setting-page">
    <h1>Settings</h1>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else>
      <form @submit.prevent="saveSettings">
        <div class="form-group">
          <label for="dbPath">DB Path:</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input id="dbPath" v-model="dbPathInput" type="text" @input="onDbPathInput" />
            <button type="button" @click="verifyDbPath">Verify</button>
            <span v-if="latestPublishedAt" class="latest-published-at">Data is latest up to: {{ new Date(latestPublishedAt).toLocaleString() }}</span>
          </div>
          <div v-if="verifyLoading" class="loading">Verifying database...</div>
          <div v-if="verifyResult" class="verify-result">
            <h3>Verification Result</h3>
            <ul>
              <li><b>File Exists:</b> {{ verifyResult.fileExists ? 'Yes' : 'No' }}</li>
              <li><b>Table Exists:</b> {{ verifyResult.tableExists ? 'Yes' : 'No' }}</li>
              <li><b>Schema Matches:</b> {{ verifyResult.schemaMatches ? 'Yes' : 'No' }}</li>
              <li><b>Indexes:</b>
                <ul>
                  <li v-for="idx in verifyResult.indexResults" :key="idx.name">
                    {{ idx.name }}: <span :style="{color: idx.exists && idx.match !== false ? 'green' : 'red'}">
                      {{ idx.exists ? (idx.match !== false ? 'OK' : 'Columns mismatch') : 'Missing' }}
                    </span>
                    <span v-if="idx.exists && idx.match === false">
                      (Expected: [{{ idx.expected.join(', ') }}], Got: [{{ idx.columns.join(', ') }}])
                    </span>
                  </li>
                </ul>
              </li>
            </ul>
            <div v-if="verifyResult.errors && verifyResult.errors.length" class="error">
              <b>Errors:</b>
              <ul>
                <li v-for="err in verifyResult.errors" :key="err">{{ err }}</li>
              </ul>
            </div>
            <div style="margin-top: 1rem;">
              <button
                v-if="verifyResult.fileExists && verifyResult.tableExists && verifyResult.schemaMatches && verifyResult.indexResults.every(idx => idx.exists && idx.match !== false)"
                type="button"
                @click="saveDbPath"
                :disabled="dbPathInput === dbPath"
              >
                Save DB Path
              </button>
              <span v-if="dbPathSaveSuccess" class="success">DB path saved!<br /><span class="restart-msg">Please restart the application for changes to take effect.</span></span>
              <span v-if="dbPathSaveError" class="error">{{ dbPathSaveError }}</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="downloadBaseDir">Download Base Dir:</label>
          <input id="downloadBaseDir" v-model="downloadBaseDirInput" type="text" />
        </div>
        <div class="form-group">
          <label for="civitaiToken">CivitAI Token:</label>
          <input id="civitaiToken" v-model="civitaiTokenInput" type="text" />
        </div>
        <button type="submit">Save</button>
      </form>
      <div v-if="success" class="success">
        Settings updated!<br />
        <span class="restart-msg">Please restart the application for changes to take effect.</span>
      </div>
      <div class="logs-section">
        <h2>Log Files</h2>
        <button @click="clearAllLogs" class="clear-logs-btn">Clear All Logs</button>
        <button class="reset-db-btn">Reset database</button>
        <ul>
          <li v-for="file in logFiles" :key="file.name">
            {{ file.name }} ({{ formatFileSize(file.size) }})
          </li>
        </ul>
        <div v-if="logSuccess" class="success">All logs cleared!</div>
        <div v-if="logError" class="error">{{ logError }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';
import apiService from '@/utils/api';

export default {
  name: 'Setting',
  setup() {
    const dbPath = ref('');
    const downloadBaseDir = ref('');
    const civitaiToken = ref('');
    const dbPathInput = ref('');
    const downloadBaseDirInput = ref('');
    const civitaiTokenInput = ref('');
    const error = ref('');
    const success = ref(false);
    const logFiles = ref([]);
    const logSuccess = ref(false);
    const logError = ref('');
    const verifyResult = ref(null);
    const verifyLoading = ref(false);
    const dbPathSaveSuccess = ref(false);
    const dbPathSaveError = ref('');
    const latestPublishedAt = ref(null);

    async function loadSettings() {
      try {
        const settings = await apiService.fetchSettings();
        dbPath.value = settings.DB_PATH;
        downloadBaseDir.value = settings.DOWNLOAD_BASE_DIR;
        civitaiToken.value = settings.CIVITAI_TOKEN;
        dbPathInput.value = settings.DB_PATH;
        downloadBaseDirInput.value = settings.DOWNLOAD_BASE_DIR;
        civitaiTokenInput.value = settings.CIVITAI_TOKEN;
        // Fetch log files
        const logData = await apiService.fetchLogFiles();
        logFiles.value = logData.files || [];
        // Fetch latest publishedAt
        fetchLatestPublishedAt();
      } catch (err) {
        error.value = err.message || 'Failed to load settings';
      }
    }

    async function fetchLatestPublishedAt() {
      try {
        const { latest } = await apiService.getLatestPublishedAt();
        latestPublishedAt.value = latest;
      } catch (err) {
        latestPublishedAt.value = null;
      }
    }

    async function saveSettings() {
      try {
        await apiService.updateSettings({
          DOWNLOAD_BASE_DIR: downloadBaseDirInput.value,
          CIVITAI_TOKEN: civitaiTokenInput.value
        });
        success.value = true;
        error.value = '';
        downloadBaseDir.value = downloadBaseDirInput.value;
        civitaiToken.value = civitaiTokenInput.value;
      } catch (err) {
        error.value = err.message || 'Failed to update settings';
        success.value = false;
      }
    }

    async function saveDbPath() {
      dbPathSaveSuccess.value = false;
      dbPathSaveError.value = '';
      try {
        await apiService.updateSettings({ DB_PATH: dbPathInput.value });
        dbPath.value = dbPathInput.value;
        dbPathSaveSuccess.value = true;
      } catch (err) {
        dbPathSaveError.value = err.message || 'Failed to save DB path';
      }
    }

    function onDbPathInput() {
      dbPathSaveSuccess.value = false;
      dbPathSaveError.value = '';
    }

    function verifyDbPath() {
      verifyResult.value = null;
      verifyLoading.value = true;
      error.value = '';
      apiService.verifyDbFileSchema(dbPathInput.value)
        .then(result => {
          verifyResult.value = result;
          // If verification is successful, refresh latest publishedAt
          if (result.fileExists && result.tableExists && result.schemaMatches && result.indexResults.every(idx => idx.exists && idx.match !== false)) {
            fetchLatestPublishedAt();
          }
        })
        .catch(err => {
          error.value = err.message || 'Verification failed';
        })
        .finally(() => {
          verifyLoading.value = false;
        });
    }

    function formatFileSize(size) {
      if (size >= 1024 * 1024) {
        return (size / (1024 * 1024)).toFixed(2) + ' MB';
      } else if (size >= 1024) {
        return (size / 1024).toFixed(2) + ' KB';
      } else {
        return size + ' B';
      }
    }

    async function clearAllLogs() {
      logSuccess.value = false;
      logError.value = '';
      try {
        await apiService.clearLogs();
        // Refresh log files
        const logData = await apiService.fetchLogFiles();
        logFiles.value = logData.files || [];
        logSuccess.value = true;
      } catch (err) {
        logError.value = err.message || 'Failed to clear logs';
      }
    }

    onMounted(loadSettings);

    return { dbPath, downloadBaseDir, civitaiToken, dbPathInput, downloadBaseDirInput, civitaiTokenInput, error, success, saveSettings, verifyDbPath, logFiles, formatFileSize, clearAllLogs, logSuccess, logError, verifyResult, verifyLoading, dbPathSaveSuccess, dbPathSaveError, saveDbPath, onDbPathInput, latestPublishedAt };
  }
};
</script>

<style scoped>
.setting-page {
  padding: 2rem;
}
.form-group {
  margin-bottom: 1rem;
}
input[type="text"] {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.25rem;
  box-sizing: border-box;
}
button {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
button:hover {
  background: #5a67d8;
}
.success {
  color: green;
  margin-top: 1rem;
}
.restart-msg {
  color: #b7791f;
  font-size: 1rem;
  display: block;
  margin-top: 0.5rem;
}
.error {
  color: red;
  margin-top: 1rem;
}
.current-values {
  margin-top: 2rem;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
}
.logs-section {
  margin-top: 2rem;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
}
.clear-logs-btn {
  margin-bottom: 1rem;
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.clear-logs-btn:hover {
  background: #c53030;
}
.reset-db-btn {
  margin-bottom: 1rem;
  margin-left: 1rem;
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.reset-db-btn:hover {
  background: #c53030;
}
.loading {
  margin-top: 1rem;
  color: #667eea;
  font-size: 1rem;
}
.verify-result {
  margin-top: 1rem;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
}
.latest-published-at {
  margin-left: 1rem;
  color: #555;
  font-size: 0.95rem;
}
</style> 