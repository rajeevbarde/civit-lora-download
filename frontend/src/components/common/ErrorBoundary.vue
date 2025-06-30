<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <h2>⚠️ Something went wrong</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <button @click="retry" class="retry-btn">Try Again</button>
        <button @click="goHome" class="home-btn">Go Home</button>
        <button @click="showDetails = !showDetails" class="details-btn">
          {{ showDetails ? 'Hide' : 'Show' }} Details
        </button>
      </div>
      <div v-if="showDetails" class="error-details">
        <h3>Error Details:</h3>
        <pre class="error-stack">{{ errorStack }}</pre>
      </div>
    </div>
  </div>
  <div v-else>
    <slot />
  </div>
</template>

<script>
import { useRouter } from 'vue-router';

export default {
  name: 'ErrorBoundary',
  setup() {
    const router = useRouter();
    return { router };
  },
  data() {
    return {
      hasError: false,
      errorMessage: '',
      errorStack: '',
      showDetails: false,
      retryKey: 0 // Used to force re-render
    };
  },
  methods: {
    handleError(error, errorInfo) {
      console.error('Error caught by ErrorBoundary:', error, errorInfo);
      
      this.hasError = true;
      this.errorMessage = error.message || 'An unexpected error occurred';
      this.errorStack = error.stack || 'No stack trace available';
      
      // You could also send this to an error reporting service
      // this.reportError(error, errorInfo);
    },
    
    retry() {
      this.hasError = false;
      this.errorMessage = '';
      this.errorStack = '';
      this.showDetails = false;
      
      // Force a re-render by updating the key
      this.retryKey++;
      
      // Alternative: Use nextTick to ensure DOM updates
      this.$nextTick(() => {
        // The component will re-render with the new key
      });
    },
    
    goHome() {
      this.router.push('/');
    },
    
    // Optional: Report errors to external service
    reportError(error, errorInfo) {
      // Example: Send to error reporting service
    }
  },
  
  // Catch errors in child components
  errorCaptured(error, instance, info) {
    this.handleError(error, info);
    return false; // Prevent error from propagating
  }
};
</script>

<style scoped>
.error-boundary {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin: 1rem;
}

.error-content {
  text-align: center;
  max-width: 600px;
}

.error-content h2 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-message {
  color: #6c757d;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.retry-btn, .home-btn, .details-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.retry-btn {
  background-color: #007bff;
  color: white;
}

.retry-btn:hover {
  background-color: #0056b3;
}

.home-btn {
  background-color: #6c757d;
  color: white;
}

.home-btn:hover {
  background-color: #545b62;
}

.details-btn {
  background-color: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.details-btn:hover {
  background-color: #e9ecef;
}

.error-details {
  text-align: left;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.error-details h3 {
  color: #495057;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.error-stack {
  background-color: #f1f3f4;
  padding: 1rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #495057;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}
</style> 