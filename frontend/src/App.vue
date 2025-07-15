<template>
  <div id="app">
    <!-- Enhanced Navigation Menu -->
    <nav class="main-nav">
      <div class="nav-container">
        <div class="nav-brand">
          <router-link to="/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <span class="brand-icon">🎨</span>
            <span class="brand-text">LoRA Organiser</span>
          </router-link>
        </div>
        <div class="nav-links">
          <router-link to="/summary" class="nav-link">
            <span class="link-icon">📊</span>
            <span class="link-text">Summary</span>
          </router-link>
          <router-link to="/lora-hub" class="nav-link">
            <span class="link-icon">📚</span>
            <span class="link-text">LoRA Hub</span>
          </router-link>
          <router-link to="/file-scanner" class="nav-link">
            <span class="link-icon">🔍</span>
            <span class="link-text">Register</span>
          </router-link>
          <router-link to="/civit-data-fetcher" class="nav-link">
            <span class="link-icon">🔗</span>
            <span class="link-text">Orphan & Duplicate</span>
          </router-link>
          <router-link to="/metadata" class="nav-link">
            <span class="link-icon">📋</span>
            <span class="link-text">Metadata</span>
          </router-link>
          <router-link to="/setting" class="nav-link">
            <span class="link-icon">⚙️</span>
            <span class="link-text">Setting</span>
          </router-link>
        </div>
      </div>
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
@import "@/assets/global.css";
</style>
