<template>
  <div class="model-details-section">
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
          <tr v-for="(value, key) in processedModelData" :key="key" class="detail-row">
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
</template>

<script>
export default {
  name: 'ModelDetails',
  props: {
    processedModelData: {
      type: Object,
      required: true
    }
  }
};
</script>

<style scoped>
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

@media (max-width: 768px) {
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
}
</style> 