<template>
  <div class="model-profile-page">
    <!-- Notification System -->
    <NotificationSystem ref="notificationSystem" />

    <!-- Loading State -->
    <LoadingState v-if="loading" />

    <!-- Error State -->
    <ErrorState v-else-if="error" :error="error" />

    <!-- Main Content -->
    <div v-else-if="model" class="profile-container">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <!-- Model Image Slider -->
          <div class="model-image-container">
            <ImageSlider 
              :model-id="model.modelId"
              :model-version-id="model.modelVersionId"
              size="medium"
              @error="handleImageError"
            />
          </div>

          <!-- Model Header Info -->
          <div class="model-header">
            <!-- Model Title -->
            <div class="model-title-section">
              <h1 class="model-name">{{ getModelDisplayName() }}</h1>
            </div>

            <!-- Model Categories -->
            <div class="model-categories">
              <!-- Status & Type Category -->
              <div class="category-group">
                <div class="category-label">Status & Type</div>
                <div class="category-badges">
                  <span class="badge status-badge" :class="getStatusBadgeClass()">
                    {{ getDownloadStatusText() }}
                  </span>
                  <span class="badge type-badge">{{ model.basemodel || 'Unknown' }}</span>
                </div>
              </div>

              <!-- Content Rating Category -->
              <div class="category-group">
                <div class="category-label">Content Rating</div>
                <div class="category-badges">
                  <span class="badge nsfw-badge" :class="getNsfwBadgeClass()">
                    {{ getNsfwStatus() }}
                  </span>
                  <span class="badge nsfw-level-badge">{{ getNsfwLevel() }}</span>
                </div>
              </div>

              <!-- Statistics Category -->
              <div class="category-group">
                <div class="category-label">Statistics & Actions</div>
                <div class="category-badges">
                  <a
                    :href="`${civitaiBaseUrl}/models/${model.modelId}?modelVersionId=${model.modelVersionId}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="badge civitai-badge"
                  >
                    <span class="link-icon">🔗</span>
                    <span class="link-text">View on CivitAI</span>
                    <span class="external-icon">↗️</span>
                  </a>
                  <span class="download-count-text">
                    📥 {{ model.modelVersionDownloadCount || '0' }} Downloads
                  </span>
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div class="action-divider">
              <div class="divider-line"></div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
              <DownloadActions 
                :model="model"
                :downloading="downloading"
                :download-status="DOWNLOAD_STATUS"
                @download="downloadModelFile"
                @ignore="ignoreModel"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <!-- Left Column - Main Info -->
        <div class="left-column">
          <!-- Description Card -->
          <div class="info-card description-card" v-if="model.modelDescription || model.modelVersionDescription">
            <div class="card-header">
              <h3 class="card-title">📝 Description</h3>
            </div>
            <div class="card-content">
              <div v-if="model.modelVersionDescription" class="description-section">
                <h4>Version</h4>
                <div class="description-text" v-html="model.modelVersionDescription"></div>
              </div>
              <div v-if="model.modelDescription" class="description-section">
                <h4>Model</h4>
                <div class="description-text" v-html="model.modelDescription"></div>
              </div>
            </div>
          </div>

          <!-- Technical Details Card -->
          <div class="info-card technical-card">
            <div class="card-header">
              <h3 class="card-title">⚙️ Technical Details</h3>
            </div>
            <div class="card-content">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">File Size</span>
                  <span class="detail-value">{{ getFileSize() }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">File Name</span>
                  <span class="detail-value">{{ model.fileName || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Base Model</span>
                  <span class="detail-value">{{ getBaseModel() }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Published</span>
                  <span class="detail-value">{{ getPublishedDate() }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">File Path</span>
                  <span class="detail-value file-path">{{ getFilePath() }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">NSFW Level</span>
                  <span class="detail-value">{{ getNsfwLevel() }}</span>
                </div>
              </div>
            </div>
          </div>


        </div>

        <!-- Right Column - Secondary Info -->
        <div class="right-column">

          <!-- Tags Card -->
          <div class="info-card tags-card" v-if="model.tags">
            <div class="card-header">
              <h3 class="card-title">🏷️ Tags</h3>
            </div>
            <div class="card-content">
              <div class="tags-container">
                <span class="tag" v-for="tag in getTagsArray()" :key="tag">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- Trigger Words Card -->
          <div class="info-card trigger-card">
            <div class="card-header">
              <h3 class="card-title">🏷️ Trigger Words</h3>
            </div>
            <div class="card-content">
              <div class="trigger-words-content">
                <div v-if="getTriggerWordsArray().length > 0" class="trigger-words-list">
                  <span 
                    v-for="word in getTriggerWordsArray()" 
                    :key="word"
                    class="trigger-word"
                  >
                    {{ word }}
                  </span>
                </div>
                <div v-else class="trigger-words-empty">
                  <span v-if="!this.model.trigger_words && this.model.isDownloaded === 1 && this.model.file_path" class="empty-text">
                    For registered lora, fetch metadata from 
                    <a href="/metadata" target="_blank" rel="noopener noreferrer" class="metadata-link">here</a>
                  </span>
                  <span v-else-if="this.model.trigger_words === 'NO_TRIGGER_WORDS'" class="empty-text author-no-trigger">
                    {{ getTriggerWordsStatus() }}
                  </span>
                  <span v-else-if="!this.model.trigger_words && this.model.isDownloaded === 0" class="empty-text not-registered">
                    {{ getTriggerWordsStatus() }}
                  </span>
                  <span v-else class="empty-text">{{ getTriggerWordsStatus() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Related Lora Card -->
          <div class="info-card related-lora-card" v-if="relatedLora.length > 0">
            <div class="card-header">
              <h3 class="card-title">🔄 Related Version</h3>
            </div>
            <div class="card-content">
              <div class="related-lora-list">
                <div 
                  v-for="item in relatedLora.filter(r => r && r.modelVersionId != null)" 
                  :key="item.modelId + '-' + item.modelVersionId"
                  class="related-lora-item"
                  :class="{ 'current-model': isCurrentModel(item) }"
                >
                  <div class="lora-header">
                    <div class="lora-name">
                      <template v-if="isCurrentModel(item)">
                        <span class="current-lora-name">{{ item.modelVersionName }}</span>
                        <span class="current-badge">Current</span>
                      </template>
                      <template v-else>
                        <a 
                          v-if="item.modelId && item.modelVersionId" 
                          :href="`/model/${item.modelId}/${item.modelVersionId}`" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="lora-link"
                        >
                          {{ item.modelVersionName }}
                        </a>
                      </template>
                    </div>
                  </div>
                                     <div class="lora-details">
                     <div class="lora-meta">
                       <span class="base-model">{{ item.basemodel }}</span>
                       <div class="date-info">
                         <span class="published-date">{{ getDateOnly(item.publishedAt) }}</span>
                         <span class="relative-age" v-if="!isCurrentModel(item)"> • {{ getRelativeAge(item.publishedAt) }}</span>
                       </div>
                     </div>
                     <div class="lora-status">
                       <span 
                         class="status-badge"
                         :class="getStatusClass(item.isDownloaded)"
                       >
                         {{ getStatusText(item.isDownloaded) }}
                       </span>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>


    </div>
  </div>
</template>

<script>
import { useRoute } from 'vue-router';
import { apiService } from '@/utils/api.js';
import { API_CONFIG, DOWNLOAD_STATUS } from '@/utils/constants.js';
import { formatDate } from '@/utils/helpers.js';
import { NotificationSystem, LoadingSpinner, ImageSlider } from '@/components/common';

// Local Components
import PageHeader from '@/components/modeldetails/PageHeader.vue';
import DownloadActions from '@/components/modeldetails/DownloadActions.vue';
import LoadingState from '@/components/modeldetails/LoadingState.vue';
import ErrorState from '@/components/modeldetails/ErrorState.vue';
import ModelDetails from '@/components/modeldetails/ModelDetails.vue';

export default {
  name: 'ModelDetailPage',
  components: { 
    NotificationSystem, 
    LoadingSpinner,
    ImageSlider,
    PageHeader,
    DownloadActions,
    LoadingState,
    ErrorState,
    ModelDetails
  },
  setup() {
    const route = useRoute();
    return { route };
  },
  data() {
    return {
      model: null,
      loading: false,
      error: null,
      civitaiBaseUrl: API_CONFIG.CIVITAI_BASE_URL.replace('/api/v1', ''),
      downloading: false,
      DOWNLOAD_STATUS,
      pollingInterval: null,
      pollCount: 0,
      maxPolls: 300, // 10 minutes at 2s interval
      relatedLora: []
    };
  },
  mounted() {
    this.fetchModelDetails();
    this.fetchRelatedLora();
  },
  beforeUnmount() {
    this.stopPolling();
  },

  methods: {
    
    async fetchModelDetails() {
      try {
        this.loading = true;
        this.error = null;
        
        const modelVersionId = Number(this.route.params.modelVersionId);
        const urlModelId = Number(this.route.params.modelId);
        
        if (isNaN(modelVersionId)) throw new Error("Invalid model version ID");
        if (isNaN(urlModelId)) throw new Error("Invalid model ID");
        
        const response = await apiService.getModelDetail(modelVersionId);
        this.model = response;
        
        if (this.model && this.model.modelId !== urlModelId) {
          throw new Error(`URL model ID (${urlModelId}) does not match backend model ID (${this.model.modelId})`);
        }
        

      } catch (err) {
        console.error(err);
        this.error = err.message || "Failed to load model details.";
      } finally {
        this.loading = false;
      }
    },
    
    async fetchRelatedLora() {
      try {
        const modelId = Number(this.route.params.modelId);
        if (isNaN(modelId)) return;
        
        const result = await apiService.getRelatedLoraByModelId(modelId);
        this.relatedLora = Array.isArray(result) ? result : [];
      } catch (err) {
        this.relatedLora = [];
      }
    },
    
    showNotification(message, type = 'info') {
      if (this.$refs.notificationSystem?.showNotification) {
        this.$refs.notificationSystem.showNotification(message, type);
      }
    },
    
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
    
    startPollingForStatus() {
      this.stopPolling();
      this.pollCount = 0;
      
      this.pollingInterval = setInterval(async () => {
        this.pollCount++;
        
        if (!this.model?.modelVersionId) {
          this.stopPolling();
          return;
        }
        
        try {
          const response = await apiService.getModelDetail(this.model.modelVersionId);
          if (response) {
            this.model = { ...response };
            
            if (response.isDownloaded === DOWNLOAD_STATUS.DOWNLOADED) {
              this.showNotification('Download completed: ' + (response.fileName || ''), 'success');
              this.downloading = false;
              this.stopPolling();
            } else if (response.isDownloaded === DOWNLOAD_STATUS.FAILED) {
              this.showNotification('Download failed: ' + (response.fileName || ''), 'error');
              this.downloading = false;
              this.stopPolling();
            }
          }
        } catch (err) {
          // Handle polling errors silently
        }
        
        if (this.pollCount >= this.maxPolls) {
          this.showNotification('Download status polling timed out.', 'warning');
          this.downloading = false;
          this.stopPolling();
        }
      }, 2000);
    },
    
    async downloadModelFile() {
      if (!this.model?.fileDownloadUrl) return;
      
      let timeoutId;
      let finished = false;
      
      this.downloading = true;
      this.error = null;
      
      // Start a 20-second timeout to mark as failed if not started
      timeoutId = setTimeout(() => {
        if (finished) return;
        finished = true;
        this.downloading = false;
        this.model.isDownloaded = this.DOWNLOAD_STATUS.FAILED;
        this.showNotification('Download did not start within 20 seconds: ' + (this.model.fileName || ''), 'error');
        // Force UI update if needed
        this.$forceUpdate && this.$forceUpdate();
      }, 20000);
      
      try {
        const payload = {
          url: this.model.fileDownloadUrl,
          fileName: this.model.fileName,
          baseModel: this.model.basemodel,
          modelVersionId: this.model.modelVersionId
        };
        
        const response = await apiService.downloadModelFile(payload);
        
        if (finished) return; // Timeout already triggered
        finished = true;
        clearTimeout(timeoutId);
        
        if (response && response.success) {
          this.showNotification('Download started: ' + (this.model.fileName || ''), 'info');
          this.startPollingForStatus();
        } else {
          this.downloading = false;
          this.model.isDownloaded = this.DOWNLOAD_STATUS.FAILED;
          this.showNotification('Failed to start download: ' + (this.model.fileName || ''), 'error');
        }
        
        await this.fetchModelDetails();
      } catch (err) {
        if (finished) return; // Timeout already triggered
        finished = true;
        clearTimeout(timeoutId);
        this.downloading = false;
        this.model.isDownloaded = this.DOWNLOAD_STATUS.FAILED;
        this.error = err.message || 'Download failed.';
        this.showNotification('Download failed: ' + (this.model.fileName || ''), 'error');
      }
    },
    
    async ignoreModel() {
      if (!this.model?.modelVersionId) return;
      
      try {
        await apiService.ignoreModel(this.model.modelVersionId);
        this.model.isDownloaded = DOWNLOAD_STATUS.IGNORED;
        this.showNotification('Model ignored successfully.', 'success');
      } catch (err) {
        this.showNotification('Failed to ignore model.', 'error');
      }
    },
    
    formatDate,
    
    // Helper methods for the new design
    getModelDisplayName() {
      if (this.model.modelVersionName) {
        return `${this.model.modelName} / ${this.model.modelVersionName}`;
      }
      return this.model.modelName || 'Unknown Model';
    },
    
    getNsfwStatus() {
      return this.model.modelNsfw === 1 ? 'NSFW' : 'SFW';
    },
    
    getNsfwBadgeClass() {
      return this.model.modelNsfw === 1 ? 'nsfw-badge--nsfw' : 'nsfw-badge--sfw';
    },
    
    getDownloadStatusText() {
      const status = this.model.isDownloaded;
      if (status === this.DOWNLOAD_STATUS.DOWNLOADED) return 'Downloaded';
      if (status === this.DOWNLOAD_STATUS.DOWNLOADING) return 'Downloading';
      if (status === this.DOWNLOAD_STATUS.FAILED) return 'Failed';
      if (status === this.DOWNLOAD_STATUS.IGNORED) return 'Ignored';
      return 'Not Downloaded';
    },
    
    getStatusBadgeClass() {
      const status = this.model.isDownloaded;
      if (status === this.DOWNLOAD_STATUS.DOWNLOADED) return 'status-badge--downloaded';
      if (status === this.DOWNLOAD_STATUS.DOWNLOADING) return 'status-badge--downloading';
      if (status === this.DOWNLOAD_STATUS.FAILED) return 'status-badge--failed';
      if (status === this.DOWNLOAD_STATUS.IGNORED) return 'status-badge--ignored';
      return 'status-badge--not-downloaded';
    },
    
    getFileSize() {
      if (this.model.size_in_kb) {
        const sizeInMB = (this.model.size_in_kb / 1024).toFixed(2);
        return `${sizeInMB} MB`;
      }
      return 'Unknown';
    },
    
    getBaseModel() {
      if (this.model.basemodeltype) {
        return `${this.model.basemodel} (${this.model.basemodeltype})`;
      }
      return this.model.basemodel || 'Unknown';
    },
    
    getPublishedDate() {
      if (this.model.publishedAt) {
        return new Date(this.model.publishedAt).toLocaleDateString();
      }
      return 'Unknown';
    },
    
    getFilePath() {
      const downloadStatus = this.model.isDownloaded;
      if (downloadStatus === 1) {
        return this.model.file_path && this.model.file_path.trim() !== '' 
          ? this.model.file_path 
          : 'Path not available';
      } else if (downloadStatus === 0) {
        return 'Not downloaded';
      } else if (downloadStatus === 3) {
        return 'Download failed';
      } else if (downloadStatus === 4) {
        return 'Download ignored';
      }
      return 'Unknown status';
    },
    
    getNsfwLevel() {
      const nsfwGroups = {
        'Safe': [0],
        'Mild': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        'Moderate': [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
        'NSFW': [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
        'Extreme NSFW': [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]
      };
      
      const level = this.model.modelNsfwLevel;
      for (const [groupName, levels] of Object.entries(nsfwGroups)) {
        if (levels.includes(level)) {
          return groupName;
        }
      }
      return 'Unknown';
    },
    
    getTagsArray() {
      if (this.model.tags) {
        if (Array.isArray(this.model.tags)) {
          return this.model.tags;
        }
        if (typeof this.model.tags === 'string') {
          return this.model.tags.split(',').map(tag => tag.trim());
        }
      }
      return [];
    },

    getTriggerWordsArray() {
      if (!this.model.trigger_words) {
        return [];
      }
      
      // Handle different cases
      if (this.model.trigger_words === 'NO_TRIGGER_WORDS') {
        return [];
      }
      
      if (typeof this.model.trigger_words === 'string') {
        // Split by comma and clean up
        return this.model.trigger_words
          .split(',')
          .map(word => word.trim())
          .filter(word => word && word !== 'NO_TRIGGER_WORDS');
      }
      
      if (Array.isArray(this.model.trigger_words)) {
        return this.model.trigger_words.filter(word => word && word !== 'NO_TRIGGER_WORDS');
      }
      
      return [];
    },

    getTriggerWordsStatus() {
      if (this.model.trigger_words === 'NO_TRIGGER_WORDS') {
        return 'Author did not provide trigger word';
      }
      
      if (!this.model.trigger_words && this.model.isDownloaded === 0) {
        return 'Lora not registered or downloaded';
      }
      
      if (!this.model.trigger_words) {
        return 'No trigger words data available';
      }
      
      if (this.getTriggerWordsArray().length === 0) {
        return 'No trigger words available';
      }
      
      return 'No trigger words available';
    },
    
    // Related Lora helper methods
    isCurrentModel(item) {
      return item && this.model && item.modelVersionId === this.model.modelVersionId;
    },
    
    getStatusText(status) {
      if (status === this.DOWNLOAD_STATUS.DOWNLOADED) return 'Downloaded';
      if (status === this.DOWNLOAD_STATUS.DOWNLOADING) return 'Downloading';
      if (status === this.DOWNLOAD_STATUS.FAILED) return 'Failed';
      if (status === this.DOWNLOAD_STATUS.IGNORED) return 'Ignored';
      return 'Not Downloaded';
    },
    
    getStatusClass(status) {
      if (status === this.DOWNLOAD_STATUS.DOWNLOADED) return 'status-downloaded';
      if (status === this.DOWNLOAD_STATUS.DOWNLOADING) return 'status-downloading';
      if (status === this.DOWNLOAD_STATUS.FAILED) return 'status-failed';
      if (status === this.DOWNLOAD_STATUS.IGNORED) return 'status-ignored';
      return 'status-not-downloaded';
    },
    
    getDateOnly(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    },
    
    getRelativeAge(publishedAt) {
      if (!this.model?.publishedAt || !publishedAt) return '';
      
      const current = new Date(this.model.publishedAt);
      const other = new Date(publishedAt);
      const diffMs = other - current;
      
      if (Math.abs(diffMs) < 1000 * 60) return 'Just now';
      
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);
      
      if (diffYear !== 0) {
        return Math.abs(diffYear) + ' year' + (Math.abs(diffYear) > 1 ? 's' : '') + 
               (diffYear > 0 ? ' newer' : ' older');
      }
      if (diffMonth !== 0) {
        return Math.abs(diffMonth) + ' month' + (Math.abs(diffMonth) > 1 ? 's' : '') + 
               (diffMonth > 0 ? ' newer' : ' older');
      }
      if (diffDay !== 0) {
        return Math.abs(diffDay) + ' day' + (Math.abs(diffDay) > 1 ? 's' : '') + 
               (diffDay > 0 ? ' newer' : ' older');
      }
      if (diffHr !== 0) {
        return Math.abs(diffHr) + ' hour' + (Math.abs(diffHr) > 1 ? 's' : '') + 
               (diffHr > 0 ? ' newer' : ' older');
      }
      if (diffMin !== 0) {
        return Math.abs(diffMin) + ' min' + (Math.abs(diffMin) > 1 ? 's' : '') + 
               (diffMin > 0 ? ' newer' : ' older');
      }
      
      return '';
    },
    
    handleImageError(error) {
      this.showNotification(error, 'warning');
    }
  }
};
</script>

<style scoped>
/* Main Container */
.model-profile-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0;
}

.profile-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  margin: 0 1rem 2rem 1rem;
}

.hero-content {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 2rem;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

/* Model Image Container */
.model-image-container {
  display: flex;
  align-items: center;
}

/* Model Header */
.model-header {
  flex: 1;
}

.model-title-section {
  margin-bottom: 1rem;
}

.model-name {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.model-categories {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.category-badges {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.28rem 0.56rem;
  border-radius: 6px;
  font-size: 0.595rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  min-width: 98px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  text-decoration: none;
  transition: all 0.3s ease;
}

.nsfw-badge--sfw {
  background: rgba(76, 175, 80, 0.2);
  color: #1b5e20;
}

.nsfw-badge--nsfw {
  background: rgba(244, 67, 54, 0.2);
  color: #4a0000;
}

.type-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.status-badge--downloaded {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-badge--downloading {
  background: rgba(33, 150, 243, 0.2);
  color: #2196f3;
}

.status-badge--failed {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.status-badge--ignored {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
}

.status-badge--not-downloaded {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
}

.download-count-text {
  color: #ffc107;
  font-size: 0.595rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.civitai-badge {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.civitai-badge:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  color: white;
}

.nsfw-level-badge {
  background: rgba(255, 87, 34, 0.2);
  color: #8b2a00;
}

/* Action Divider */
.action-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
}

.divider-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 0.5rem;
  white-space: nowrap;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Uniform Button Sizing */
.quick-actions :deep(.download-btn),
.quick-actions :deep(.retry-btn),
.quick-actions :deep(.ignore-btn) {
  min-width: 120px !important;
  max-width: 120px !important;
  width: 120px !important;
  padding: 0.5rem 1rem !important;
  font-size: 0.85rem !important;
  border-radius: 6px !important;
  text-align: center !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.5rem !important;
  height: 40px !important;
  box-sizing: border-box !important;
}

/* Status Text Colors for Hero Section */
.quick-actions :deep(.status-downloaded) {
  color: #4caf50 !important;
  font-weight: 600 !important;
  font-size: 0.85rem !important;
  background: rgba(76, 175, 80, 0.2) !important;
  padding: 0.5rem 1rem !important;
  border-radius: 6px !important;
  border: 1px solid rgba(76, 175, 80, 0.3) !important;
}

.quick-actions :deep(.status-ignored) {
  color: #ff9800 !important;
  font-weight: 600 !important;
  font-size: 0.85rem !important;
  background: rgba(255, 152, 0, 0.2) !important;
  padding: 0.5rem 1rem !important;
  border-radius: 6px !important;
  border: 1px solid rgba(255, 152, 0, 0.3) !important;
}



/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  padding: 0 2rem;
  margin-bottom: 2rem;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Info Cards */
.info-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-header {
  padding: 1.5rem 1.5rem 0 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-content {
  padding: 0 1.5rem 1.5rem 1.5rem;
}

/* Description Card */
.description-card {
  grid-column: 1 / -1;
  max-height: 800px;
  overflow: auto;
}

.description-section {
  margin-bottom: 1.5rem;
}

.description-section:last-child {
  margin-bottom: 0;
}

.description-section h4 {
  color: #667eea;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.description-text {
  color: #555;
  line-height: 1.6;
  font-size: 0.95rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.description-text :deep(a) {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.description-text :deep(a):hover {
  text-decoration: underline;
}

/* Technical Details */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 0.95rem;
  color: #2c3e50;
  font-weight: 500;
}

.file-path {
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 6px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-2px);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.stat-item:hover .stat-value {
  color: white;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-item:hover .stat-label {
  color: rgba(255, 255, 255, 0.9);
}

/* Tags */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* Placeholder Content */
.placeholder-content {
  text-align: center;
  padding: 2rem 1rem;
  color: #9e9e9e;
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.placeholder-content p {
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.placeholder-content small {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* Trigger Words */
.trigger-words-content {
  padding: 0.5rem 0;
}

.trigger-words-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.trigger-word {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.trigger-word:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  background: linear-gradient(135deg, #ff5252 0%, #d63031 100%);
}

.trigger-words-empty {
  text-align: center;
  padding: 1rem 0;
}

.trigger-words-empty .empty-text {
  color: #9e9e9e;
  font-size: 0.9rem;
  font-style: italic;
}

.trigger-words-empty .empty-text.author-no-trigger {
  color: #ff6b35;
  font-weight: 600;
  font-style: normal;
}

.trigger-words-empty .empty-text.not-registered {
  color: #f44336;
  font-weight: 600;
  font-style: normal;
}

.metadata-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.metadata-link:hover {
  color: #5a67d8;
  text-decoration: underline;
}

/* Related Lora Card */
.related-lora-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.related-lora-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 0.75rem;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.related-lora-item:hover {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.related-lora-item.current-model {
  background: linear-gradient(135deg, #e6f4ea 0%, #d4edda 100%);
  border-color: #c3e6cb;
}

.lora-header {
  margin-bottom: 0.5rem;
}

.lora-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.current-lora-name {
  font-weight: 600;
  color: #2c3e50;
}

.lora-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
}

.lora-link:hover {
  text-decoration: underline;
}

.current-badge {
  background: #28a745;
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lora-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.lora-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.base-model {
  font-size: 0.8rem;
  color: #2c3e50;
  font-weight: 600;
}

.date-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
}

.published-date {
  font-size: 0.75rem;
  color: #6c757d;
}

.relative-age {
  font-size: 0.7rem;
  color: #ff6b35;
  font-weight: 600;
}

.lora-status {
  flex-shrink: 0;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-downloaded {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-downloading {
  background: rgba(33, 150, 243, 0.2);
  color: #2196f3;
}

.status-failed {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.status-ignored {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
}

.status-not-downloaded {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
}

/* Related Section */
.related-section {
  padding: 0 2rem 2rem 2rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 1.5rem;
  }
  
  .model-name {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 2rem 1rem;
  }
  
  .content-grid {
    padding: 0 1rem;
  }
  
  .related-section {
    padding: 0 1rem 2rem 1rem;
  }
  
  .model-name {
    font-size: 1.75rem;
  }
  
  .model-categories {
    gap: 0.75rem;
  }
  
  .category-badges {
    gap: 0.5rem;
  }
  
  .model-image-placeholder {
    width: 170px;
    height: 256px;
  }
  
  .image-slider {
    width: 170px;
    height: 256px;
  }
  
  .slider-arrow {
    width: 28px;
    height: 28px;
    font-size: 1rem;
  }
  
  .image-icon {
    font-size: 2rem;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 1.5rem 0.75rem;
  }
  
  .content-grid {
    padding: 0 0.75rem;
    gap: 1rem;
  }
  
  .related-section {
    padding: 0 0.75rem 1.5rem 0.75rem;
  }
  
  .model-badges {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
  