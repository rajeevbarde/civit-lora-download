<template>
  <div class="app-container">
    <h1>Model Version Details</h1>
    <div v-if="model && model.modelId && model.modelVersionId" style="margin-bottom: 16px;">
      <a
        :href="`https://civitai.com/models/${model.modelId}?modelVersionId=${model.modelVersionId}`"
        target="_blank"
        rel="noopener noreferrer"
        style="font-size: 16px; color: #1976d2; text-decoration: underline;"
      >
        civitai.com/models/{{ model.modelId }}?modelVersionId={{ model.modelVersionId }}
      </a>
    </div>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="model-detail">
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loop through all model properties -->
          <tr v-for="(value, key) in model" :key="key">
            <td>{{ key }}</td>
            <td>
              <div v-if="typeof value === 'string' && value.includes('<')">
                <div v-html="value"></div>
              </div>
              <div v-else>{{ value }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>


<script>
import { useRoute } from 'vue-router';
import { apiService } from '@/utils/api.js';

export default {
  setup() {
    const route = useRoute();
    return { route };
  },
  data() {
    return {
      model: null,
      loading: false,
      error: null
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
.app-container {
  max-width: 100%;
  margin: auto;
  padding: 20px;
}

.model-detail table {
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.model-detail th,
.model-detail td {
  padding: 12px 15px;
  border-bottom: 1px solid #ddd;
}

.model-detail tr:hover {
  background-color: #f8f8f8;
}
</style>
