<template>
  <div class="app-container">
    <!-- Enhanced Header Section -->
    <div class="header-section">
      <h1 class="page-title">Model Version Details</h1>
      <p class="page-subtitle">View detailed information about your selected model version</p>
    </div>

    <!-- Enhanced CivitAI Link Section -->
    <div v-if="model && model.modelId && model.modelVersionId" class="civitai-link-section">
      <div class="link-header">
        <span class="link-icon">🔗</span>
        <span class="link-label">View on CivitAI</span>
      </div>
      <a
        :href="`${civitaiBaseUrl}/models/${model.modelId}?modelVersionId=${model.modelVersionId}`"
        target="_blank"
        rel="noopener noreferrer"
        class="civitai-link"
      >
        <span class="link-text">civitai.com/models/{{ model.modelId }}?modelVersionId={{ model.modelVersionId }}</span>
        <span class="external-icon">↗️</span>
      </a>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-section">
      <div class="loading-content">
        <span class="loading-icon">⏳</span>
        <span class="loading-text">Loading model details...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-section">
      <div class="error-content">
        <span class="error-icon">❌</span>
        <h3 class="error-title">Error Loading Model</h3>
        <p class="error-message">{{ error }}</p>
      </div>
    </div>

    <!-- Model Details Section -->
    <div v-else class="model-details-section">
      <div class="details-header">
        <h2 class="details-title">Model Information</h2>
        <p class="details-subtitle">Complete details for this model version</p>
      </div>
      
      <div class="details-table-container">
        <table class="details-table">
          <thead>
            <tr>
              <th class="field-header">Field</th>
              <th class="value-header">Value</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loop through all model properties -->
            <tr v-for="(value, key) in model" :key="key" class="detail-row">
              <td class="field-cell">{{ key }}</td>
              <td class="value-cell">
                <div v-if="typeof value === 'string' && value.includes('<')" class="html-content">
                  <div v-html="value"></div>
                </div>
                <div v-else class="text-content">{{ value }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>


<script>
import { useRoute } from 'vue-router';
import { apiService } from '@/utils/api.js';
import { API_CONFIG } from '@/utils/constants.js';

export default {
  setup() {
    const route = useRoute();
    return { route };
  },
  data() {
    return {
      model: null,
      loading: false,
      error: null,
      civitaiBaseUrl: API_CONFIG.CIVITAI_BASE_URL.replace('/api/v1', '')
    };
  },
  mounted() {
    this.fetchModelDetails();
  },
  methods: {
    async fetchModelDetails() {
      try {
        this.loading = true;
        this.error = null;
        
        const modelVersionId = Number(this.route.params.modelVersionId);
        const urlModelId = Number(this.route.params.modelId);
        
        if (isNaN(modelVersionId)) {
          throw new Error("Invalid model version ID");
        }
        
        if (isNaN(urlModelId)) {
          throw new Error("Invalid model ID");
        }

        // Fetch from your API using modelVersionId
        const response = await apiService.getModelDetail(modelVersionId);
        this.model = response;
        
        // Validate that the modelId from URL matches the modelId from backend
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
  },
};
</script>


<style scoped>
/* Enhanced Header Section Styles */
.header-section {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 0;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #2c3e50;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.2rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Enhanced CivitAI Link Section */
.civitai-link-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.link-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.link-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.link-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.civitai-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.9);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  color: #667eea;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.civitai-link:hover {
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  color: #5a6fd8;
}

.link-text {
  font-family: 'Courier New', monospace;
  font-size: 1rem;
}

.external-icon {
  font-size: 1.2rem;
  margin-left: 0.5rem;
}

/* Loading State */
.loading-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 3rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
  text-align: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-icon {
  font-size: 3rem;
  animation: spin 2s linear infinite;
}

.loading-text {
  font-size: 1.2rem;
  color: #6c757d;
  font-weight: 500;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Error State */
.error-section {
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #feb2b2;
  text-align: center;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-icon {
  font-size: 3rem;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #c53030;
  margin: 0;
}

.error-message {
  font-size: 1rem;
  color: #742a2a;
  margin: 0;
  line-height: 1.5;
}

/* Model Details Section */
.model-details-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.details-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.details-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
}

.details-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.details-table-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
  overflow-x: auto;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.field-header,
.value-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 1rem;
}

.field-header {
  width: 30%;
  min-width: 150px;
}

.value-header {
  width: 70%;
}

.detail-row {
  transition: all 0.3s ease;
}

.detail-row:hover {
  background: #f8f9fa;
  transform: translateX(4px);
}

.field-cell {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
  color: #2c3e50;
  background: #f8f9fa;
  font-size: 0.95rem;
  text-transform: capitalize;
}

.value-cell {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
  font-size: 0.95rem;
  line-height: 1.5;
}

.text-content {
  word-break: break-word;
}

.html-content {
  word-break: break-word;
}

.html-content :deep(a) {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.html-content :deep(a):hover {
  text-decoration: underline;
}

/* Responsive design */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1.1rem;
  }
  
  .model-details-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .details-title {
    font-size: 1.5rem;
  }
  
  .details-subtitle {
    font-size: 1rem;
  }
  
  .details-table-container {
    padding: 1rem;
  }
  
  .field-header,
  .value-header,
  .field-cell,
  .value-cell {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  
  .civitai-link {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .external-icon {
    align-self: flex-end;
  }
}

/* Base container styles */
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
