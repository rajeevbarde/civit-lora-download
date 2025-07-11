<template>
  <div class="loading-section">
    <div class="loading-spinner">⏳</div>
    <p>Loading metadata statistics...</p>
  </div>
</template>

<script>
export default {
  name: 'LoadingState'
};
</script>

<style scoped>
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
</style> 