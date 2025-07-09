<template>
  <div class="download-btn-section">
    <button
      v-if="showDownloadButton"
      @click="$emit('download')"
      :disabled="downloading"
      class="download-btn"
    >
      <LoadingSpinner v-if="downloading" :loading="true" message="" size="small" class="spinner" />
      <span v-if="downloading" class="downloading-text">Downloading...</span>
      <span v-else>Download</span>
    </button>
    
    <button
      v-if="showIgnoreButton"
      @click="$emit('ignore')"
      :disabled="downloading"
      class="ignore-btn"
    >
      <span>Ignore</span>
    </button>
    
    <button
      v-else-if="showRetryButton"
      @click="$emit('download')"
      :disabled="downloading"
      class="retry-btn"
    >
      <LoadingSpinner v-if="downloading" :loading="true" message="" size="small" class="spinner" />
      <span v-if="downloading" class="downloading-text">Retrying...</span>
      <span v-else>Retry</span>
    </button>
    
    <span v-else-if="showDownloadedStatus" class="status-downloaded">Downloaded</span>
    <span v-else-if="showIgnoredStatus" class="status-ignored">Ignored</span>
  </div>
</template>

<script>
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

export default {
  name: 'DownloadActions',
  components: { LoadingSpinner },
  props: {
    model: {
      type: Object,
      required: true
    },
    downloading: {
      type: Boolean,
      default: false
    },
    downloadStatus: {
      type: Object,
      required: true
    }
  },
  emits: ['download', 'ignore', 'update:downloading'],
  computed: {
    showDownloadButton() {
      return this.model.fileDownloadUrl && 
             this.model.isDownloaded !== this.downloadStatus.DOWNLOADED && 
             this.model.isDownloaded !== this.downloadStatus.DOWNLOADING && 
             this.model.isDownloaded !== this.downloadStatus.FAILED;
    },
    showIgnoreButton() {
      return this.model.fileDownloadUrl && 
             this.model.isDownloaded !== this.downloadStatus.DOWNLOADED && 
             this.model.isDownloaded !== this.downloadStatus.DOWNLOADING && 
             this.model.isDownloaded !== this.downloadStatus.FAILED && 
             this.model.isDownloaded !== this.downloadStatus.IGNORED;
    },
    showRetryButton() {
      return this.model.fileDownloadUrl && 
             this.model.isDownloaded === this.downloadStatus.FAILED;
    },
    showDownloadedStatus() {
      return this.model.isDownloaded === this.downloadStatus.DOWNLOADED || 
             this.model.isDownloaded === this.downloadStatus.DOWNLOADING;
    },
    showIgnoredStatus() {
      return this.model.isDownloaded === this.downloadStatus.IGNORED;
    }
  }
};
</script>

<style scoped>
.download-btn-section {
  text-align: center;
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
  position: relative;
  min-width: 140px;
}

.download-btn:disabled, .retry-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.retry-btn {
  background-color: #ffc107;
  color: #212529;
}

.spinner {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.downloading-text {
  margin-left: 28px;
}

.status-downloaded {
  font-size: 1rem;
  color: #28a745;
  font-weight: 600;
}

.ignore-btn {
  background: #ffe5b2;
  color: #b85c00;
  border: 1px solid #ffb84d;
  border-radius: 4px;
  padding: 6px 18px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  min-width: 100px;
  margin-left: 10px;
}

.ignore-btn:hover {
  background: #ffd699;
  color: #a04a00;
}

.status-ignored {
  color: #b85c00;
  font-weight: 600;
  margin-left: 10px;
}
</style> 