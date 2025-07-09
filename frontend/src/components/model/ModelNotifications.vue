<template>
  <div v-if="notifications.length > 0" class="notifications-section">
    <div class="notifications-header">
      <span class="notifications-icon">🔔</span>
      <span class="notifications-label">Notifications</span>
      <span class="notifications-count">({{ notifications.length }})</span>
    </div>
    <div class="notifications-list">
      <div v-for="notification in notifications" :key="notification.id" 
           :class="['notification-item', `notification-${notification.type}`]">
        <div class="notification-content">
          <span class="notification-icon">
            {{ getNotificationIcon(notification.type) }}
          </span>
          <span class="notification-message">{{ notification.message }}</span>
        </div>
        <button @click="removeNotification(notification.id)" class="notification-close" title="Dismiss">
          <span class="close-icon">×</span>
        </button>
      </div>
      <button @click="clearAllNotifications" class="clear-all-btn">
        <span class="clear-icon">🗑️</span>
        <span class="clear-text">Clear All</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';

export default {
  name: 'ModelNotifications',
  setup() {
    const notifications = ref([]);

    const getNotificationIcon = (type) => {
      switch (type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
      }
    };

    const showNotification = (message, type = 'info') => {
      const notification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date()
      };
      
      notifications.value.push(notification);
    };

    const removeNotification = (id) => {
      const index = notifications.value.findIndex(n => n.id === id);
      if (index > -1) {
        notifications.value.splice(index, 1);
      }
    };

    const clearAllNotifications = () => {
      notifications.value = [];
    };

    return {
      notifications,
      getNotificationIcon,
      showNotification,
      removeNotification,
      clearAllNotifications
    };
  }
}
</script>

<style scoped>
/* Enhanced Notifications Section */
.notifications-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.notifications-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.notifications-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.notifications-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.notifications-count {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.notification-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.notification-icon {
  font-size: 1.2rem;
}

.notification-message {
  font-weight: 500;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.3s ease;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: #495057;
}

.clear-all-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
  align-self: flex-start;
}

.clear-all-btn:hover {
  background: linear-gradient(135deg, #5a6268 0%, #343a40 100%);
  transform: translateY(-1px);
}

.clear-icon {
  font-size: 1rem;
}

.clear-text {
  font-weight: 600;
}
</style> 