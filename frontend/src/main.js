import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  // You could send this to an error reporting service
  // Example: Sentry, LogRocket, etc.
  
  // Prevent the error from crashing the app
  return false;
};

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Prevent the default browser behavior
});

// Handle unhandled errors
window.addEventListener('error', (event) => {
  // Prevent the default browser behavior
});

app.use(router).mount('#app');
