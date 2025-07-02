<template>
  <div class="settings-page">
    <!-- Settings Header -->
    <div class="settings-main-header">
      <span class="settings-main-icon">⚙️</span>
      <div>
        <h2 class="settings-main-title">Settings</h2>
        <p class="settings-main-subtitle">Configure your application and manage logs</p>
      </div>
    </div>

    <div class="settings-sections">
      <!-- DB Path Section -->
      <div class="settings-card">
        <div class="settings-section-header">
          <span class="section-icon">🗄️</span>
          <div>
            <h3 class="section-title gradient-text">Database Path</h3>
            <p class="section-subtitle">Set and verify your SQLite database file</p>
          </div>
        </div>
        <div class="settings-section-content">
          <div class="input-row">
            <input id="dbPath" v-model="dbPathInput" type="text" @input="onDbPathInput" class="settings-input" placeholder="Enter database file path" />
            <button type="button" class="settings-btn verify-btn" @click="verifyDbPath">
              <span class="btn-icon">🔍</span>
              <span class="btn-text">Verify</span>
            </button>
          </div>
          <div v-if="latestPublishedAt" class="latest-published-at">
            <span class="published-icon">📅</span>
            Data is latest up to: {{ new Date(latestPublishedAt).toLocaleString() }}
          </div>
          <div v-if="verifyLoading" class="state-row loading-row">
            <span class="state-icon">⏳</span>
            <span>Verifying database...</span>
          </div>
          <div v-if="verifyResult" class="verify-result">
            <ul class="verify-list">
              <li><b>File Exists:</b> <span :class="verifyResult.fileExists ? 'ok' : 'fail'">{{ verifyResult.fileExists ? 'Yes' : 'No' }}</span></li>
              <li><b>Table Exists:</b> <span :class="verifyResult.tableExists ? 'ok' : 'fail'">{{ verifyResult.tableExists ? 'Yes' : 'No' }}</span></li>
              <li><b>Indexes:</b>
                <span :class="verifyResult.indexResults && verifyResult.indexResults.length > 0 && verifyResult.indexResults.every(idx => idx.exists && idx.match !== false) ? 'ok' : 'fail'">
                  {{ verifyResult.indexResults && verifyResult.indexResults.length > 0 && verifyResult.indexResults.every(idx => idx.exists && idx.match !== false) ? 'Yes' : 'No' }}
                </span>
              </li>
            </ul>
            <div v-if="verifyResult.errors && verifyResult.errors.length" class="state-row error-row">
              <span class="state-icon">⚠️</span>
              <b>Errors:</b>
              <ul>
                <li v-for="err in verifyResult.errors" :key="err">{{ err }}</li>
              </ul>
            </div>
            <div class="verify-actions">
              <button
                v-if="verifyResult.fileExists && verifyResult.tableExists && verifyResult.indexResults.every(idx => idx.exists && idx.match !== false)"
                type="button"
                class="settings-btn save-btn"
                @click="saveDbPath"
                :disabled="dbPathInput === dbPath"
              >
                <span class="btn-icon">💾</span>
                <span class="btn-text">Save DB Path</span>
              </button>
              <span v-if="dbPathSaveSuccess" class="state-row success-row">
                <span class="state-icon">✅</span>
                DB path saved! <span class="restart-msg">Please restart the application for changes to take effect.</span>
              </span>
              <span v-if="dbPathSaveError" class="state-row error-row">
                <span class="state-icon">❌</span>
                {{ dbPathSaveError }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Download Base Dir Section -->
      <div class="settings-card">
        <div class="settings-section-header">
          <span class="section-icon">📂</span>
          <div>
            <h3 class="section-title gradient-text">Download Base Directory</h3>
            <p class="section-subtitle">Set the base directory for downloads</p>
          </div>
        </div>
        <div class="settings-section-content">
          <input id="downloadBaseDir" v-model="downloadBaseDirInput" type="text" class="settings-input" placeholder="Enter download base directory" />
        </div>
      </div>

      <!-- CivitAI Token Section -->
      <div class="settings-card">
        <div class="settings-section-header">
          <span class="section-icon">🔑</span>
          <div>
            <h3 class="section-title gradient-text">CivitAI Token</h3>
            <p class="section-subtitle">Set your CivitAI API token for authenticated requests</p>
          </div>
        </div>
        <div class="settings-section-content">
          <input id="civitaiToken" v-model="civitaiTokenInput" type="text" class="settings-input" placeholder="Enter CivitAI token" />
        </div>
      </div>

      <!-- Save Button -->
      <div class="settings-card save-section">
        <button type="button" class="settings-btn save-btn" @click="saveSettings">
          <span class="btn-icon">💾</span>
          <span class="btn-text">Save All Settings</span>
        </button>
        <div v-if="success" class="state-row success-row">
          <span class="state-icon">✅</span>
          Settings updated! <span class="restart-msg">Please restart the application for changes to take effect.</span>
        </div>
        <div v-if="error && !verifyLoading" class="state-row error-row">
          <span class="state-icon">❌</span>
          {{ error }}
        </div>
      </div>

      <!-- Logs Section -->
      <div class="settings-card logs-section">
        <div class="settings-section-header">
          <span class="section-icon">📝</span>
          <div>
            <h3 class="section-title gradient-text">Log Files</h3>
            <p class="section-subtitle">Manage and clear your application logs</p>
          </div>
        </div>
        <div class="logs-actions">
          <button @click="clearAllLogs" class="settings-btn clear-logs-btn">
            <span class="btn-icon">🗑️</span>
            <span class="btn-text">Clear All Logs</span>
          </button>
          <button class="settings-btn reset-db-btn" @click="showResetDbDialog = true">
            <span class="btn-icon">♻️</span>
            <span class="btn-text">Reset database</span>
          </button>
        </div>
        <div class="logs-list">
          <div v-for="file in logFiles" :key="file.name">
            <span class="logfile-icon">📄</span> {{ file.name }} <span class="logfile-size">({{ formatFileSize(file.size) }})</span>
          </div>
        </div>
        <div v-if="logSuccess" class="state-row success-row">
          <span class="state-icon">✅</span>
          All logs cleared!
        </div>
        <div v-if="logError" class="state-row error-row">
          <span class="state-icon">❌</span>
          {{ logError }}
        </div>
        <!-- Reset DB Success/Error -->
        <div v-if="resetDbSuccess" class="state-row success-row">
          <span class="state-icon">✅</span>
          Database reset successfully!
        </div>
        <div v-if="resetDbError" class="state-row error-row">
          <span class="state-icon">❌</span>
          {{ resetDbError }}
        </div>
        <!-- Reset DB Confirmation Modal -->
        <div v-if="showResetDbDialog" class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <span class="modal-warning-icon">⚠️</span>
              <span class="modal-title">Warning</span>
            </div>
            <div class="modal-body">
              This will <b>unregister all Lora</b>. Are you sure you want to continue?
            </div>
            <div class="modal-actions">
              <button class="modal-btn yes" @click="confirmResetDb">YES</button>
              <button class="modal-btn cancel" @click="showResetDbDialog = false">CANCEL</button>
            </div>
          </div>
        </div>
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
    const resetDbSuccess = ref(false);
    const resetDbError = ref('');
    const showResetDbDialog = ref(false);

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
          if (result.fileExists && result.tableExists && result.indexResults.every(idx => idx.exists && idx.match !== false)) {
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

    async function handleResetDatabase() {
      resetDbSuccess.value = false;
      resetDbError.value = '';
      try {
        const result = await apiService.resetDatabase();
        if (result.success) {
          resetDbSuccess.value = true;
        } else {
          resetDbError.value = result.error || 'Failed to reset database';
        }
      } catch (err) {
        resetDbError.value = err.message || 'Failed to reset database';
      }
    }

    // Called when user confirms YES
    function confirmResetDb() {
      showResetDbDialog.value = false;
      handleResetDatabase();
    }

    onMounted(loadSettings);

    return { dbPath, downloadBaseDir, civitaiToken, dbPathInput, downloadBaseDirInput, civitaiTokenInput, error, success, saveSettings, verifyDbPath, logFiles, formatFileSize, clearAllLogs, logSuccess, logError, verifyResult, verifyLoading, dbPathSaveSuccess, dbPathSaveError, saveDbPath, onDbPathInput, latestPublishedAt, resetDbSuccess, resetDbError, handleResetDatabase, showResetDbDialog, confirmResetDb };
  }
};
</script>

<style scoped>
.settings-page {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
  padding: 0 0 2rem 0;
}
.settings-main-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2.5rem 0 2rem 0;
  max-width: 900px;
  margin: 0 auto 2rem auto;
  border-radius: 0 0 24px 24px;
  background: linear-gradient(90deg, #667eea 0%, #5eead4 100%);
  box-shadow: 0 2px 12px 0 rgba(102, 126, 234, 0.08);
}
.settings-main-icon {
  font-size: 2.5rem;
  background: white;
  border-radius: 50%;
  padding: 0.5rem;
  box-shadow: 0 2px 8px 0 rgba(102, 126, 234, 0.10);
}
.settings-main-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #22223b;
  margin: 0;
}
.settings-main-subtitle {
  font-size: 1.1rem;
  color: #334155;
  margin: 0;
}
.settings-sections {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}
.settings-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px 0 rgba(102, 126, 234, 0.10);
  padding: 2rem 2.5rem;
  margin-bottom: 0;
}
.settings-section-header {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
}
.section-icon {
  font-size: 1.7rem;
  background: #f8fafc;
  border-radius: 50%;
  padding: 0.5rem;
  box-shadow: 0 2px 8px 0 rgba(102, 126, 234, 0.08);
}
.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
}
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.section-subtitle {
  font-size: 1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}
.settings-section-content {
  margin-bottom: 0.5rem;
}
.input-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}
.settings-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1.1rem;
  background: #f8fafc;
  color: #495057;
  transition: all 0.3s ease;
}
.settings-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: #fff;
}
.settings-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
.settings-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
.settings-btn:active:not(:disabled) {
  transform: translateY(0);
}
.verify-btn {
  background: linear-gradient(135deg, #fbbf24 0%, #f472b6 100%);
  color: #22223b;
}
.verify-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #f59e42 0%, #ec4899 100%);
}
.save-btn {
  margin-top: 0.5rem;
}
.clear-logs-btn, .reset-db-btn {
  background: linear-gradient(135deg, #f43f5e 0%, #fbbf24 100%);
  color: #22223b;
}
.clear-logs-btn:hover, .reset-db-btn:hover {
  background: linear-gradient(135deg, #be185d 0%, #f59e42 100%);
}
.logs-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.2rem;
}
.logs-list {
  margin: 0 0 1.2rem 0;
  padding: 0 0 0 1.2rem;
  font-size: 1.05rem;
}
.logfile-icon {
  margin-right: 0.4rem;
}
.logfile-size {
  color: #64748b;
  font-size: 0.98rem;
  margin-left: 0.3rem;
}
.state-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.08rem;
  margin-top: 1.2rem;
}
.success-row {
  color: #059669;
}
.error-row {
  color: #e11d48;
}
.loading-row {
  color: #6366f1;
}
.state-icon {
  font-size: 1.3rem;
}
.ok {
  color: #059669;
  font-weight: 600;
}
.fail {
  color: #e11d48;
  font-weight: 600;
}
.index-icon {
  margin-right: 0.3rem;
}
.verify-list {
  margin: 0 0 0.5rem 0;
  padding: 0 0 0 1.2rem;
  font-size: 1.05rem;
}
.restart-msg {
  color: #b7791f;
  font-size: 1rem;
  display: block;
  margin-top: 0.5rem;
}
@media (max-width: 700px) {
  .settings-main-header, .settings-sections, .settings-card, .logs-section {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
  .settings-main-header, .settings-sections {
    max-width: 100vw;
  }
  .settings-card, .logs-section {
    padding: 1.2rem 1rem 1.2rem 1rem;
  }
}
/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  padding: 2rem 2.5rem;
  min-width: 320px;
  max-width: 90vw;
  text-align: center;
}
.modal-header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1rem;
  justify-content: center;
}
.modal-warning-icon {
  font-size: 2rem;
}
.modal-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #e11d48;
}
.modal-body {
  font-size: 1.08rem;
  margin-bottom: 1.5rem;
}
.modal-actions {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}
.modal-btn {
  padding: 0.7rem 1.7rem;
  border-radius: 8px;
  border: none;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.modal-btn.yes {
  background: linear-gradient(135deg, #f43f5e 0%, #fbbf24 100%);
  color: #22223b;
}
.modal-btn.cancel {
  background: #e5e7eb;
  color: #22223b;
}
.modal-btn.yes:hover {
  background: linear-gradient(135deg, #be185d 0%, #f59e42 100%);
}
.modal-btn.cancel:hover {
  background: #cbd5e1;
}
</style> 