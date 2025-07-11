<template>
  <div class="error-section">
    <div class="error-content">
      <span class="error-icon">❌</span>
      <h3>Error Loading Statistics</h3>
      <p>{{ error }}</p>
      <button @click="$emit('retry')" class="retry-button">Retry</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ErrorState',
  props: {
    error: {
      type: String,
      required: true
    }
  },
  emits: ['retry']
};
</script>

<style scoped>
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
</style> 