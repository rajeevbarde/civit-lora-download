<template>
  <div v-if="showDuplicateIssues" class="duplicate-issues-section">
    <h2 class="section-title">Duplicate Issues</h2>
    <div v-if="duplicateIssuesLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading duplicate issues...</span>
    </div>
    <div v-else-if="duplicateIssuesError" class="error-card">{{ duplicateIssuesError }}</div>
    <div v-else>
      <div class="duplicate-tabs">
        <button 
          :class="['duplicate-tab', { active: localActiveTab === 'disk' }]" 
          @click="setActiveTab('disk')"
        >
          <span class="tab-icon">💾</span>
          <span class="tab-text">Duplicate LoRA files on Harddrive</span>
          <span class="tab-count">({{ duplicateOnDisk.length }})</span>
        </button>
        <button 
          :class="['duplicate-tab', { active: localActiveTab === 'db' }]" 
          @click="setActiveTab('db')"
        >
          <span class="tab-icon">🗄️</span>
          <span class="tab-text">Duplicate LoRA filename in Database</span>
          <span class="tab-count">({{ duplicateInDb.length }})</span>
        </button>
        <button 
          :class="['duplicate-tab', { active: localActiveTab === 'diskdb' }]" 
          @click="setActiveTab('diskdb')"
        >
          <span class="tab-icon">🔄</span>
          <span class="tab-text">Both</span>
          <span class="tab-count">({{ duplicateOnDiskAndDb.length }})</span>
        </button>
      </div>
      
      <div class="duplicate-tab-content">
        <!-- Disk Duplicates Tab -->
        <DuplicateIssuesTab
          v-show="localActiveTab === 'disk'"
          tab-type="disk"
          :duplicate-data="duplicateOnDiskGrouped"
          :loading-states="loadingStates"
          :results="results"
          :frontend-base-url="frontendBaseUrl"
          @hash-check="$emit('hash-check', $event)"
          @identify-metadata="$emit('identify-metadata', $event)"
          @register-actions="$emit('register-actions', $event)"
        />
        
        <!-- Database Duplicates Tab -->
        <DuplicateIssuesTab
          v-show="localActiveTab === 'db'"
          tab-type="db"
          :duplicate-data="duplicateInDb"
          :loading-states="loadingStates"
          :results="results"
          :frontend-base-url="frontendBaseUrl"
          @database-check="$emit('database-check', $event)"
          @identify-metadata-single="$emit('identify-metadata-single', $event)"
          @register-model="$emit('register-model', $event)"
        />
        
        <!-- Both Duplicates Tab -->
        <DuplicateIssuesTab
          v-show="localActiveTab === 'diskdb'"
          tab-type="diskdb"
          :duplicate-data="duplicateOnDiskAndDbGrouped"
          :loading-states="loadingStates"
          :results="results"
          :frontend-base-url="frontendBaseUrl"
          @hash-check="$emit('hash-check', $event)"
          @database-check="$emit('database-check', $event)"
          @identify-metadata-single="$emit('identify-metadata-single', $event)"
          @register-model="$emit('register-model', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import DuplicateIssuesTab from './DuplicateIssuesTab.vue'

export default {
  name: 'DuplicateIssuesTabs',
  components: {
    DuplicateIssuesTab
  },
  props: {
    showDuplicateIssues: {
      type: Boolean,
      default: false
    },
    duplicateIssuesLoading: {
      type: Boolean,
      default: false
    },
    duplicateIssuesError: {
      type: String,
      default: null
    },
    duplicateIssues: {
      type: Array,
      default: () => []
    },
    activeDuplicateTab: {
      type: String,
      default: 'disk'
    },
    loadingStates: {
      type: Object,
      default: () => ({})
    },
    results: {
      type: Object,
      default: () => ({})
    },
    frontendBaseUrl: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      localActiveTab: this.activeDuplicateTab
    }
  },
  emits: [
    'hash-check', 
    'identify-metadata', 
    'identify-metadata-single', 
    'register-actions', 
    'database-check', 
    'register-model',
    'update:activeDuplicateTab'
  ],
  computed: {
    duplicateOnDisk() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate on Disk');
    },
    duplicateInDb() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate in DB');
    },
    duplicateOnDiskAndDb() {
      return (this.duplicateIssues || []).filter(f => f.status === 'Duplicate on Disk & DB');
    },
    duplicateOnDiskAndDbGrouped() {
      const grouped = {};
      this.duplicateOnDiskAndDb.forEach(file => {
        if (!grouped[file.baseName]) {
          grouped[file.baseName] = [];
        }
        grouped[file.baseName].push(file.fullPath);
      });
      return Object.entries(grouped)
        .map(([filename, paths]) => ({ filename, paths: paths.sort() }))
        .sort((a, b) => a.filename.localeCompare(b.filename));
    },
    duplicateOnDiskGrouped() {
      const grouped = {};
      this.duplicateOnDisk.forEach(file => {
        if (!grouped[file.baseName]) {
          grouped[file.baseName] = [];
        }
        grouped[file.baseName].push(file.fullPath);
      });
      return Object.entries(grouped)
        .map(([filename, paths]) => ({ filename, paths: paths.sort() }))
        .sort((a, b) => a.filename.localeCompare(b.filename));
    }
  },
  watch: {
    activeDuplicateTab(newValue) {
      this.localActiveTab = newValue;
    }
  },
  methods: {
    setActiveTab(tab) {
      this.localActiveTab = tab;
      this.$emit('update:activeDuplicateTab', tab);
    }
  }
}
</script>

<style scoped>
.duplicate-issues-section {
  margin-top: 2rem;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
}

.section-title {
  margin: 0;
  padding: 1.5rem 1.5rem 1rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
  border-bottom: 1px solid #e0e0e0;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #666;
  font-size: 0.95rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-card {
  color: #d32f2f;
  font-weight: 500;
  padding: 1rem 1.5rem;
  background: #ffebee;
  border-left: 4px solid #d32f2f;
  margin: 1rem 1.5rem;
  border-radius: 4px;
}

.duplicate-tabs {
  display: flex;
  background: #f5f5f5;
  padding: 0 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.duplicate-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: #666;
  padding: 1rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-bottom: 3px solid transparent;
}

.duplicate-tab:hover {
  background: rgba(33, 150, 243, 0.08);
  color: #1976d2;
}

.duplicate-tab.active {
  background: #ffffff;
  color: #1976d2;
  border-bottom-color: #1976d2;
  font-weight: 600;
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-text {
  font-size: 0.9rem;
}

.tab-count {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 2rem;
  text-align: center;
}

.duplicate-tab.active .tab-count {
  background: #1976d2;
  color: #ffffff;
}

.duplicate-tab-content {
  background: #ffffff;
  padding: 1.5rem;
  width: 100%;
  overflow-x: auto;
}
</style> 