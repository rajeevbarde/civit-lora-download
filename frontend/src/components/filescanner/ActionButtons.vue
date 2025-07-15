<template>
  <div class="action-section">
    <div class="action-header">
      <h2 class="action-title">Scan, Register and Validate</h2>
      <div class="action-steps">
        <p class="step">1. Scan folders</p>
        <p class="step">2. Register LoRA</p>
        <p class="step">3. Validate registered files</p>
      </div>
    </div>
    
    <div class="action-buttons">
      <div class="button-group">
        <button 
          @click="handleScanClick" 
          :disabled="scanningUniqueLoras"
          class="action-btn primary-btn"
        >
          <span class="btn-icon">🔍</span>
          <span class="btn-text">{{ scanningUniqueLoras ? 'Scanning...' : 'Scan Folder' }}</span>
        </button>
        
        <div v-if="scanningUniqueLoras || scanTimer > 0" class="timer-display">
          <span class="timer-icon">⏱️</span>
          <span class="timer-text">{{ scanTimer.toFixed(2) }}s</span>
        </div>
      </div>
      
      <div class="button-group">
        <button 
          @click="handleValidateClick" 
          :disabled="validatingFiles"
          class="action-btn secondary-btn"
        >
          <span class="btn-icon">✅</span>
          <span class="btn-text">{{ validatingFiles ? 'Validating...' : 'Validate Files' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useTimer } from '@/composables/useTimer.js';

export default {
  name: 'ActionButtons',
  props: {
    scanningUniqueLoras: {
      type: Boolean,
      default: false
    },
    validatingFiles: {
      type: Boolean,
      default: false
    },
    hasSavedPaths: {
      type: Boolean,
      default: false
    }
  },
  emits: ['scan-click', 'validate-click'],
  setup() {
    const { timer: scanTimer, startTimer: startScanTimer, stopTimer: stopScanTimer } = useTimer();
    
    return {
      scanTimer,
      startScanTimer,
      stopScanTimer
    };
  },
  methods: {
    handleScanClick() {
      if (!this.hasSavedPaths) {
        this.$emit('scan-click', { error: 'No saved paths to scan. Please add some paths first.' });
        return;
      }
      
      if (this.scanningUniqueLoras) {
        return; // Already scanning
      }
      
      this.startScanTimer();
      this.$emit('scan-click');
    },
    
    handleValidateClick() {
      if (this.validatingFiles) {
        return; // Already validating
      }
      
      this.$emit('validate-click');
    },
    
    stopScanTimer() {
      this.stopScanTimer();
    }
  },
  watch: {
    scanningUniqueLoras(newVal, oldVal) {
      if (oldVal && !newVal) {
        // Scanning finished, stop timer
        this.stopScanTimer();
      }
    }
  }
};
</script>

<style scoped>
/* Enhanced Action Section Styles */
.action-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.action-header {
  text-align: center;
  margin-bottom: 2rem;
}

.action-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.action-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-icon {
  font-size: 1.2rem;
}

.btn-text {
  font-weight: 600;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.timer-icon {
  font-size: 1.1rem;
}

.timer-text {
  font-weight: 600;
  color: #667eea;
  font-size: 1rem;
}

.action-steps {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.step {
  font-size: 1rem;
  color: #495057;
  margin: 0;
  font-weight: 500;
  padding: 0.25rem 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .action-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .action-title {
    font-size: 1.5rem;
  }
  
  .action-subtitle {
    font-size: 1rem;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 1rem;
  }
  
  .button-group {
    justify-content: center;
  }
  
  .action-btn {
    min-width: 120px;
  }
}
</style> 