<template>
  <div class="statistics-grid" v-if="!loading && !error">
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-content">
        <h3 class="stat-title">Total Registered LoRAs</h3>
        <p class="stat-value">{{ statistics.totalRegistered?.toLocaleString() || 0 }}</p>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-content">
        <h3 class="stat-title">Metadata Fetched</h3>
        <p class="stat-value">{{ statistics.metadataFetched?.toLocaleString() || 0 }}</p>
        <p class="stat-percentage">{{ getPercentage(statistics.metadataFetched, statistics.totalRegistered) }}%</p>
      </div>
    </div>
    
            <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-content">
            <h3 class="stat-title">Metadata Not Fetched</h3>
            <p class="stat-value">{{ statistics.metadataNotFetched?.toLocaleString() || 0 }}</p>
            <p class="stat-percentage stat-percentage-warning">{{ getPercentage(statistics.metadataNotFetched, statistics.totalRegistered) }}%</p>
          </div>
        </div>
  </div>
</template>

<script>
export default {
  name: 'StatisticsGrid',
  props: {
    statistics: {
      type: Object,
      default: () => ({})
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    }
  },
  methods: {
    getPercentage(value, total) {
      if (!value || !total) return 0;
      return ((value / total) * 100).toFixed(1);
    }
  }
};
</script>

<style scoped>
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

.stat-percentage-warning {
  color: #ef4444;
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