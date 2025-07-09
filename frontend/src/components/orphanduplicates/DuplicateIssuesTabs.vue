<template>
  <div v-if="showDuplicateIssues" class="duplicate-issues-section">
    <h2>Duplicate Issues</h2>
    <div v-if="duplicateIssuesLoading">Loading duplicate issues...</div>
    <div v-else-if="duplicateIssuesError" class="error">{{ duplicateIssuesError }}</div>
    <div v-else>
      <div class="duplicate-tabs">
        <button 
          :class="['duplicate-tab', { active: localActiveTab === 'disk' }]" 
          @click="setActiveTab('disk')"
        >
          Duplicate LoRA files on Harddrive ({{ duplicateOnDisk.length }})
        </button>
        <button 
          :class="['duplicate-tab', { active: localActiveTab === 'db' }]" 
          @click="setActiveTab('db')"
        >
          Duplicate LoRA filename in Database ({{ duplicateInDb.length }})
        </button>
        <button 
          :class="['duplicate-tab', { active: localActiveTab === 'diskdb' }]" 
          @click="setActiveTab('diskdb')"
        >
          Both ({{ duplicateOnDiskAndDb.length }})
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
  background: #f9f9f9;
  padding: 0.5rem;
  border-radius: 5px;
  width: 100%;
}

.duplicate-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.duplicate-tab {
  background: #f8f8f8;
  border: 1px solid #007bff;
  color: #007bff;
  padding: 0.5rem 1.5rem;
  border-radius: 5px 5px 0 0;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.duplicate-tab.active {
  background: #007bff;
  color: #fff;
  font-weight: bold;
}

.duplicate-tab:hover:not(.active) {
  background: #e9e9e9;
}

.duplicate-tab-content {
  background: #fff;
  padding: 0.5rem;
  border-radius: 0 0 5px 5px;
  width: 100%;
  overflow-x: auto;
}

.error {
  color: #dc3545;
  font-weight: bold;
  padding: 1rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}
</style> 