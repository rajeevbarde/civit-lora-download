<template>
  <div class="loading-section">
    <div class="loading-content">
      <span class="loading-icon">⏳</span>
      <span class="loading-text">Loading LoRA models...</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModelLoadingState',
  setup() {
    return {};
  }
}
</script>

<style scoped>
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

/* Loading Animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 