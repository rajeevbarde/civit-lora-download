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
            <!-- Image Slider -->
            <div v-if="modelImages.length > 0" class="image-slider">
              <div class="slider-container">
                <img 
                  :src="modelImages[currentImageIndex]" 
                  :alt="`Model image ${currentImageIndex + 1}`"
                  class="slider-image"
                  @error="handleImageError"
                  @click="showImagePreview"
                />
                
                <!-- Navigation Arrows -->
                <button 
                  v-if="modelImages.length > 1"
                  @click="previousImage" 
                  class="slider-arrow slider-arrow-left"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button 
                  v-if="modelImages.length > 1"
                  @click="nextImage" 
                  class="slider-arrow slider-arrow-right"
                  aria-label="Next image"
                >
                  ›
                </button>
                
                <!-- Image Counter -->
                <div v-if="modelImages.length > 1" class="image-counter">
                  {{ currentImageIndex + 1 }} / {{ modelImages.length }}
                </div>
              </div>
            </div>
            
            <!-- Placeholder when no images -->
            <div v-else class="model-image-placeholder">
              <div class="image-icon">🖼️</div>
              <span class="image-text">Image Not Found</span>
            </div>
          </div>

          <!-- Model Header Info -->
          <div class="model-header">
            <div class="model-title-section">
              <h1 class="model-name">{{ getModelDisplayName() }}</h1>
              <div class="model-badges">
                <span class="badge nsfw-badge" :class="getNsfwBadgeClass()">
                  {{ getNsfwStatus() }}
                </span>
                <span class="badge type-badge">{{ model.basemodel || 'Unknown' }}</span>
                <span class="badge status-badge" :class="getStatusBadgeClass()">
                  {{ getDownloadStatusText() }}
                </span>
                <span class="badge download-count-badge">
                  📥 {{ model.modelVersionDownloadCount || '0' }} Downloads
                </span>
              </div>
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
              
              <!-- CivitAI Link -->
              <a
                :href="`${civitaiBaseUrl}/models/${model.modelId}?modelVersionId=${model.modelVersionId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="civitai-link-header"
              >
                <span class="link-icon">🔗</span>
                <span class="link-text">View on CivitAI</span>
                <span class="external-icon">↗️</span>
              </a>
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
              <div v-if="model.modelDescription" class="description-section">
                <h4>Model Description</h4>
                <div class="description-text" v-html="model.modelDescription"></div>
              </div>
              <div v-if="model.modelVersionDescription" class="description-section">
                <h4>Version Description</h4>
                <div class="description-text" v-html="model.modelVersionDescription"></div>
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
    
    <!-- Image Preview Modal -->
    <div v-if="showPreview" class="image-preview-modal" @click="hideImagePreview">
      <div class="preview-content" @click.stop>
        <img 
          :src="modelImages[currentImageIndex]" 
          :alt="`Model image ${currentImageIndex + 1}`"
          class="preview-image"
          @load="onPreviewImageLoad"
        />
        <div class="preview-info">
          <span class="preview-dimensions">{{ imageDimensions }}</span>
          <span class="preview-counter">{{ currentImageIndex + 1 }} / {{ modelImages.length }}</span>
        </div>
        <button class="preview-close" @click="hideImagePreview">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useRoute } from 'vue-router';
import { apiService } from '@/utils/api.js';
import { API_CONFIG, DOWNLOAD_STATUS } from '@/utils/constants.js';
import { formatDate } from '@/utils/helpers.js';
import NotificationSystem from '@/components/common/NotificationSystem.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

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
      relatedLora: [],
      modelImages: [],
      currentImageIndex: 0,
      imageLoading: false,
      showPreview: false,
      imageDimensions: ''
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
        
        // Fetch images if modelversion_jsonpath is available
        if (this.model && this.model.modelversion_jsonpath) {
          await this.fetchModelImages();
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
    
    // Image Slider Methods
    async fetchModelImages() {
      if (!this.model?.modelversion_jsonpath) {
        this.modelImages = [];
        return;
      }
      
      try {
        this.imageLoading = true;
        
        // Fetch the JSON file from the backend using API service
        const jsonData = await apiService.readJsonFile(this.model.modelversion_jsonpath);
        
        // Extract image URLs from the 'images' array
        if (jsonData.images && Array.isArray(jsonData.images)) {
          this.modelImages = jsonData.images
            .map(image => image.url)
            .filter(url => url && typeof url === 'string');
        } else {
          this.modelImages = [];
        }
        
        // Reset current image index
        this.currentImageIndex = 0;
        
      } catch (err) {
        console.error('Error fetching model images:', err);
        this.modelImages = [];
        this.showNotification('Failed to load model images', 'warning');
      } finally {
        this.imageLoading = false;
      }
    },
    
    nextImage() {
      if (this.modelImages.length > 1) {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.modelImages.length;
      }
    },
    
    previousImage() {
      if (this.modelImages.length > 1) {
        this.currentImageIndex = this.currentImageIndex === 0 
          ? this.modelImages.length - 1 
          : this.currentImageIndex - 1;
      }
    },
    
    handleImageError(event) {
      // Remove the failed image from the array
      const failedImageUrl = event.target.src;
      const index = this.modelImages.indexOf(failedImageUrl);
      if (index > -1) {
        this.modelImages.splice(index, 1);
        // Adjust current index if needed
        if (this.currentImageIndex >= this.modelImages.length) {
          this.currentImageIndex = Math.max(0, this.modelImages.length - 1);
        }
      }
    },
    
    // Image Preview Methods
    showImagePreview() {
      this.showPreview = true;
      this.imageDimensions = 'Loading...';
    },
    
    hideImagePreview() {
      this.showPreview = false;
      this.imageDimensions = '';
    },
    
    onPreviewImageLoad(event) {
      const img = event.target;
      this.imageDimensions = `${img.naturalWidth} × ${img.naturalHeight}`;
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
}

.hero-content {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 2rem;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

/* Model Image */
.model-image-container {
  display: flex;
  align-items: center;
}

.model-image-placeholder {
  width: 256px;
  height: 384px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.model-image-placeholder:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.image-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.image-text {
  font-size: 0.9rem;
  opacity: 0.9;
  text-align: center;
}

/* Image Slider */
.image-slider {
  width: 256px;
  height: 384px;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.image-slider:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.slider-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.slider-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.slider-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.slider-arrow:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: translateY(-50%) scale(1.1);
}

.slider-arrow-left {
  left: 8px;
}

.slider-arrow-right {
  right: 8px;
}

.image-counter {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  z-index: 10;
}

/* Image Preview Modal */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.preview-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: previewFadeIn 0.3s ease-out;
}

.preview-image {
  display: block;
  width: auto;
  height: auto;
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 16px 16px 0 0;
}

.preview-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 20px 16px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-dimensions {
  font-size: 0.9rem;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 8px;
}

.preview-counter {
  font-size: 0.8rem;
  opacity: 0.9;
}

.preview-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.preview-close:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

@keyframes previewFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
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

.model-badges {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.5rem 1rem;
  border-radius: 25px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.nsfw-badge--sfw {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.nsfw-badge--nsfw {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
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

.download-count-badge {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* CivitAI Link Header */
.civitai-link-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.civitai-link-header:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  color: white;
}

.civitai-link-header .link-icon {
  font-size: 1rem;
}

.civitai-link-header .link-text {
  font-size: 0.85rem;
}

.civitai-link-header .external-icon {
  font-size: 0.9rem;
  margin-left: 0.25rem;
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
  