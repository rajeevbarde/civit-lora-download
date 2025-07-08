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
            LoRA files are registered with Civitai db. They do not have duplicate issues.
          </div>
        </template>
        <template v-else-if="tab.key === 'unique-not-downloaded'">
          <div class="tab-description">
            LoRA files are present in your hdd but not registered with db. They do not have duplicate issues.
          </div>
        </template>
        <template v-else-if="tab.key === 'duplicate-issues'">
          <div class="tab-description with-link">
            <span>Wierd duplicate Issues</span>
            <router-link to="/civit-data-fetcher" class="fix-link">Fix it.</router-link>
          </div>
        </template>
        <template v-else-if="tab.key === 'orphan'">
          <div class="tab-description with-link">
            <span>LoRA files present in harddrive but does not exist in Civitai db.</span>
            <router-link to="/civit-data-fetcher" class="fix-link">Fix it.</router-link>
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
        { key: 'unique-downloaded', label: 'LoRA Registered with Civitai db' },
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
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 5px;
}

.unique-loras-summary {
  margin-bottom: 1rem;
  color: #333;
}

.unique-tab-navigation {
  display: flex;
  border-bottom: 2px solid #ddd;
  margin-bottom: 1rem;
}

.unique-tab-button {
  background: #f8f8f8;
  border: 1px solid #ddd;
  border-bottom: none;
  padding: 0.75rem 1.5rem;
  margin-right: 0.25rem;
  cursor: pointer;
  border-radius: 5px 5px 0 0;
  font-weight: 500;
}

.unique-tab-button.active {
  background: #fff;
  border-bottom: 2px solid #fff;
  margin-bottom: -2px;
  font-weight: bold;
}

.unique-tab-button:hover:not(.active) {
  background: #e9e9e9;
}

.unique-tab-content {
  background: #fff;
  padding: 1rem;
  border-radius: 0 0 5px 5px;
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
  color: #337ab7;
  text-decoration: underline;
  font-weight: 500;
}

.register-section {
  margin-bottom: 1rem;
}

.register-btn {
  background: #5cb85c;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
}

.register-btn:disabled {
  background: #b2d8b2;
  cursor: not-allowed;
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
  color: #666;
  font-style: italic;
  padding: 2rem;
}

.unique-loras-table {
  width: 100%;
  border-collapse: collapse;
}

.unique-loras-table th, .unique-loras-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.unique-loras-table th {
  background: #f8f8f8;
  font-weight: bold;
}
</style> 