<template>
  <div v-if="notifications.length > 0" class="notifications-container">
    <div 
      v-for="notification in notifications" 
      :key="notification.id" 
      :class="['notification', `notification-${notification.type}`]"
    >
      <span class="notification-message">{{ notification.message }}</span>
      <button @click="removeNotification(notification.id)" class="notification-close">×</button>
    </div>
    <button @click="clearAllNotifications" class="clear-all-notifications">Clear All</button>
  </div>
</template>

<script>
import { NOTIFICATION_TYPES } from '@/utils/constants.js';
import { generateId } from '@/utils/helpers.js';

export default {
  name: 'NotificationSystem',
  data() {
    return {
      notifications: [],
    };
  },
  methods: {
    showNotification(message, type = NOTIFICATION_TYPES.INFO) {
      const notification = {
        id: generateId(),
        message,
        type,
        timestamp: new Date()
      };
      
      this.notifications.push(notification);
    },
    
    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    },
    
    clearAllNotifications() {
      this.notifications = [];
    },
    
    // Public method to show success notification
    showSuccess(message) {
      this.showNotification(message, NOTIFICATION_TYPES.SUCCESS);
    },
    
    // Public method to show error notification
    showError(message) {
      this.showNotification(message, NOTIFICATION_TYPES.ERROR);
    },
    
    // Public method to show warning notification
    showWarning(message) {
      this.showNotification(message, NOTIFICATION_TYPES.WARNING);
    },
    
    // Public method to show info notification
    showInfo(message) {
      this.showNotification(message, NOTIFICATION_TYPES.INFO);
    }
  }
};
</script>

<style scoped>
.notifications-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
  max-width: 100%;
}

.notification-success {
  background-color: #d1fae5;
  border: 1px solid #10b981;
  color: #065f46;
}

.notification-error {
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #991b1b;
}

.notification-warning {
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
}

.notification-info {
  background-color: #dbeafe;
  border: 1px solid #3b82f6;
  color: #1e40af;
}

.notification-message {
  flex: 1;
  margin-right: 12px;
  word-wrap: break-word;
}

.notification-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.clear-all-notifications {
  background-color: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.clear-all-notifications:hover {
  background-color: #4b5563;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style> 