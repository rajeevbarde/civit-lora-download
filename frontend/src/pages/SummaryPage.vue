<template>
  <div class="lora-summary-page">
    <SampleDbWarning :show="showSampleDbWarning" />
    <SummaryHeader />
    <SummaryTabs :activeTab="activeTab" @tab-click="scrollToSection" />
    <div class="summary-content">
      <ModelOverviewMatrix
        :matrixData="matrixData"
        :loading="loading"
        :error="error"
        @retry="loadMatrixData"
      />
      <LoraFileLocations
        :savedPaths="savedPaths"
        :pathCounts="pathCounts"
        :loadingPaths="loadingPaths"
        :pathError="pathError"
        @retry="loadPathData"
      />
    </div>
    <LatestUpdatedLora
      :latestCheckpoints="latestCheckpoints"
      :loadingCheckpoints="loadingCheckpoints"
      :checkpointsError="checkpointsError"
      :formatRelativeTime="formatRelativeTime"
      @retry="loadLatestCheckpoints"
    />
  </div>
</template>

<script>
import SampleDbWarning from '../components/summary/SampleDbWarning.vue';
import SummaryHeader from '../components/summary/SummaryHeader.vue';
import SummaryTabs from '../components/summary/SummaryTabs.vue';
import ModelOverviewMatrix from '../components/summary/ModelOverviewMatrix.vue';
import LoraFileLocations from '../components/summary/LoraFileLocations.vue';
import LatestUpdatedLora from '../components/summary/LatestUpdatedLora.vue';
import { apiService } from '../utils/api.js';

function getRelativeTime(dateString) {
  const utcDate = new Date(dateString + 'Z');
  const now = new Date();
  const diff = Math.floor((now - utcDate) / 1000);
  if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} month${Math.floor(diff / 2592000) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(diff / 31536000)} year${Math.floor(diff / 31536000) !== 1 ? 's' : ''} ago`;
}

export default {
  name: 'LoRASummary',
  components: {
    SampleDbWarning,
    SummaryHeader,
    SummaryTabs,
    ModelOverviewMatrix,
    LoraFileLocations,
    LatestUpdatedLora
  },
  data() {
    return {
      matrixData: null,
      loading: false,
      error: null,
      loadingPaths: false,
      pathError: null,
      savedPaths: [],
      pathCounts: [],
      latestCheckpoints: [],
      loadingCheckpoints: false,
      checkpointsError: null,
      activeTab: 'overview',
      allCivitDataRowCount: null,
      showSampleDbWarning: false
    };
  },
  async mounted() {
    this.loadMatrixData();
    this.loadPathData();
    this.loadLatestCheckpoints();
    await this.checkSampleDb();
  },
  methods: {
    async loadMatrixData() {
      this.loading = true;
      this.error = null;
      try {
        this.matrixData = await apiService.getDownloadMatrix();
      } catch (err) {
        this.error = err.message || 'Failed to load matrix data';
        console.error('Error loading matrix data:', err);
      } finally {
        this.loading = false;
      }
    },
    async loadPathData() {
      this.loadingPaths = true;
      this.pathError = null;
      try {
        const response = await apiService.getSavedPaths();
        this.savedPaths = response.paths || [];
        if (this.savedPaths.length > 0) {
          this.pathCounts = await apiService.getSafetensorCounts();
        }
      } catch (err) {
        this.pathError = err.message || 'Failed to load filepath data';
        console.error('Error loading filepath data:', err);
      } finally {
        this.loadingPaths = false;
      }
    },
    async loadLatestCheckpoints() {
      this.loadingCheckpoints = true;
      this.checkpointsError = null;
      try {
        this.latestCheckpoints = await apiService.getLatestUpdatedCheckpoints();
      } catch (err) {
        this.checkpointsError = err.message || 'Failed to load latest updated checkpoints';
      } finally {
        this.loadingCheckpoints = false;
      }
    },
    formatRelativeTime(dateString) {
      return getRelativeTime(dateString);
    },
    scrollToSection(section) {
      this.activeTab = section;
      const el = document.getElementById(section);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    async checkSampleDb() {
      try {
        this.allCivitDataRowCount = await apiService.getAllCivitDataRowCount();
        this.showSampleDbWarning = this.allCivitDataRowCount < 500;
      } catch (err) {
        this.showSampleDbWarning = false;
        console.error('Error checking AllCivitData row count:', err);
      }
    }
  }
};
</script>

<style scoped>
.lora-summary-page {
  width: 100%;
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}
.summary-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
}
</style> 