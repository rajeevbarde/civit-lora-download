<template>
  <div class="settings-page">
    <!-- Settings Header -->
    <SettingsHeader />

    <div class="settings-sections">
      <!-- Database Path Section -->
      <DatabasePathSection 
        :db-path="dbPath"
        :db-path-input="dbPathInput"
        :verify-result="verifyResult"
        :verify-loading="verifyLoading"
        :latest-published-at="latestPublishedAt"
        :db-path-save-success="dbPathSaveSuccess"
        :db-path-save-error="dbPathSaveError"
        @update:db-path-input="dbPathInput = $event"
        @verify="verifyDbPath"
        @save="saveDbPath"
      />

      <!-- Download Base Directory Section -->
      <DownloadBaseDirSection 
        :download-base-dir-input="downloadBaseDirInput"
        @update:download-base-dir-input="downloadBaseDirInput = $event"
      />

      <!-- CivitAI Token Section -->
      <CivitaiTokenSection 
        :civitai-token-input="civitaiTokenInput"
        @update:civitai-token-input="civitaiTokenInput = $event"
      />

      <!-- Save All Settings Section -->
      <SaveSettingsSection 
        :success="success"
        :error="error"
        :verify-loading="verifyLoading"
        @save="saveSettings"
      />

      <!-- Logs Management Section -->
      <LogsManagementSection 
        :log-files="logFiles"
        :log-success="logSuccess"
        :log-error="logError"
        :reset-db-success="resetDbSuccess"
        :reset-db-error="resetDbError"
        :show-reset-db-dialog="showResetDbDialog"
        @clear-logs="clearAllLogs"
        @show-reset-dialog="showResetDbDialog = true"
        @confirm-reset="confirmResetDb"
        @close-reset-dialog="showResetDbDialog = false"
      />
    </div>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';
import apiService from '@/utils/api';
import SettingsHeader from '@/components/settings/SettingsHeader.vue';
import DatabasePathSection from '@/components/settings/DatabasePathSection.vue';
import DownloadBaseDirSection from '@/components/settings/DownloadBaseDirSection.vue';
import CivitaiTokenSection from '@/components/settings/CivitaiTokenSection.vue';
import SaveSettingsSection from '@/components/settings/SaveSettingsSection.vue';
import LogsManagementSection from '@/components/settings/LogsManagementSection.vue';

export default {
  name: 'SettingPage',
  components: {
    SettingsHeader,
    DatabasePathSection,
    DownloadBaseDirSection,
    CivitaiTokenSection,
    SaveSettingsSection,
    LogsManagementSection
  },
  setup() {
    // Reactive state
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

    // API Methods
    const loadSettings = async () => {
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
        await fetchLatestPublishedAt();
      } catch (err) {
        error.value = err.message || 'Failed to load settings';
      }
    };

    const fetchLatestPublishedAt = async () => {
      try {
        const { latest } = await apiService.getLatestPublishedAt();
        latestPublishedAt.value = latest;
      } catch (err) {
        latestPublishedAt.value = null;
      }
    };

    const saveSettings = async () => {
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
    };

    const saveDbPath = async () => {
      dbPathSaveSuccess.value = false;
      dbPathSaveError.value = '';
      try {
        await apiService.updateSettings({ DB_PATH: dbPathInput.value });
        dbPath.value = dbPathInput.value;
        dbPathSaveSuccess.value = true;
      } catch (err) {
        dbPathSaveError.value = err.message || 'Failed to save DB path';
      }
    };

    const verifyDbPath = () => {
      verifyResult.value = null;
      verifyLoading.value = true;
      error.value = '';
      
      apiService.verifyDbFileSchema(dbPathInput.value)
        .then(result => {
          verifyResult.value = result;
          // If verification is successful, refresh latest publishedAt
          if (result.fileExists && result.tableExists && 
              result.indexResults.every(idx => idx.exists && idx.match !== false)) {
            fetchLatestPublishedAt();
          }
        })
        .catch(err => {
          error.value = err.message || 'Verification failed';
        })
        .finally(() => {
          verifyLoading.value = false;
        });
    };

    const clearAllLogs = async () => {
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
    };

    const handleResetDatabase = async () => {
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
    };

    const confirmResetDb = () => {
      showResetDbDialog.value = false;
      handleResetDatabase();
    };

    // Lifecycle
    onMounted(loadSettings);

    return {
      // State
      dbPath,
      downloadBaseDir,
      civitaiToken,
      dbPathInput,
      downloadBaseDirInput,
      civitaiTokenInput,
      error,
      success,
      logFiles,
      logSuccess,
      logError,
      verifyResult,
      verifyLoading,
      dbPathSaveSuccess,
      dbPathSaveError,
      latestPublishedAt,
      resetDbSuccess,
      resetDbError,
      showResetDbDialog,
      
      // Methods
      saveSettings,
      saveDbPath,
      verifyDbPath,
      clearAllLogs,
      confirmResetDb
    };
  }
};
</script>

<style scoped>
.settings-page {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
  padding: 0 0 2rem 0;
}

.settings-sections {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

@media (max-width: 700px) {
  .settings-sections {
    max-width: 100vw;
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style> 