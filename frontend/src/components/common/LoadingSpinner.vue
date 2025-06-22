<template>
  <div v-if="loading" :class="['loading-container', size]">
    <div class="loading-spinner">
      <div class="spinner"></div>
      <div v-if="message" class="loading-message">{{ message }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'Loading...'
    },
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large'].includes(value)
    }
  }
};
</script>

<style scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-container.small {
  padding: 10px;
}

.loading-container.large {
  padding: 40px;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-container.small .spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.loading-container.medium .spinner {
  width: 30px;
  height: 30px;
  border-width: 3px;
}

.loading-container.large .spinner {
  width: 50px;
  height: 50px;
  border-width: 4px;
}

.loading-message {
  color: #666;
  font-size: 14px;
  text-align: center;
}

.loading-container.small .loading-message {
  font-size: 12px;
}

.loading-container.large .loading-message {
  font-size: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 