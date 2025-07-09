<template>
  <div class="settings-card logs-section">
    <div class="settings-section-header">
      <span class="section-icon">📝</span>
      <div>
        <h3 class="section-title gradient-text">Log Files</h3>
        <p class="section-subtitle">Manage and clear your application logs</p>
      </div>
    </div>
    
    <div class="logs-actions">
      <button @click="$emit('clear-logs')" class="settings-btn clear-logs-btn">
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">Clear All Logs</span>
      </button>
      <button class="settings-btn reset-db-btn" @click="$emit('show-reset-dialog')">
        <span class="btn-icon">♻️</span>
        <span class="btn-text">UnRegister All LoRAs</span>
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
          <button class="modal-btn yes" @click="$emit('confirm-reset')">YES</button>
          <button class="modal-btn cancel" @click="$emit('close-reset-dialog')">CANCEL</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LogsManagementSection',
  props: {
    logFiles: {
      type: Array,
      default: () => []
    },
    logSuccess: {
      type: Boolean,
      default: false
    },
    logError: {
      type: String,
      default: ''
    },
    resetDbSuccess: {
      type: Boolean,
      default: false
    },
    resetDbError: {
      type: String,
      default: ''
    },
    showResetDbDialog: {
      type: Boolean,
      default: false
    }
  },
  emits: ['clear-logs', 'show-reset-dialog', 'confirm-reset', 'close-reset-dialog'],
  methods: {
    formatFileSize(size) {
      if (size >= 1024 * 1024) {
        return (size / (1024 * 1024)).toFixed(2) + ' MB';
      } else if (size >= 1024) {
        return (size / 1024).toFixed(2) + ' KB';
      } else {
        return size + ' B';
      }
    }
  }
};
</script>

<style scoped>
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

.state-icon {
  font-size: 1.3rem;
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

@media (max-width: 700px) {
  .settings-card {
    padding: 1.2rem 1rem;
  }
  
  .logs-actions {
    flex-direction: column;
  }
}
</style> 