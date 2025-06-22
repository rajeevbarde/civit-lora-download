import { COLORS } from './constants.js';

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
 * Generate gradient style for matrix cells
 * @param {number} val - Current value
 * @param {number} max - Maximum value for normalization
 * @returns {string} CSS style string
 */
export function getGreenGradientStyle(val, max) {
  if (!val || max === 0) {
    return '';
  }
  
  let percent = max ? val / max : 0;
  if (percent < 0.01) percent = 0.01;
  if (percent > 1) percent = 1;
  
  let bg = '';
  if (percent < 0.7) {
    // #f9f9f9 to #bbf7d0
    bg = interpolateColor(COLORS.GRADIENT.START, COLORS.GRADIENT.MIDDLE, percent / 0.7);
  } else {
    // #bbf7d0 to #22c55e
    bg = interpolateColor(COLORS.GRADIENT.MIDDLE, COLORS.GRADIENT.END, (percent - 0.7) / 0.3);
  }
  return `background: ${bg};`;
}

/**
 * Calculate total for a specific base model in matrix
 * @param {Array} matrix - The matrix data
 * @param {string} baseModel - The base model to calculate total for
 * @returns {number} Total count
 */
export function calculateMatrixTotal(matrix, baseModel) {
  return matrix.reduce((sum, row) => sum + (row[baseModel] || 0), 0);
}

/**
 * Find global maximum value in matrix
 * @param {Array} matrix - The matrix data
 * @param {Array} baseModels - Array of base model names
 * @returns {number} Maximum value
 */
export function findGlobalMax(matrix, baseModels) {
  let max = 0;
  for (const bm of baseModels) {
    for (const row of matrix) {
      const v = row[bm] || 0;
      if (v > max) max = v;
    }
  }
  return max;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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