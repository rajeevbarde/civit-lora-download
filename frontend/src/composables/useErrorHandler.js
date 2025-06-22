import { inject } from 'vue';

/**
 * Composable for consistent error handling across components
 * Provides standardized error handling methods that work with the notification system
 */
export function useErrorHandler() {
  // Get notification methods from the app's provide/inject system
  const showNotification = inject('showNotification');
  const showError = inject('showError');
  const showSuccess = inject('showSuccess');
  const showWarning = inject('showWarning');
  const showInfo = inject('showInfo');

  /**
   * Handle API errors with consistent messaging
   * @param {Error} error - The error object
   * @param {string} operation - Description of the operation that failed
   * @param {Object} options - Additional options
   * @param {boolean} options.showNotification - Whether to show notification (default: true)
   * @param {boolean} options.logError - Whether to log error to console (default: true)
   * @param {string} options.fallbackMessage - Fallback message if error.message is empty
   * @returns {string} The error message that was displayed
   */
  const handleError = (error, operation = 'Operation', options = {}) => {
    const {
      showNotification: shouldShowNotification = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    // Get error message
    let errorMessage = error.message || fallbackMessage;
    
    // Enhance error message based on error type
    if (error.status === 404) {
      errorMessage = `Resource not found: ${operation} failed because the requested data could not be found.`;
    } else if (error.status === 403) {
      errorMessage = `Access denied: ${operation} failed because you don't have permission.`;
    } else if (error.status === 401) {
      errorMessage = `Authentication required: ${operation} failed. Please log in again.`;
    } else if (error.status >= 500) {
      errorMessage = `Server error: ${operation} failed due to a server issue. Please try again later.`;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = `Connection error: ${operation} failed because the server is unreachable.`;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = `Timeout error: ${operation} failed because the request took too long.`;
    }

    // Log error if requested
    if (logError) {
      console.error(`Error during ${operation}:`, error);
    }

    // Show notification if requested
    if (shouldShowNotification && showError) {
      showError(errorMessage);
    }

    return errorMessage;
  };

  /**
   * Handle API errors with retry capability
   * @param {Function} apiCall - The API function to call
   * @param {string} operation - Description of the operation
   * @param {Object} options - Additional options
   * @param {number} options.maxRetries - Maximum number of retries (default: 3)
   * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
   * @param {boolean} options.showRetryNotification - Whether to show retry notifications (default: true)
   * @returns {Promise} Promise that resolves with the API result or rejects with the final error
   */
  const handleErrorWithRetry = async (apiCall, operation = 'Operation', options = {}) => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      showRetryNotification = true
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          // Final attempt failed
          handleError(error, operation, { showNotification: true, logError: true });
          throw error;
        }
        
        // Show retry notification if requested
        if (showRetryNotification && showWarning) {
          showWarning(`${operation} failed, retrying... (${attempt + 1}/${maxRetries})`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
    
    throw lastError;
  };

  /**
   * Handle success operations consistently
   * @param {string} message - Success message
   * @param {Object} options - Additional options
   * @param {boolean} options.showNotification - Whether to show notification (default: true)
   */
  const handleSuccess = (message, options = {}) => {
    const { showNotification: shouldShowNotification = true } = options;
    
    if (shouldShowNotification && showSuccess) {
      showSuccess(message);
    }
  };

  /**
   * Handle warnings consistently
   * @param {string} message - Warning message
   * @param {Object} options - Additional options
   * @param {boolean} options.showNotification - Whether to show notification (default: true)
   */
  const handleWarning = (message, options = {}) => {
    const { showNotification: shouldShowNotification = true } = options;
    
    if (shouldShowNotification && showWarning) {
      showWarning(message);
    }
  };

  /**
   * Handle info messages consistently
   * @param {string} message - Info message
   * @param {Object} options - Additional options
   * @param {boolean} options.showNotification - Whether to show notification (default: true)
   */
  const handleInfo = (message, options = {}) => {
    const { showNotification: shouldShowNotification = true } = options;
    
    if (shouldShowNotification && showInfo) {
      showInfo(message);
    }
  };

  /**
   * Safe async wrapper that automatically handles errors
   * @param {Function} asyncFn - Async function to execute
   * @param {string} operation - Description of the operation
   * @param {Object} options - Error handling options
   * @returns {Promise} Promise that resolves with result or rejects with handled error
   */
  const safeAsync = async (asyncFn, operation = 'Operation', options = {}) => {
    try {
      return await asyncFn();
    } catch (error) {
      const message = handleError(error, operation, options);
      throw new Error(message);
    }
  };

  return {
    handleError,
    handleErrorWithRetry,
    handleSuccess,
    handleWarning,
    handleInfo,
    safeAsync,
    // Expose notification methods for direct use
    showNotification,
    showError,
    showSuccess,
    showWarning,
    showInfo
  };
} 