// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  API_VERSION: import.meta.env.VITE_API_VERSION || 'v1',
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  CIVITAI_BASE_URL: import.meta.env.VITE_CIVITAI_BASE_URL || 'https://civitai.com/api/v1',
};

// Frontend Configuration
export const FRONTEND_CONFIG = {
  BASE_URL: import.meta.env.VITE_FRONTEND_BASE_URL || 'http://localhost:5173',
};

// Download Status
export const DOWNLOAD_STATUS = {
  NOT_DOWNLOADED: 0,
  DOWNLOADED: 1,
  DOWNLOADING: 2,
  FAILED: 3,
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 50,
  MAX_PAGE_SIZE: parseInt(import.meta.env.VITE_MAX_PAGE_SIZE) || 100,
};

// Polling Configuration
export const POLLING_CONFIG = {
  STATUS_INTERVAL: parseInt(import.meta.env.VITE_POLLING_STATUS_INTERVAL) || 2000, // 2 seconds
  MAX_POLLS: parseInt(import.meta.env.VITE_POLLING_MAX_POLLS) || 300, // 10 minutes
  CLEANUP_INTERVAL: parseInt(import.meta.env.VITE_POLLING_CLEANUP_INTERVAL) || 30000, // 30 seconds
};

// File Status
export const FILE_STATUS = {
  PRESENT: 'Present',
  NOT_PRESENT: '',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
};

// Tab Configuration
export const TABS = {
  PRESENT: { key: 'present', label: 'Present' },
  NOT_PRESENT: { key: 'not-present', label: 'Not Present' },
};

// CSS Classes
export const CSS_CLASSES = {
  STATUS: {
    PRESENT: 'status-present',
    NOT_PRESENT: 'status-not-present',
    PROCESSING: 'processing',
    SUCCESS: 'success',
    ERROR: 'error',
  },
  NOTIFICATION: {
    SUCCESS: 'notification-success',
    ERROR: 'notification-error',
    WARNING: 'notification-warning',
    INFO: 'notification-info',
  },
};

// Color Schemes
export const COLORS = {
  STATUS: {
    ZERO: '#fef2f2',
    ZERO_TEXT: '#dc2626',
  },
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error: Cannot connect to server',
  SERVER: 'Server error: Please try again later',
  INVALID_MODEL_ID: 'Invalid model ID',
  FETCH_FAILED: 'Failed to load data',
  DOWNLOAD_FAILED: 'Download failed',
  SCAN_FAILED: 'Error scanning for missing files',
  FIX_FAILED: 'Error fixing file',
  VALIDATION_FAILED: 'Error validating files',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  DOWNLOAD_QUEUED: 'Download queued successfully',
  DOWNLOAD_COMPLETED: 'Download completed',
  FILE_FIXED: 'File fixed successfully',
  PATH_SAVED: 'Path saved successfully',
  PATH_DELETED: 'Path deleted successfully',
  FILES_MARKED: 'Files marked as downloaded',
  VALIDATION_COMPLETED: 'Validation completed',
}; 