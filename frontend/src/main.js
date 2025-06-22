import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  console.error('Global error caught:', error);
  console.error('Component:', instance);
  console.error('Error info:', info);
  
  // You could send this to an error reporting service
  // Example: Sentry, LogRocket, etc.
  
  // Prevent the error from crashing the app
  return false;
};

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent the default browser behavior
});

// Handle unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
  event.preventDefault(); // Prevent the default browser behavior
});

app.use(router).mount('#app');
