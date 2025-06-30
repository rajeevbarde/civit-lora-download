<template>
  <div v-if="downloadingModels.length > 0" class="download-status">
    <div class="status-info">
      <span>🔄 {{ downloadingModels.length }} download(s) in progress</span>
      <button @click="toggleStatusVisibility" class="btn-status-check">
        {{ isStatusVisible ? 'Hide Status' : 'Show Status' }}
      </button>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { NOTIFICATION_TYPES } from '@/utils/constants.js';

export default {
  name: 'DownloadStatus',
  props: {
    downloadingModels: {
      type: Array,
      default: () => []
    },
    isStatusVisible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['status-toggle', 'notification'],
  methods: {
    async toggleStatusVisibility() {
      const newStatus = !this.isStatusVisible;
      this.$emit('status-toggle', newStatus);
      
      if (newStatus) {
        await this.checkDownloadStatus();
      }
    },
    
    async checkDownloadStatus() {
      try {
        const response = await apiService.getDownloadStatus();
        
        // Show queue status to user
        const { active, queued, maxConcurrent } = response;
        let statusMessage = '';
        
        if (active > 0) {
          statusMessage += `🔄 ${active} download(s) currently active`;
        }
        
        if (queued > 0) {
          statusMessage += statusMessage ? ` | ` : '';
          statusMessage += `⏳ ${queued} download(s) waiting in queue`;
        }
        
        if (active === 0 && queued === 0) {
          statusMessage = '✅ No downloads in progress';
        }
        
        this.$emit('notification', statusMessage, NOTIFICATION_TYPES.INFO);
        
        // Also show current downloading models
        if (this.downloadingModels.length > 0) {
          const downloadingList = this.downloadingModels.map(item => item.fileName).join(', ');
          this.$emit('notification', `📋 Currently tracking: ${downloadingList}`, NOTIFICATION_TYPES.INFO);
        }
        
      } catch (error) {
        console.error('Failed to check download status:', error);
        this.$emit('notification', '❌ Failed to check download status', NOTIFICATION_TYPES.ERROR);
      }
    }
  }
};
</script>

<style scoped>
.download-status {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.status-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-status-check {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.btn-status-check:hover {
  background-color: #0056b3;
}
</style> 