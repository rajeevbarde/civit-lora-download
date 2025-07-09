<template>
  <div class="error-section">
    <div class="error-content">
      <span class="error-icon">❌</span>
      <h3 class="error-title">Error Loading Models</h3>
      <p class="error-message">{{ error }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModelErrorState',
  props: {
    error: {
      type: String,
      default: 'An unknown error occurred'
    }
  },
  setup() {
    return {};
  }
}
</script>

<style scoped>
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
</style> 