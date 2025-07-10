<template>
  <div class="metadata-page">
    <div class="page-header">
      <h1>Metadata</h1>
      <p>Manage and view metadata information</p>
    </div>
    
    <div class="page-content">
      <!-- Statistics Cards -->
      <div class="statistics-grid">
        <div class="stat-card" v-if="!loading && !error">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <h3 class="stat-title">Total Registered LoRAs</h3>
            <p class="stat-value">{{ statistics.totalRegistered?.toLocaleString() || 0 }}</p>
          </div>
        </div>
        
        <div class="stat-card" v-if="!loading && !error">
          <div class="stat-icon">🏷️</div>
          <div class="stat-content">
            <h3 class="stat-title">Trigger Words</h3>
            <p class="stat-value">{{ statistics.withTriggerWords?.toLocaleString() || 0 }}</p>
            <p class="stat-percentage">{{ getPercentage(statistics.withTriggerWords, statistics.totalRegistered) }}%</p>
          </div>
        </div>
        
        <div class="stat-card" v-if="!loading && !error">
          <div class="stat-icon">📄</div>
          <div class="stat-content">
            <h3 class="stat-title">CivitAI Metadata</h3>
            <p class="stat-value">{{ statistics.withJsonMetadata?.toLocaleString() || 0 }}</p>
            <p class="stat-percentage">{{ getPercentage(statistics.withJsonMetadata, statistics.totalRegistered) }}%</p>
          </div>
        </div>
        
        <div class="stat-card" v-if="!loading && !error">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3 class="stat-title">With Both</h3>
            <p class="stat-value">{{ statistics.withBoth?.toLocaleString() || 0 }}</p>
            <p class="stat-percentage">{{ getPercentage(statistics.withBoth, statistics.totalRegistered) }}%</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-section" v-if="loading">
        <div class="loading-spinner">⏳</div>
        <p>Loading metadata statistics...</p>
      </div>

      <!-- Error State -->
      <div class="error-section" v-if="error">
        <div class="error-content">
          <span class="error-icon">❌</span>
          <h3>Error Loading Statistics</h3>
          <p>{{ error }}</p>
          <button @click="loadStatistics" class="retry-button">Retry</button>
        </div>
      </div>

      <!-- Additional Content -->
      <div class="content-card" v-if="!loading && !error">
        <h2>Metadata Management</h2>
        <p>This page shows statistics about metadata completeness for your downloaded LoRAs.</p>
        
        <div class="action-section">
          <button 
            @click="fetchMetadata" 
            :disabled="fetchingMetadata"
            class="fetch-metadata-btn"
          >
            <span v-if="fetchingMetadata" class="btn-spinner">⏳</span>
            <span v-else class="btn-icon">🔄</span>
            {{ fetchingMetadata ? 'Fetching Metadata...' : 'Fetch Metadata' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, inject } from 'vue';
import { apiService } from '../utils/api.js';

export default {
  name: 'MetadataPage',
  setup() {
    const statistics = ref({});
    const loading = ref(false);
    const error = ref(null);
    const fetchingMetadata = ref(false);

    // Get notification functions at setup level
    const showSuccess = inject('showSuccess');
    const showError = inject('showError');

    const loadStatistics = async () => {
      loading.value = true;
      error.value = null;
      try {
        statistics.value = await apiService.getMetadataStatistics();
      } catch (err) {
        error.value = err.message || 'Failed to load metadata statistics';
        console.error('Error loading metadata statistics:', err);
      } finally {
        loading.value = false;
      }
    };

    const fetchMetadata = async () => {
      fetchingMetadata.value = true;
      try {
        console.log('Fetching metadata from CivitAI API...');
        
        // Call the API to fetch metadata (Step 1)
        const result = await apiService.fetchMetadata();
        
        console.log('Metadata fetched successfully:', result);
        
        // Show success message using the notification system
        if (result.success && showSuccess) {
          showSuccess(result.message);
        }
        
        // After fetching metadata, reload statistics
        await loadStatistics();
        
      } catch (err) {
        console.error('Error fetching metadata:', err);
        
        // Show error message using the notification system
        if (showError) {
          showError(err.message || 'Failed to fetch metadata');
        }
      } finally {
        fetchingMetadata.value = false;
      }
    };

    const getPercentage = (value, total) => {
      if (!value || !total) return 0;
      return ((value / total) * 100).toFixed(1);
    };

    onMounted(() => {
      loadStatistics();
    });

    return {
      statistics,
      loading,
      error,
      fetchingMetadata,
      loadStatistics,
      fetchMetadata,
      getPercentage
    };
  }
};
</script>

<style scoped>
.metadata-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1.1rem;
  color: #7f8c8d;
  margin: 0;
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Statistics Grid */
.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e8ed;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.stat-percentage {
  font-size: 0.875rem;
  color: #10b981;
  font-weight: 600;
  margin: 0;
}

/* Loading Section */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e8ed;
}

.loading-spinner {
  font-size: 2rem;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-section p {
  color: #64748b;
  margin: 0;
}

/* Error Section */
.error-section {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.error-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e8ed;
  text-align: center;
  max-width: 400px;
}

.error-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.error-content h3 {
  color: #dc2626;
  margin: 0 0 1rem 0;
}

.error-content p {
  color: #64748b;
  margin: 0 0 1.5rem 0;
}

.retry-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.retry-button:hover {
  background: #2563eb;
}

/* Content Card */
.content-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e8ed;
}

.content-card h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.content-card p {
  color: #7f8c8d;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

.action-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.fetch-metadata-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.fetch-metadata-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.fetch-metadata-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon, .btn-spinner {
  font-size: 1.1rem;
}

.btn-spinner {
  animation: spin 1s linear infinite;
}

.metadata-info h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 1rem 0;
}

.metadata-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.metadata-info li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
  color: #64748b;
  line-height: 1.5;
}

.metadata-info li:last-child {
  border-bottom: none;
}

.metadata-info strong {
  color: #2c3e50;
}

/* Responsive Design */
@media (max-width: 768px) {
  .statistics-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-icon {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
}
</style> 