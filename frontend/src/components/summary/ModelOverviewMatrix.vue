<template>
  <div class="summary-section" id="overview">
    <div class="section-header">
      <div class="header-content">
        <span class="header-icon">📊</span>
        <div class="header-text">
          <h2 class="section-title">Registered LoRA on your hard drive</h2>
          <p class="section-description">Overview of your Registered LoRA organized by base model and rating</p>
        </div>
      </div>
    </div>
    <div class="section-content">
      <div v-if="loading" class="loading-section">
        <div class="loading-content">
          <span class="loading-icon">⏳</span>
          <span class="loading-text">Loading matrix data...</span>
        </div>
      </div>
      <div v-else-if="error" class="error-section">
        <div class="error-content">
          <span class="error-icon">❌</span>
          <h3 class="error-title">Error Loading Matrix</h3>
          <p class="error-message">{{ error }}</p>
          <button @click="$emit('retry')" class="retry-btn">
            <span class="btn-icon">🔄</span>
            <span class="btn-text">Retry</span>
          </button>
        </div>
      </div>
      <div v-else-if="matrixData" class="matrix-container">
        <div class="matrix-table-container">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="base-model-header">Base Model</th>
                <th v-for="nsfwGroup in matrixData.nsfwGroups" :key="nsfwGroup" class="nsfw-header">{{ nsfwGroup }}</th>
                <th class="total-header">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="baseModel in matrixData.baseModels" :key="baseModel" class="matrix-row">
                <td class="base-model-cell">{{ baseModel }}</td>
                <td v-for="nsfwGroup in matrixData.nsfwGroups" :key="nsfwGroup" class="count-cell" :class="{ 'zero-count': matrixData.matrix[baseModel][nsfwGroup] === 0 }">
                  {{ matrixData.matrix[baseModel][nsfwGroup] }}
                </td>
                <td class="total-cell">
                  {{ getRowTotal(baseModel) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td class="total-label">Total</td>
                <td v-for="nsfwGroup in matrixData.nsfwGroups" :key="nsfwGroup" class="column-total">
                  {{ getColumnTotal(nsfwGroup) }}
                </td>
                <td class="grand-total">{{ getGrandTotal() }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div v-else class="no-data-section">
        <div class="no-data-content">
          <span class="no-data-icon">📭</span>
          <h3 class="no-data-title">No Matrix Data</h3>
          <p class="no-data-message">No matrix data available at the moment.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModelOverviewMatrix',
  props: {
    matrixData: Object,
    loading: Boolean,
    error: String
  },
  methods: {
    getRowTotal(baseModel) {
      if (!this.matrixData) return 0;
      return this.matrixData.nsfwGroups.reduce((total, nsfwGroup) => {
        return total + this.matrixData.matrix[baseModel][nsfwGroup];
      }, 0);
    },
    getColumnTotal(nsfwGroup) {
      if (!this.matrixData) return 0;
      return this.matrixData.baseModels.reduce((total, baseModel) => {
        return total + this.matrixData.matrix[baseModel][nsfwGroup];
      }, 0);
    },
    getGrandTotal() {
      if (!this.matrixData) return 0;
      return this.matrixData.baseModels.reduce((total, baseModel) => {
        return total + this.getRowTotal(baseModel);
      }, 0);
    }
  }
};
</script>

<style scoped>
.summary-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.section-header {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
}
.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.header-text {
  flex: 1;
}
.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #1e293b;
  letter-spacing: -0.025em;
}
.section-description {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
.section-content {
  padding: 32px;
}
.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.loading-icon {
  font-size: 2rem;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.loading-text {
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 500;
}
.error-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}
.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 400px;
}
.error-icon {
  font-size: 3rem;
  color: #ef4444;
}
.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.error-message {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
.retry-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}
.retry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}
.retry-btn:active {
  transform: translateY(0);
}
.btn-icon {
  font-size: 1rem;
}
.btn-text {
  font-weight: 600;
}
.no-data-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}
.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 400px;
}
.no-data-icon {
  font-size: 3rem;
  color: #94a3b8;
}
.no-data-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.no-data-message {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
.matrix-container {
  margin-top: 0;
}
.matrix-table-container {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 600px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.matrix-table th,
.matrix-table td {
  padding: 16px 12px;
  text-align: center;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}
.matrix-table th {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  font-weight: 700;
  color: #0c4a6e;
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 0.875rem;
  letter-spacing: 0.025em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.base-model-header {
  text-align: left !important;
  min-width: 180px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
  color: #92400e !important;
  font-size: 1rem !important;
}
.nsfw-header {
  min-width: 120px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
  color: #0c4a6e !important;
}
.total-header {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important;
  font-weight: 800 !important;
  min-width: 100px;
  color: #065f46 !important;
  font-size: 1rem !important;
}
.base-model-cell {
  text-align: left !important;
  font-weight: 600;
  background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
  color: #92400e;
  font-size: 1rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.count-cell {
  font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e293b;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;
}
.count-cell:hover {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1;
}
.zero-count {
  color: #94a3b8;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-weight: 400;
  opacity: 0.7;
}
.total-cell {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  font-weight: 700;
  color: #065f46;
  font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 1rem;
}
.total-row {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}
.total-label {
  font-weight: 800;
  text-align: left !important;
  color: #92400e;
  font-size: 0.875rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.column-total {
  font-weight: 800;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  color: #065f46;
  font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 1rem;
}
.grand-total {
  font-weight: 800;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: white;
  font-size: 1rem;
  font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
</style> 