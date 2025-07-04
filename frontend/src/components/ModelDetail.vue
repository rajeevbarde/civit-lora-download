<template>
  <div class="app-container">
    <!-- Enhanced Header Section -->
    <div class="header-section">
      <h1 class="page-title">Model Version Details</h1>
      <p class="page-subtitle">View detailed information about your selected model version</p>
    </div>

    <!-- Download Button Section -->
    <div v-if="model" class="download-btn-section" style="text-align:center; margin-bottom: 1.5rem;">
      <button
        v-if="model.fileDownloadUrl && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADED && model.isDownloaded !== DOWNLOAD_STATUS.DOWNLOADING && model.isDownloaded !== DOWNLOAD_STATUS.FAILED"
        @click="downloadModelFile"
        :disabled="downloading"
        class="download-btn"
        style="position:relative; min-width:140px;"
      >
        <LoadingSpinner v-if="downloading" :loading="true" message="" size="small" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);" />
        <span v-if="downloading" style="margin-left:28px;">Downloading...</span>
        <span v-else>Download</span>
      </button>
      <button
        v-else-if="model.fileDownloadUrl && model.isDownloaded === DOWNLOAD_STATUS.FAILED"
        @click="downloadModelFile"
        :disabled="downloading"
        class="retry-btn"
        style="position:relative; min-width:140px;"
      >
        <LoadingSpinner v-if="downloading" :loading="true" message="" size="small" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);" />
        <span v-if="downloading" style="margin-left:28px;">Retrying...</span>
        <span v-else>Retry</span>
      </button>
      <span v-else-if="model.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED || model.isDownloaded === DOWNLOAD_STATUS.DOWNLOADING" class="status-downloaded" style="font-weight:600; color:#28a745;">Downloaded</span>
    </div>

    <!-- Related LoRA Table -->
    <div v-if="relatedLora.length > 0" class="related-lora-section">
      <h3 class="related-lora-title">Related LoRA</h3>
      <table class="related-lora-table">
        <thead>
          <tr>
            <th>Model Name / Version</th>
            <th>Base Model</th>
            <th>Published Date</th>
            <th>Download State</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in relatedLora" :key="item.modelId + '-' + item.modelVersionId">
            <td>
              <template v-if="item.modelVersionId === model.modelVersionId">
                <span class="current-lora-name">{{ item.modelName }} / {{ item.modelVersionName }}</span>
                <span class="current-lora-label">&nbsp;(Current)</span>
              </template>
              <template v-else>
                <a :href="`/model/${item.modelId}/${item.modelVersionId}`" target="_blank" rel="noopener noreferrer">
                  {{ item.modelName }} / {{ item.modelVersionName }}
                </a>
              </template>
            </td>
            <td>{{ item.basemodel }}</td>
            <td>
              <span class="published-date-group">
                <span class="published-date">{{ formatDate(item.publishedAt) }}</span>
                <span v-if="item.modelVersionId === model.modelVersionId" class="current-lora-label">&nbsp;(Current)</span>
                <span v-else class="relative-age-label">&nbsp;{{ getRelativeAge(item.publishedAt) }}</span>
              </span>
            </td>
            <td>
              <span v-if="item.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED" style="color:#28a745;font-weight:600;">Downloaded</span>
              <span v-else-if="item.isDownloaded === DOWNLOAD_STATUS.DOWNLOADING" style="color:#007bff;font-weight:600;">Downloading</span>
              <span v-else-if="item.isDownloaded === DOWNLOAD_STATUS.FAILED" style="color:#dc3545;font-weight:600;">Failed</span>
              <span v-else style="color:#6c757d;font-weight:600;">Not Downloaded</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Notification System -->
    <NotificationSystem ref="notificationSystem" />

    <!-- Enhanced CivitAI Link Section -->
    <div v-if="model && model.modelId && model.modelVersionId" class="civitai-link-section">
      <div class="link-header">
        <span class="link-icon">🔗</span>
        <span class="link-label">View on CivitAI</span>
      </div>
      <a
        :href="`${civitaiBaseUrl}/models/${model.modelId}?modelVersionId=${model.modelVersionId}`"
        target="_blank"
        rel="noopener noreferrer"
        class="civitai-link"
      >
        <span class="link-text">civitai.com/models/{{ model.modelId }}?modelVersionId={{ model.modelVersionId }}</span>
        <span class="external-icon">↗️</span>
      </a>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-section">
      <div class="loading-content">
        <span class="loading-icon">⏳</span>
        <span class="loading-text">Loading model details...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-section">
      <div class="error-content">
        <span class="error-icon">❌</span>
        <h3 class="error-title">Error Loading Model</h3>
        <p class="error-message">{{ error }}</p>
      </div>
    </div>

    <!-- Model Details Section -->
    <div v-else class="model-details-section">
      <div class="details-header">
        <h2 class="details-title">Model Information</h2>
        <p class="details-subtitle">Complete details for this model version</p>
      </div>
      
      <div class="details-table-container">
        <table class="details-table">
          <thead>
            <tr>
              <th class="field-header">Field</th>
              <th class="value-header">Value</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loop through all model properties -->
            <tr v-for="(value, key) in model" :key="key" class="detail-row">
              <td class="field-cell">{{ key }}</td>
              <td class="value-cell">
                <div v-if="typeof value === 'string' && value.includes('<')" class="html-content">
                  <div v-html="value"></div>
                </div>
                <div v-else class="text-content">{{ value }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>


<script>
import { useRoute } from 'vue-router';
import { apiService } from '@/utils/api.js';
import { API_CONFIG, DOWNLOAD_STATUS } from '@/utils/constants.js';
import NotificationSystem from '@/components/common/NotificationSystem.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { formatDate } from '@/utils/helpers.js';

export default {
  components: { NotificationSystem, LoadingSpinner },
  setup() {
    const route = useRoute();
    return { route };
  },
  data() {
    return {
      model: null,
      loading: false,
      error: null,
      civitaiBaseUrl: API_CONFIG.CIVITAI_BASE_URL.replace('/api/v1', ''),
      downloading: false,
      DOWNLOAD_STATUS,
      pollingInterval: null,
      pollCount: 0,
      maxPolls: 300, // 10 minutes at 2s interval
      relatedLora: []
    };
  },
  mounted() {
    this.fetchModelDetails();
    this.fetchRelatedLora();
  },
  beforeUnmount() {
    this.stopPolling();
  },
  methods: {
    async fetchModelDetails() {
      try {
        this.loading = true;
        this.error = null;
        const modelVersionId = Number(this.route.params.modelVersionId);
        const urlModelId = Number(this.route.params.modelId);
        if (isNaN(modelVersionId)) throw new Error("Invalid model version ID");
        if (isNaN(urlModelId)) throw new Error("Invalid model ID");
        const response = await apiService.getModelDetail(modelVersionId);
        this.model = response;
        if (this.model && this.model.modelId !== urlModelId) {
          throw new Error(`URL model ID (${urlModelId}) does not match backend model ID (${this.model.modelId})`);
        }
      } catch (err) {
        console.error(err);
        this.error = err.message || "Failed to load model details.";
      } finally {
        this.loading = false;
      }
    },
    showNotification(message, type = 'info') {
      if (this.$refs.notificationSystem && this.$refs.notificationSystem.showNotification) {
        this.$refs.notificationSystem.showNotification(message, type);
      }
    },
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
    startPollingForStatus() {
      this.stopPolling();
      this.pollCount = 0;
      this.pollingInterval = setInterval(async () => {
        this.pollCount++;
        if (!this.model || !this.model.modelVersionId) {
          this.stopPolling();
          return;
        }
        try {
          const response = await apiService.getModelDetail(this.model.modelVersionId);
          if (response) {
            this.model = { ...response };
            if (response.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED) {
              this.showNotification('Download completed: ' + (response.fileName || ''), 'success');
              this.downloading = false;
              this.stopPolling();
            } else if (response.isDownloaded === DOWNLOAD_STATUS.FAILED) {
              this.showNotification('Download failed: ' + (response.fileName || ''), 'error');
              this.downloading = false;
              this.stopPolling();
            }
          }
        } catch (err) {
          // Optionally handle polling errors
        }
        if (this.pollCount >= this.maxPolls) {
          this.showNotification('Download status polling timed out.', 'warning');
          this.downloading = false;
          this.stopPolling();
        }
      }, 2000);
    },
    async downloadModelFile() {
      if (!this.model || !this.model.fileDownloadUrl) return;
      this.downloading = true;
      this.error = null;
      try {
        const payload = {
          url: this.model.fileDownloadUrl,
          fileName: this.model.fileName,
          baseModel: this.model.basemodel,
          modelVersionId: this.model.modelVersionId
        };
        const response = await apiService.downloadModelFile(payload);
        if (response && response.success) {
          this.showNotification('Download started: ' + (this.model.fileName || ''), 'info');
          this.startPollingForStatus();
        } else {
          this.showNotification('Failed to start download: ' + (this.model.fileName || ''), 'error');
          this.downloading = false;
        }
        // Optionally, refresh model details immediately
        await this.fetchModelDetails();
      } catch (err) {
        this.error = err.message || 'Download failed.';
        this.showNotification('Download failed: ' + (this.model.fileName || ''), 'error');
        this.downloading = false;
      }
    },
    async fetchRelatedLora() {
      try {
        const modelId = Number(this.route.params.modelId);
        if (isNaN(modelId)) return;
        const result = await apiService.getRelatedLoraByModelId(modelId);
        this.relatedLora = Array.isArray(result) ? result : [];
      } catch (err) {
        this.relatedLora = [];
      }
    },
    formatDate,
    getRelativeAge(publishedAt) {
      if (!this.model || !this.model.publishedAt || !publishedAt) return '';
      const current = new Date(this.model.publishedAt);
      const other = new Date(publishedAt);
      const diffMs = other - current;
      if (Math.abs(diffMs) < 1000 * 60) return 'Just now';
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);
      if (diffYear !== 0) return Math.abs(diffYear) + ' year' + (Math.abs(diffYear) > 1 ? 's' : '') + (diffYear > 0 ? ' newer' : ' older');
      if (diffMonth !== 0) return Math.abs(diffMonth) + ' month' + (Math.abs(diffMonth) > 1 ? 's' : '') + (diffMonth > 0 ? ' newer' : ' older');
      if (diffDay !== 0) return Math.abs(diffDay) + ' day' + (Math.abs(diffDay) > 1 ? 's' : '') + (diffDay > 0 ? ' newer' : ' older');
      if (diffHr !== 0) return Math.abs(diffHr) + ' hour' + (Math.abs(diffHr) > 1 ? 's' : '') + (diffHr > 0 ? ' newer' : ' older');
      if (diffMin !== 0) return Math.abs(diffMin) + ' min' + (Math.abs(diffMin) > 1 ? 's' : '') + (diffMin > 0 ? ' newer' : ' older');
      return '';
    },
  },
};
</script>


<style scoped>
/* Enhanced Header Section Styles */
.header-section {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 0;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #2c3e50;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.2rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Enhanced CivitAI Link Section */
.civitai-link-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.link-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.link-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.link-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.civitai-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.9);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  color: #667eea;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.civitai-link:hover {
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  color: #5a6fd8;
}

.link-text {
  font-family: 'Courier New', monospace;
  font-size: 1rem;
}

.external-icon {
  font-size: 1.2rem;
  margin-left: 0.5rem;
}

/* Loading State */
.loading-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 3rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
  text-align: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-icon {
  font-size: 3rem;
  animation: spin 2s linear infinite;
}

.loading-text {
  font-size: 1.2rem;
  color: #6c757d;
  font-weight: 500;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Error State */
.error-section {
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #feb2b2;
  text-align: center;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-icon {
  font-size: 3rem;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #c53030;
  margin: 0;
}

.error-message {
  font-size: 1rem;
  color: #742a2a;
  margin: 0;
  line-height: 1.5;
}

/* Model Details Section */
.model-details-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.details-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.details-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
}

.details-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.details-table-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
  overflow-x: auto;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.field-header,
.value-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 1rem;
}

.field-header {
  width: 30%;
  min-width: 150px;
}

.value-header {
  width: 70%;
}

.detail-row {
  transition: all 0.3s ease;
}

.detail-row:hover {
  background: #f8f9fa;
  transform: translateX(4px);
}

.field-cell {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
  color: #2c3e50;
  background: #f8f9fa;
  font-size: 0.95rem;
  text-transform: capitalize;
}

.value-cell {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
  font-size: 0.95rem;
  line-height: 1.5;
}

.text-content {
  word-break: break-word;
}

.html-content {
  word-break: break-word;
}

.html-content :deep(a) {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.html-content :deep(a):hover {
  text-decoration: underline;
}

/* Responsive design */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1.1rem;
  }
  
  .model-details-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .details-title {
    font-size: 1.5rem;
  }
  
  .details-subtitle {
    font-size: 1rem;
  }
  
  .details-table-container {
    padding: 1rem;
  }
  
  .field-header,
  .value-header,
  .field-cell,
  .value-cell {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  
  .civitai-link {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .external-icon {
    align-self: flex-end;
  }
}

/* Base container styles */
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.download-btn-section {
  margin-bottom: 1.5rem;
}
.download-btn, .retry-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin: 0 8px;
}
.download-btn:disabled, .retry-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
.retry-btn {
  background-color: #ffc107;
  color: #212529;
}
.status-downloaded {
  font-size: 1rem;
  color: #28a745;
  font-weight: 600;
}

.related-lora-section {
  margin: 2rem auto 0 auto;
  max-width: 900px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 1.5rem 2rem 2rem 2rem;
}
.related-lora-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #2c3e50;
}
.related-lora-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}
.related-lora-table th, .related-lora-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e9ecef;
  text-align: left;
}
.related-lora-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
}
.related-lora-table tr:last-child td {
  border-bottom: none;
}
.related-lora-table a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}
.related-lora-table a:hover {
  text-decoration: underline;
}
.related-lora-table td .current-lora-label,
.related-lora-table td span[style*='font-weight:700'][style*='#764ba2'] {
  background: #e6f4ea;
  color: #17643a !important;
  border-radius: 4px;
  padding: 2px 8px;
  font-weight: 700;
  font-size: 1em;
  margin-left: 8px;
}
.related-lora-table td .relative-age-label {
  color: #17643a;
  font-weight: 700;
  font-size: 1.08em;
  margin-left: 10px;
}
.related-lora-table td .published-date {
  color: #888;
  font-size: 0.97em;
  font-weight: 400;
}

.published-date-group {
  white-space: nowrap;
  display: inline-block;
}

.current-lora-name {
  color: #17643a;
  font-weight: 700;
}
</style>
