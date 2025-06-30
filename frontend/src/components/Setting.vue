<template>
  <div class="setting-page">
    <h1>Settings</h1>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else>
      <p><strong>DB Path:</strong> {{ dbPath }}</p>
      <p><strong>Download Base Dir:</strong> {{ downloadBaseDir }}</p>
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
    const error = ref('');

    onMounted(async () => {
      try {
        const settings = await apiService.fetchSettings();
        dbPath.value = settings.DB_PATH;
        downloadBaseDir.value = settings.DOWNLOAD_BASE_DIR;
      } catch (err) {
        error.value = err.message || 'Failed to load settings';
      }
    });

    return { dbPath, downloadBaseDir, error };
  }
};
</script>

<style scoped>
.setting-page {
  padding: 2rem;
}
</style> 