<template>
  <div v-if="uniqueLorasResults || orphanFiles.length" class="unique-loras-container">
    <div class="unique-loras-summary" v-if="uniqueLorasResults && uniqueLorasResults.stats">
      <p><strong>Total LoRA files on disk:</strong> {{ uniqueLorasResults.stats.totalDiskFiles }}</p>
    </div>
    
    <!-- Tab Navigation -->
    <div class="unique-tab-navigation">
      <button 
        v-for="tab in uniqueTabsWithOrphan" 
        :key="tab.key"
        @click="activeUniqueTab = tab.key"
        :class="['unique-tab-button', { active: activeUniqueTab === tab.key }]"
      >
        {{ tab.label }} ({{ getUniqueTabCount(tab.key) }})
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="unique-tab-content">
      <div v-for="tab in uniqueTabsWithOrphan" :key="tab.key" v-show="activeUniqueTab === tab.key" class="unique-tab-panel">
        <!-- Tab Description -->
        <template v-if="tab.key === 'unique-downloaded'">
          <div class="tab-description">
            LoRA files are registered with local Civitai database. They do not have duplicate issues.
          </div>
        </template>
        <template v-else-if="tab.key === 'unique-not-downloaded'">
          <div class="tab-description">
            LoRA files are present in your harddrive but not registered with local Civitai database. They do not have duplicate issues.
          </div>
        </template>
        <template v-else-if="tab.key === 'duplicate-issues'">
          <div class="tab-description with-link">
            <span>Wierd duplicate Issues</span>
            <router-link to="/civit-data-fetcher" class="fix-link">
              <span class="fix-icon">🔧</span>
              <span class="fix-text">Fix it</span>
            </router-link>
          </div>
        </template>
        <template v-else-if="tab.key === 'orphan'">
          <div class="tab-description with-link">
            <span>LoRA files present in harddrive but does not exist in Civitai database.</span>
            <router-link to="/civit-data-fetcher" class="fix-link">
              <span class="fix-icon">🔧</span>
              <span class="fix-text">Fix it</span>
            </router-link>
          </div>
        </template>
        
        <!-- Register Button for unregistered files -->
        <div v-if="tab.key === 'unique-not-downloaded' && getUniqueTabFiles(tab.key).length" class="register-section">
          <button class="register-btn" @click="handleRegister" :disabled="registering">
            Register
          </button>
          <span v-if="registering || registerTimer > 0" class="register-timer">
            {{ registerTimer.toFixed(2) }}s elapsed
            <span v-if="registerPredictedSeconds > 0">{{ formatPrediction() }}</span>
          </span>
          <div v-if="registerResult" class="register-result">
            <span v-if="registerResult.updated > 0">{{ registerResult.updated }} file(s) registered successfully.</span>
            <span v-if="registerResult.errors && registerResult.errors.length > 0" class="register-error">
              {{ registerResult.errors.length }} error(s) occurred.
            </span>
          </div>
        </div>
        
        <!-- No Files Message -->
        <div v-if="getUniqueTabFiles(tab.key).length === 0" class="no-unique-files">
          No {{ tab.label.toLowerCase() }} files found.
        </div>
        
        <!-- Files Table -->
        <table v-else class="unique-loras-table">
          <thead>
            <tr>
              <th v-if="tab.key === 'unique-downloaded' || tab.key === 'unique-not-downloaded'">Full path in harddrive</th>
              <th v-else>Full Path</th>
              <th v-if="tab.key === 'unique-downloaded' || tab.key === 'unique-not-downloaded'">File name in db</th>
              <th v-else-if="tab.key === 'duplicate-issues'">File name</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(file, idx) in getUniqueTabFiles(tab.key)" :key="file.fullPath + idx">
              <td v-if="tab.key === 'unique-downloaded' || tab.key === 'unique-not-downloaded'">{{ file.fullPath }}</td>
              <td v-else>{{ file.fullPath }}</td>
              <td v-if="tab.key === 'unique-downloaded' || tab.key === 'unique-not-downloaded'">{{ file.baseName }}</td>
              <td v-else-if="tab.key === 'duplicate-issues'">{{ file.baseName }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { useTimer } from '@/composables/useTimer.js';

export default {
  name: 'UniqueLorasResults',
  props: {
    uniqueLorasResults: {
      type: Object,
      default: null
    },
    orphanFiles: {
      type: Array,
      default: () => []
    },
    registering: {
      type: Boolean,
      default: false
    },
    registerResult: {
      type: Object,
      default: null
    },
    registerTimer: {
      type: Number,
      default: 0
    }
  },
  emits: ['register-click'],
  setup() {
    const { 
      predictedSeconds: registerPredictedSeconds,
      setPrediction,
      formatPrediction: formatPredictionFn
    } = useTimer();
    
    return {
      registerPredictedSeconds,
      setPrediction,
      formatPrediction: formatPredictionFn
    };
  },
  data() {
    return {
      activeUniqueTab: 'unique-downloaded',
      uniqueTabs: [
        { key: 'unique-downloaded', label: 'LoRA Registered with local Civitai database' },
        { key: 'unique-not-downloaded', label: 'LoRA not Registered' },
        { key: 'duplicate-issues', label: 'Duplicate Issues' }
      ]
    };
  },
  computed: {
    uniqueTabsWithOrphan() {
      return [
        ...this.uniqueTabs,
        { key: 'orphan', label: 'Orphan Files' }
      ];
    }
  },
  methods: {
    getUniqueTabFiles(tabKey) {
      if (!this.uniqueLorasResults || !this.uniqueLorasResults.uniqueFiles) {
        if (tabKey === 'orphan') {
          return this.orphanFiles;
        }
        return [];
      }
      if (tabKey === 'orphan') {
        return this.orphanFiles;
      }
      return this.uniqueLorasResults.uniqueFiles.filter(file => {
        switch (tabKey) {
          case 'unique-downloaded':
            return file.status === 'Unique' && file.isDownloaded === 1;
          case 'unique-not-downloaded':
            return file.status === 'Unique' && file.isDownloaded === 0;
          case 'duplicate-issues':
            return file.status !== 'Unique';
          default:
            return false;
        }
      });
    },
    
    getUniqueTabCount(tabKey) {
      return this.getUniqueTabFiles(tabKey).length;
    },
    
    handleRegister() {
      const files = this.getUniqueTabFiles('unique-not-downloaded');
      this.setPrediction(files.length); // 1 file = 1 sec prediction
      this.$emit('register-click', files);
    }
  }
};
</script>

<style scoped>
.unique-loras-container {
  margin-top: 2rem;
  background: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

.unique-loras-summary {
  margin-bottom: 1rem;
  color: #333;
}

.unique-tab-navigation {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px 8px 0 0;
  padding: 0.5rem 0.5rem 0 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.unique-tab-button {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: none;
  padding: 0.75rem 1.5rem;
  margin-right: 0.25rem;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  font-weight: 500;
  color: #546e7a;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.unique-tab-button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.unique-tab-button:hover:not(.active) {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #37474f;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.unique-tab-content {
  background: #fff;
  padding: 1.5rem;
  border-radius: 0 0 8px 8px;
  min-height: 200px;
}

.unique-tab-panel h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.tab-description {
  font-weight: 500;
  margin-bottom: 1rem;
  color: #2d3748;
}

.tab-description.with-link {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.fix-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
  color: white;
  text-decoration: none;
  font-weight: 500;
  padding: 0.4rem 0.8rem;
  border-radius: 16px;
  font-size: 0.8rem;
  text-transform: none;
  letter-spacing: 0.3px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(79, 195, 247, 0.25);
  position: relative;
  overflow: hidden;
}

.fix-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.fix-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 195, 247, 0.35);
  background: linear-gradient(135deg, #29b6f6 0%, #0288d1 100%);
}

.fix-link:hover::before {
  left: 100%;
}

.fix-link:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(79, 195, 247, 0.25);
}

.fix-icon {
  font-size: 0.9rem;
  animation: rotate 2s ease-in-out infinite;
}

.fix-text {
  font-weight: 500;
}

@keyframes rotate {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

.register-section {
  margin-bottom: 1rem;
}

.register-btn {
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.register-btn:hover:not(:disabled) {
  background: #1565c0;
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.3);
  transform: translateY(-1px);
}

.register-btn:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.register-timer {
  display: inline-block;
  margin-left: 1.5rem;
  font-size: 1.1em;
  color: #007bff;
  min-width: 120px;
}

.register-result {
  margin-top: 0.5rem;
  font-weight: bold;
}

.register-error {
  color: #d9534f;
}

.no-unique-files {
  text-align: center;
  color: #757575;
  font-style: italic;
  padding: 3rem 2rem;
  background: #fafafa;
  border-radius: 8px;
  border: 2px dashed #e0e0e0;
  margin: 1rem 0;
}

.unique-loras-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

.unique-loras-table th {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
  padding: 16px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 10;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.unique-loras-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #424242;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.unique-loras-table tbody tr {
  transition: background-color 0.2s ease;
}

.unique-loras-table tbody tr:hover {
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
  border-left: 4px solid #667eea;
}

.unique-loras-table tbody tr:last-child td {
  border-bottom: none;
}

/* Material Design elevation on hover */
.unique-loras-table tbody tr:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-1px);
  transition: all 0.3s ease;
}

/* Responsive table */
@media (max-width: 768px) {
  .unique-loras-table {
    font-size: 12px;
  }
  
  .unique-loras-table th,
  .unique-loras-table td {
    padding: 8px 6px;
  }
}
</style> 