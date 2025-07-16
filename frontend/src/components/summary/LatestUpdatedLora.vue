<template>
  <div class="latest-checkpoints-container" id="lora">
    <div class="summary-section">
      <div class="section-header">
        <div class="header-content">
          <span class="header-icon">⏰</span>
          <div class="header-text">
            <h2 class="section-title">Recent Activity</h2>
            <p class="section-description">Recently updated LoRA</p>
          </div>
        </div>
      </div>
      <div class="section-content">
        <div v-if="loadingCheckpoints" class="loading-section">
          <div class="loading-content">
            <span class="loading-icon">⏳</span>
            <span class="loading-text">Loading latest updated LoRA...</span>
          </div>
        </div>
        <div v-else-if="checkpointsError" class="error-section">
          <div class="error-content">
            <span class="error-icon">❌</span>
            <h3 class="error-title">Error Loading LoRA</h3>
            <p class="error-message">{{ checkpointsError }}</p>
            <button @click="$emit('retry')" class="retry-btn">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">Retry</span>
            </button>
          </div>
        </div>
        <div v-else-if="latestCheckpoints && latestCheckpoints.length > 0">
          <table class="checkpoints-table">
            <thead>
              <tr>
                <th>Model / Version</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(cp, idx) in topLatestCheckpoints" :key="idx">
                <td>
                  <a :href="`/model/${cp.modelId}/${cp.modelVersionId}`" target="_blank" rel="noopener">
                    {{ cp.modelName }} / {{ cp.modelVersionName }}
                  </a>
                </td>
                <td>{{ formatRelativeTime(cp.last_updated) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="no-data-section">
          <div class="no-data-content">
            <span class="no-data-icon">📭</span>
            <h3 class="no-data-title">No Recent LoRA</h3>
            <p class="no-data-message">No recently updated LoRA found.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LatestUpdatedLora',
  props: {
    latestCheckpoints: Array,
    loadingCheckpoints: Boolean,
    checkpointsError: String
  },
  computed: {
    topLatestCheckpoints() {
      return this.latestCheckpoints.slice(0, 10);
    }
  },
  methods: {
    formatRelativeTime(dateString) {
      // Parse as UTC and convert to local time
      const utcDate = new Date(dateString + 'Z');
      const now = new Date();
      const diff = Math.floor((now - utcDate) / 1000); // in seconds
      if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
      if (diff < 2592000) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
      if (diff < 31536000) return `${Math.floor(diff / 2592000)} month${Math.floor(diff / 2592000) !== 1 ? 's' : ''} ago`;
      return `${Math.floor(diff / 31536000)} year${Math.floor(diff / 31536000) !== 1 ? 's' : ''} ago`;
    }
  }
};
</script>

<style scoped>
.latest-checkpoints-container {
  max-width: 1400px;
  margin: 32px auto 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.summary-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.section-header {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
}
.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.header-text {
  flex: 1;
}
.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #0c4a6e;
  letter-spacing: -0.025em;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.section-description {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
.section-content {
  padding: 32px;
}
.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.loading-icon {
  font-size: 2rem;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.loading-text {
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 500;
}
.error-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}
.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 400px;
}
.error-icon {
  font-size: 3rem;
  color: #ef4444;
}
.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.error-message {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
.retry-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}
.retry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}
.retry-btn:active {
  transform: translateY(0);
}
.btn-icon {
  font-size: 1rem;
}
.btn-text {
  font-weight: 600;
}
.checkpoints-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.checkpoints-table th, .checkpoints-table td {
  border: 1px solid #e2e8f0;
  padding: 16px 20px;
  text-align: left;
  transition: all 0.2s ease;
}
.checkpoints-table th {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  font-weight: 700;
  color: #0c4a6e;
  font-size: 1rem;
  letter-spacing: 0.025em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 10;
}
.checkpoints-table tr:nth-child(even) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}
.checkpoints-table tr:nth-child(odd) {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}
.checkpoints-table tr:hover {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  transform: scale(1.01);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1;
}
.checkpoints-table td a {
  color: #1e40af;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;
}
.checkpoints-table td a:hover {
  color: #1d4ed8;
  text-decoration: underline;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.checkpoints-table td:last-child {
  font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 500;
  color: #64748b;
  font-size: 0.875rem;
}
.no-data-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}
.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 400px;
}
.no-data-icon {
  font-size: 3rem;
  color: #94a3b8;
}
.no-data-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.no-data-message {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
</style> 