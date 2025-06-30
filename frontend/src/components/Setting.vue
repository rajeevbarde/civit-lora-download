<template>
  <div class="setting-page">
    <h1>Settings</h1>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else>
      <form @submit.prevent="saveSettings">
        <div class="form-group">
          <label for="dbPath">DB Path:</label>
          <input id="dbPath" v-model="dbPathInput" type="text" />
        </div>
        <div class="form-group">
          <label for="downloadBaseDir">Download Base Dir:</label>
          <input id="downloadBaseDir" v-model="downloadBaseDirInput" type="text" />
        </div>
        <button type="submit">Save</button>
      </form>
      <div v-if="success" class="success">
        Settings updated!<br />
        <span class="restart-msg">Please restart the application for changes to take effect.</span>
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
    const dbPathInput = ref('');
    const downloadBaseDirInput = ref('');
    const error = ref('');
    const success = ref(false);

    async function loadSettings() {
      try {
        const settings = await apiService.fetchSettings();
        dbPath.value = settings.DB_PATH;
        downloadBaseDir.value = settings.DOWNLOAD_BASE_DIR;
        dbPathInput.value = settings.DB_PATH;
        downloadBaseDirInput.value = settings.DOWNLOAD_BASE_DIR;
      } catch (err) {
        error.value = err.message || 'Failed to load settings';
      }
    }

    async function saveSettings() {
      try {
        await apiService.updateSettings({
          DB_PATH: dbPathInput.value,
          DOWNLOAD_BASE_DIR: downloadBaseDirInput.value
        });
        success.value = true;
        error.value = '';
        dbPath.value = dbPathInput.value;
        downloadBaseDir.value = downloadBaseDirInput.value;
      } catch (err) {
        error.value = err.message || 'Failed to update settings';
        success.value = false;
      }
    }

    onMounted(loadSettings);

    return { dbPath, downloadBaseDir, dbPathInput, downloadBaseDirInput, error, success, saveSettings };
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
</style> 