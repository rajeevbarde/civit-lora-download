<template>
  <div class="settings-card">
    <div class="settings-section-header">
      <span class="section-icon">🗄️</span>
      <div>
        <h3 class="section-title gradient-text">Database Path</h3>
        <p class="section-subtitle">Set and verify your SQLite database file</p>
      </div>
    </div>
    <div class="settings-section-content">
      <div class="input-row">
        <input 
          id="dbPath" 
          :value="dbPathInput" 
          type="text" 
          @input="onDbPathInput" 
          class="settings-input" 
          placeholder="Enter database file path" 
        />
        <button type="button" class="settings-btn verify-btn" @click="$emit('verify')">
          <span class="btn-icon">🔍</span>
          <span class="btn-text">Verify</span>
        </button>
      </div>
      
      <div v-if="latestPublishedAt" class="latest-published-at">
        <span class="published-icon">📅</span>
        Data is latest up to: {{ new Date(latestPublishedAt).toLocaleString() }}
      </div>
      
      <div v-if="verifyLoading" class="state-row loading-row">
        <span class="state-icon">⏳</span>
        <span>Verifying database...</span>
      </div>
      
              <div v-if="verifyResult" class="verify-result">
          <ul class="verify-list">
            <li><b>File Exists:</b> <span :class="verifyResult.fileExists ? 'ok' : 'fail'">{{ verifyResult.fileExists ? 'Yes' : 'No' }}</span></li>
            <li><b>Table Exists:</b> <span :class="verifyResult.tableExists ? 'ok' : 'fail'">{{ verifyResult.tableExists ? 'Yes' : 'No' }}</span></li>
            <li><b>Columns:</b>
              <span :class="verifyResult.columnResults && verifyResult.columnResults.length > 0 && verifyResult.columnResults.every(col => col.exists) ? 'ok' : 'fail'">
                {{ verifyResult.columnResults && verifyResult.columnResults.length > 0 && verifyResult.columnResults.every(col => col.exists) ? 'Yes' : 'No' }}
              </span>
              <div v-if="verifyResult.columnResults && verifyResult.columnResults.length > 0" class="column-details">
                <div v-for="col in verifyResult.columnResults" :key="col.column" class="column-item">
                  <span :class="col.exists ? 'ok' : 'fail'">{{ col.exists ? '✓' : '✗' }}</span>
                  <span class="column-name">{{ col.column }}</span>
                </div>
              </div>
            </li>
            <li><b>Indexes:</b>
              <span :class="verifyResult.indexResults && verifyResult.indexResults.length > 0 && verifyResult.indexResults.every(idx => idx.exists && idx.match !== false) ? 'ok' : 'fail'">
                {{ verifyResult.indexResults && verifyResult.indexResults.length > 0 && verifyResult.indexResults.every(idx => idx.exists && idx.match !== false) ? 'Yes' : 'No' }}
              </span>
            </li>
          </ul>
        
        <div v-if="verifyResult.errors && verifyResult.errors.length" class="state-row error-row">
          <span class="state-icon">⚠️</span>
          <b>Errors:</b>
          <ul>
            <li v-for="err in verifyResult.errors" :key="err">{{ err }}</li>
          </ul>
        </div>
        
        <div class="verify-actions">
          <button
            v-if="verifyResult.fileExists && verifyResult.tableExists && verifyResult.columnResults.every(col => col.exists) && verifyResult.indexResults.every(idx => idx.exists && idx.match !== false)"
            type="button"
            class="settings-btn save-btn"
            @click="$emit('save')"
            :disabled="dbPathInput === dbPath"
          >
            <span class="btn-icon">💾</span>
            <span class="btn-text">Save DB Path</span>
          </button>
          
          <span v-if="dbPathSaveSuccess" class="state-row success-row">
            <span class="state-icon">✅</span>
            DB path saved! <span class="restart-msg">Please restart the application for changes to take effect.</span>
          </span>
          
          <span v-if="dbPathSaveError" class="state-row error-row">
            <span class="state-icon">❌</span>
            {{ dbPathSaveError }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DatabasePathSection',
  props: {
    dbPath: {
      type: String,
      default: ''
    },
    dbPathInput: {
      type: String,
      default: ''
    },
    verifyResult: {
      type: Object,
      default: null
    },
    verifyLoading: {
      type: Boolean,
      default: false
    },
    latestPublishedAt: {
      type: String,
      default: null
    },
    dbPathSaveSuccess: {
      type: Boolean,
      default: false
    },
    dbPathSaveError: {
      type: String,
      default: ''
    }
  },
  emits: ['update:dbPathInput', 'verify', 'save'],
  methods: {
    onDbPathInput(event) {
      this.$emit('update:dbPathInput', event.target.value);
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

.settings-section-content {
  margin-bottom: 0.5rem;
}

.input-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.settings-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1.1rem;
  background: #f8fafc;
  color: #495057;
  transition: all 0.3s ease;
}

.settings-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: #fff;
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

.verify-btn {
  background: linear-gradient(135deg, #fbbf24 0%, #f472b6 100%);
  color: #22223b;
}

.verify-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #f59e42 0%, #ec4899 100%);
}

.save-btn {
  margin-top: 0.5rem;
}

.latest-published-at {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
  padding: 0.75rem;
  background: #f0f9ff;
  border-radius: 8px;
  color: #0369a1;
  font-size: 1rem;
}

.published-icon {
  font-size: 1.2rem;
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

.loading-row {
  color: #6366f1;
}

.state-icon {
  font-size: 1.3rem;
}

.ok {
  color: #059669;
  font-weight: 600;
}

.fail {
  color: #e11d48;
  font-weight: 600;
}

.verify-list {
  margin: 0 0 0.5rem 0;
  padding: 0 0 0 1.2rem;
  font-size: 1.05rem;
}

.column-details {
  margin-top: 0.5rem;
  margin-left: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0.5rem;
  background: #f8f9fa;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.column-name {
  font-family: monospace;
  color: #495057;
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