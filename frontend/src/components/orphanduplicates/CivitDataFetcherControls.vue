<template>
  <div class="controls-section">
    <div class="controls-header">
      <h2 class="controls-title">LoRA File Cleanup and Maintenance</h2>
      <p class="controls-subtitle">Resolve Orphan and Duplicate LoRAs</p>
    </div>
    
    <div class="controls-buttons">
      <div class="button-group">
        <button 
          @click="$emit('scan-orphan-files')" 
          :disabled="isScanning"
          class="control-btn primary-btn"
        >
          <span class="btn-icon">🔍</span>
          <span class="btn-text">{{ isScanning ? 'Scanning...' : 'Orphan Files' }}</span>
        </button>
        
        <div v-if="isScanning || scanTimer > 0" class="timer-display">
          <span class="timer-icon">⏱️</span>
          <span class="timer-text">{{ scanTimer.toFixed(2) }}s</span>
        </div>
      </div>
      
      <div class="button-group">
        <button 
          @click="$emit('scan-duplicate-issues')"
          :disabled="duplicateIssuesLoading"
          class="control-btn secondary-btn"
        >
          <span class="btn-icon">🔄</span>
          <span class="btn-text">{{ duplicateIssuesLoading ? 'Scanning...' : 'Duplicates' }}</span>
        </button>
        
        <div v-if="duplicateIssuesLoading || duplicateTimer > 0" class="timer-display">
          <span class="timer-icon">⏱️</span>
          <span class="timer-text">{{ duplicateTimer.toFixed(2) }}s</span>
        </div>
      </div>
      
      <div class="button-group">
        <button 
          @click="$emit('scan-bad-downloads')"
          :disabled="badDownloadsLoading"
          class="control-btn tertiary-btn"
        >
          <span class="btn-icon">⚠️</span>
          <span class="btn-text">{{ badDownloadsLoading ? 'Scanning...' : 'Bad Downloads' }}</span>
        </button>
        
        <div v-if="badDownloadsLoading || badDownloadsTimer > 0" class="timer-display">
          <span class="timer-icon">⏱️</span>
          <span class="timer-text">{{ badDownloadsTimer.toFixed(2) }}s</span>
        </div>
      </div>
    </div>
    
    <div v-if="isScanning" class="scan-progress">
      <div class="progress-indicator">
        <span class="progress-icon">🔄</span>
        <span class="progress-text">Scanning directories for files not found in database...</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CivitDataFetcherControls',
  props: {
    isScanning: {
      type: Boolean,
      default: false
    },
    scanTimer: {
      type: Number,
      default: 0
    },
    duplicateIssuesLoading: {
      type: Boolean,
      default: false
    },
    duplicateTimer: {
      type: Number,
      default: 0
    },
    badDownloadsLoading: {
      type: Boolean,
      default: false
    },
    badDownloadsTimer: {
      type: Number,
      default: 0
    }
  },
  emits: ['scan-orphan-files', 'scan-duplicate-issues', 'scan-bad-downloads']
}
</script>

<style scoped>
/* Enhanced Controls Section Styles */
.controls-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.controls-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.controls-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
}

.controls-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.controls-buttons {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.75rem;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.control-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.control-btn:hover::before {
  left: 100%;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.control-btn:active:not(:disabled) {
  transform: translateY(-1px);
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.primary-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.secondary-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.secondary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #e085e8 0%, #e54b5f 100%);
}

.secondary-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tertiary-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
}

.tertiary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff5252 0%, #e74c3c 100%);
}

.tertiary-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-icon {
  font-size: 1.3rem;
}

.btn-text {
  font-weight: 600;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  backdrop-filter: blur(10px);
}

.timer-icon {
  font-size: 1.2rem;
}

.timer-text {
  font-weight: 700;
  color: #667eea;
  font-size: 1.1rem;
}

.scan-progress {
  margin-top: 1.5rem;
  text-align: center;
}

.progress-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 1rem 1.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.progress-icon {
  font-size: 1.2rem;
  animation: spin 2s linear infinite;
}

.progress-text {
  font-weight: 500;
  color: #495057;
  font-size: 1rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 768px) {
  .controls-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .controls-title {
    font-size: 1.5rem;
  }
  
  .controls-subtitle {
    font-size: 1rem;
  }
  
  .controls-buttons {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .button-group {
    justify-content: center;
  }
  
  .control-btn {
    min-width: 160px;
    padding: 0.875rem 1.5rem;
  }
}
</style> 