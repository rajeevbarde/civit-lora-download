<template>
  <div class="image-carousel-container">
    <!-- Image Carousel -->
    <div v-if="modelImages.length > 0" class="image-carousel">
      <div class="carousel-container">
        <!-- First Image -->
        <div class="carousel-image-wrapper">
          <img 
            :src="modelImages[currentImageIndex]" 
            :alt="`Model image ${currentImageIndex + 1}`"
            class="carousel-image"
            @error="handleImageError"
          />
        </div>
        
        <!-- Second Image (if available) -->
        <div v-if="modelImages.length > 1" class="carousel-image-wrapper">
          <img 
            :src="modelImages[getSecondImageIndex()]" 
            :alt="`Model image ${getSecondImageIndex() + 1}`"
            class="carousel-image"
            @error="handleImageError"
          />
        </div>
        
        <!-- Navigation Arrows -->
        <button 
          v-if="modelImages.length > 2"
          @click="previousImage" 
          class="carousel-arrow carousel-arrow-left"
          aria-label="Previous image"
        >
          ‹
        </button>
        <button 
          v-if="modelImages.length > 2"
          @click="nextImage" 
          class="carousel-arrow carousel-arrow-right"
          aria-label="Next image"
        >
          ›
        </button>
        
        <!-- Image Counter -->
        <div v-if="modelImages.length > 2" class="image-counter">
          {{ currentImageIndex + 1 }}-{{ getSecondImageIndex() + 1 }} / {{ modelImages.length }}
        </div>
      </div>
    </div>
    
    <!-- Placeholder when no images -->
    <div v-else class="model-image-placeholder">
      <div class="image-icon">🖼️</div>
      <span class="image-text">Image Not Found</span>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';

export default {
  name: 'ImageCarousel',
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
      imageLoading: false
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
        
        // First, check if we have locally cached images
        try {
          const localImagesResult = await apiService.getLocalImages(this.modelId, this.modelVersionId);
          
          if (localImagesResult.success && localImagesResult.hasCachedTxt && localImagesResult.localImages.length > 0) {
            // Use local images - much faster!
            this.modelImages = localImagesResult.localImages;
            this.currentImageIndex = 0;
            return;
          }
        } catch (localError) {
          // Local images check failed, falling back to URL-based approach
        }
        
        // Fallback: Use the original URL-based approach
        
        // Construct the predictable path format
        const jsonPath = `backend/data/modeljson/${this.modelId}/${this.modelVersionId}/${this.modelId}_${this.modelVersionId}.json`;
        
        let jsonData;
        
        try {
          // First, try to read the existing JSON file
          jsonData = await apiService.readJsonFile(jsonPath);
        } catch (fileError) {
          // JSON file not found locally, attempting to download from API
          
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
        this.modelImages = [];
        this.$emit('error', err.message || 'Failed to load model images');
      } finally {
        this.imageLoading = false;
      }
    },
    
    // Navigation Methods
    nextImage() {
      if (this.modelImages.length > 2) {
        this.currentImageIndex = (this.currentImageIndex + 2) % this.modelImages.length;
      }
    },
    
    previousImage() {
      if (this.modelImages.length > 2) {
        this.currentImageIndex = this.currentImageIndex === 0 
          ? Math.max(0, this.modelImages.length - 2) 
          : this.currentImageIndex - 2;
      }
    },
    
    getSecondImageIndex() {
      if (this.modelImages.length <= 1) {
        return this.currentImageIndex;
      }
      return (this.currentImageIndex + 1) % this.modelImages.length;
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
    }
  }
};
</script>

<style scoped>
/* Container */
.image-carousel-container {
  display: flex;
  align-items: center;
}

/* Image Carousel */
.image-carousel {
  width: 240px;
  height: 200px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.image-carousel:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.carousel-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-image-wrapper {
  width: 50%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.carousel-image-wrapper:first-child {
  border-right: 1px solid rgba(255, 255, 255, 0.3);
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.carousel-arrow:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: translateY(-50%) scale(1.1);
}

.carousel-arrow-left {
  left: 4px;
}

.carousel-arrow-right {
  right: 4px;
}

.image-counter {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 0.6rem;
  font-weight: 600;
  z-index: 10;
}

/* Placeholder */
.model-image-placeholder {
  width: 240px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
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
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.image-text {
  font-size: 0.8rem;
  opacity: 0.9;
  text-align: center;
}

/* Size Variants */
.image-carousel.small,
.model-image-placeholder.small {
  width: 240px;
  height: 200px;
}

.image-carousel.medium,
.model-image-placeholder.medium {
  width: 240px;
  height: 400px;
}

.image-carousel.large,
.model-image-placeholder.large {
  width: 300px;
  height: 500px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .image-carousel,
  .model-image-placeholder {
    width: 100px;
    height: 160px;
  }
  
  .carousel-arrow {
    width: 20px;
    height: 20px;
    font-size: 0.8rem;
  }
  
  .image-carousel.small,
  .model-image-placeholder.small {
    width: 80px;
    height: 120px;
  }
  
  .image-carousel.medium,
  .model-image-placeholder.medium {
    width: 160px;
    height: 240px;
  }
  
  .image-carousel.large,
  .model-image-placeholder.large {
    width: 200px;
    height: 300px;
  }
}
</style> 