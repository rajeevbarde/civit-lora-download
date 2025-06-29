import { COLORS } from './constants.js';

// Retry configuration from environment variables
const RETRY_CONFIG = {
  MAX_RETRIES: parseInt(import.meta.env.VITE_RETRY_MAX_ATTEMPTS) || 3,
  BASE_DELAY: parseInt(import.meta.env.VITE_RETRY_BASE_DELAY) || 1000,
};

/**
 * Format a date timestamp to a readable string
 * @param {string|number} timestamp - The timestamp to format
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return '-';
  
  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return timestamp; // Return original if invalid
    }
    
    // Format: "Jan 15, 2024 2:30:45 PM"
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return timestamp; // Return original if formatting fails
  }
}

/**
 * Format a number with locale-specific formatting
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(number) {
  if (number === null || number === undefined) return '-';
  return number.toLocaleString();
}

/**
 * Interpolate between two hex colors
 * @param {string} a - First hex color
 * @param {string} b - Second hex color
 * @param {number} t - Interpolation factor (0-1)
 * @returns {string} Interpolated hex color
 */
export function interpolateColor(a, b, t) {
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const num = parseInt(hex, 16);
    return [num >> 16, (num >> 8) & 0xff, num & 0xff];
  }
  
  function rgbToHex([r, g, b]) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  const rgb = rgbA.map((v, i) => Math.round(v + (rgbB[i] - v) * t));
  return rgbToHex(rgb);
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Validate if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Convert file size in bytes to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Human readable size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Safe error handler for async operations
 * @param {Function} asyncFn - Async function to execute
 * @param {string} errorMessage - Default error message
 * @param {Function} onError - Optional error callback
 * @returns {Promise} Promise that resolves with result or rejects with handled error
 */
export async function safeAsync(asyncFn, errorMessage = 'Operation failed', onError = null) {
  try {
    return await asyncFn();
  } catch (error) {
    const message = error.message || errorMessage;
    console.error('Safe async error:', message, error);
    
    if (onError && typeof onError === 'function') {
      onError(error, message);
    }
    
    throw new Error(message);
  }
}

/**
 * Validate required fields in an object
 * @param {Object} obj - Object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result with isValid and missingFields
 */
export function validateRequiredFields(obj, requiredFields) {
  const missingFields = requiredFields.filter(field => {
    const value = obj[field];
    return value === undefined || value === null || value === '';
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Promise that resolves with result or rejects after max retries
 */
export async function retryWithBackoff(fn, maxRetries = RETRY_CONFIG.MAX_RETRIES, baseDelay = RETRY_CONFIG.BASE_DELAY) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: delay = baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Debounce function with immediate option
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
} 