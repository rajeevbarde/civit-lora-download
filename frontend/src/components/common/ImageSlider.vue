<template>
  <div class="image-slider-container">
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
import { apiService } from '@/utils/api.js';

export default {
  name: 'ImageSlider',
  props: {
    modelId: {
      type: [Number, String],
      required: true
    },
    modelVersionId: {
      type: [Number, String],
      required: true
    },
    size: {
      type: String,
      default: 'medium', // 'small', 'medium', 'large'
      validator: value => ['small', 'medium', 'large'].includes(value)
    }
  },
  data() {
    return {
      modelImages: [],
      currentImageIndex: 0,
      imageLoading: false,
      showPreview: false,
      imageDimensions: ''
    };
  },
  watch: {
    modelId: {
      handler() {
        this.fetchModelImages();
      },
      immediate: true
    },
    modelVersionId: {
      handler() {
        this.fetchModelImages();
      },
      immediate: true
    }
  },
  methods: {
    // Image Fetching Methods
    async fetchModelImages() {
      if (!this.modelId || !this.modelVersionId) {
        this.modelImages = [];
        return;
      }
      
      try {
        this.imageLoading = true;
        
        // Construct the predictable path format
        const jsonPath = `backend/data/modeljson/${this.modelId}/${this.modelVersionId}/${this.modelId}_${this.modelVersionId}.json`;
        
        let jsonData;
        
        try {
          // First, try to read the existing JSON file
          jsonData = await apiService.readJsonFile(jsonPath);
        } catch (fileError) {
          console.log('JSON file not found locally, attempting to download from API...');
          
          // If file doesn't exist, download it from the API
          try {
            const downloadResult = await apiService.downloadJsonMetadata(this.modelId, this.modelVersionId);
            
            if (downloadResult.success) {
              // Now try to read the newly downloaded file
              jsonData = await apiService.readJsonFile(jsonPath);
            } else {
              throw new Error(downloadResult.message || 'Failed to download metadata');
            }
          } catch (downloadError) {
            console.error('Failed to download metadata:', downloadError);
            throw new Error(`Failed to download metadata: ${downloadError.message}`);
          }
        }
        
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
        this.$emit('error', err.message || 'Failed to load model images');
      } finally {
        this.imageLoading = false;
      }
    },
    
    // Navigation Methods
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
/* Container */
.image-slider-container {
  display: flex;
  align-items: center;
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

/* Placeholder */
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

/* Size Variants */
.image-slider.small,
.model-image-placeholder.small {
  width: 120px;
  height: 180px;
}

.image-slider.medium,
.model-image-placeholder.medium {
  width: 256px;
  height: 384px;
}

.image-slider.large,
.model-image-placeholder.large {
  width: 320px;
  height: 480px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .image-slider,
  .model-image-placeholder {
    width: 170px;
    height: 256px;
  }
  
  .slider-arrow {
    width: 28px;
    height: 28px;
    font-size: 1rem;
  }
  
  .image-slider.small,
  .model-image-placeholder.small {
    width: 80px;
    height: 120px;
  }
  
  .image-slider.medium,
  .model-image-placeholder.medium {
    width: 170px;
    height: 256px;
  }
  
  .image-slider.large,
  .model-image-placeholder.large {
    width: 220px;
    height: 330px;
  }
}
</style> 