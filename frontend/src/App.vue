<template>
  <div id="app">
    <nav class="main-nav">
      <router-link to="/summary">Summary</router-link>
      <router-link to="/file-scanner">File Scanner</router-link>
      <router-link to="/civit-data-fetcher">Civit Data Fetcher</router-link>
      <router-link to="/lora-hub">LORA Hub</router-link>
    </nav>
    <main class="main-content">
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
    </main>
    <NotificationSystem ref="notificationSystemRef" />
  </div>
</template>

<script>
import { ref, provide } from 'vue';
import NotificationSystem from '@/components/common/NotificationSystem.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';

export default {
  name: 'App',
  components: {
    NotificationSystem,
    ErrorBoundary
  },
  setup() {
    const notificationSystemRef = ref(null);
    
    // Provide notification methods to child components
    provide('showNotification', (message, type) => {
      if (notificationSystemRef.value) {
        notificationSystemRef.value.showNotification(message, type);
      }
    });
    
    provide('showSuccess', (message) => {
      if (notificationSystemRef.value) {
        notificationSystemRef.value.showSuccess(message);
      }
    });
    
    provide('showError', (message) => {
      if (notificationSystemRef.value) {
        notificationSystemRef.value.showError(message);
      }
    });
    
    provide('showWarning', (message) => {
      if (notificationSystemRef.value) {
        notificationSystemRef.value.showWarning(message);
      }
    });
    
    provide('showInfo', (message) => {
      if (notificationSystemRef.value) {
        notificationSystemRef.value.showInfo(message);
      }
    });
    
    return {
      notificationSystemRef
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-nav {
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.main-nav a {
  margin-right: 2rem;
  text-decoration: none;
  color: #666;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.main-nav a:hover {
  color: #007bff;
  background-color: #f8f9fa;
}

.main-nav a.router-link-exact-active {
  color: #007bff;
  background-color: #e3f2fd;
  font-weight: 600;
}

.main-content {
  flex: 1;
  padding: 1rem;
  width: 100%;
}

/* Global table styles */
table {
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
}

th, td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
  font-size: 12px;
}

tr:hover {
  background-color: #f8f9fa;
}

/* Global button styles */
button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  transition: all 0.2s ease;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Global input styles */
input, select, textarea {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Global card styles */
.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

/* Table wrapper for horizontal scrolling */
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Responsive design */
@media (max-width: 768px) {
  .main-nav {
    padding: 1rem;
  }
  
  .main-nav a {
    margin-right: 1rem;
    padding: 0.5rem;
    font-size: 14px;
  }
  
  .main-content {
    padding: 0.5rem;
  }
  
  table {
    font-size: 11px;
  }
  
  th, td {
    padding: 6px 8px;
  }
}
</style>
