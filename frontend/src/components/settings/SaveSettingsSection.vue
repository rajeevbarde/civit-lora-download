<template>
  <div class="settings-card save-section">
    <button type="button" class="settings-btn save-btn" @click="$emit('save')">
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
</template>

<script>
export default {
  name: 'SaveSettingsSection',
  props: {
    success: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    verifyLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['save']
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

.save-btn {
  margin-top: 0.5rem;
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

.restart-msg {
  color: #b7791f;
  font-size: 1rem;
  display: block;
  margin-top: 0.5rem;
}

@media (max-width: 700px) {
  .settings-card {
    padding: 1.2rem 1rem;
  }
}
</style> 