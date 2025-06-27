import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Create a more detailed error message
    let errorMessage = 'An unexpected error occurred';
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Network error: Cannot connect to server. Please check your connection and try again.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout: The server took too long to respond. Please try again.';
    } else if (error.response?.status >= 500) {
      errorMessage = 'Server error: The server encountered an internal error. Please try again later.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Resource not found: The requested data could not be found.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Access denied: You do not have permission to access this resource.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication required: Please log in again.';
    } else if (error.response?.status >= 400) {
      errorMessage = error.response.data?.error || `Client error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Create a new error with the improved message
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    enhancedError.statusText = error.response?.statusText;
    
    throw enhancedError;
  }
);

// API service methods
export const apiService = {
  // Models
  async getModels(params = {}, options = {}) {
    const response = await api.get('/models', { 
      params,
      signal: options.signal 
    });
    return response.data;
  },

  async getModelDetail(modelVersionId, options = {}) {
    const response = await api.get(`/models/detail/${modelVersionId}`, {
      signal: options.signal
    });
    return response.data;
  },

  async getBaseModels(options = {}) {
    const response = await api.get('/models/basemodels', {
      signal: options.signal
    });
    return response.data;
  },

  // Downloads
  async downloadModelFile(downloadData, options = {}) {
    const response = await api.post('/downloads', downloadData, {
      signal: options.signal
    });
    return response.data;
  },

  async getDownloadStatus(options = {}) {
    const response = await api.get('/downloads/status', {
      signal: options.signal
    });
    return response.data;
  },

  // File operations
  async findMissingFiles(options = {}) {
    const response = await api.post('/files/find-missing', {}, {
      signal: options.signal
    });
    return response.data;
  },

  async fixFile(fixData, options = {}) {
    const response = await api.post('/files/fix', fixData, {
      signal: options.signal
    });
    return response.data;
  },

  async computeFileHash(filePath, options = {}) {
    const response = await api.post('/files/compute-hash', { filePath }, {
      signal: options.signal
    });
    return response.data;
  },

  // Paths
  async getSavedPaths(options = {}) {
    const response = await api.get('/paths', {
      signal: options.signal
    });
    return response.data;
  },

  async savePath(path, options = {}) {
    const response = await api.post('/paths', { path }, {
      signal: options.signal
    });
    return response.data;
  },

  async deletePath(path, options = {}) {
    const response = await api.delete('/paths', { 
      data: { path },
      signal: options.signal
    });
    return response.data;
  },

  async scanPaths(options = {}) {
    const response = await api.post('/files/scan', {}, {
      signal: options.signal
    });
    return response.data;
  },

  async validateDownloadedFiles(options = {}) {
    const response = await api.post('/files/validate', {}, {
      signal: options.signal
    });
    return response.data;
  },

  async scanUniqueLoras(options = {}) {
    const response = await api.post('/files/scan-unique-loras', {}, {
      signal: options.signal
    });
    return response.data;
  },

  // Additional methods for FileScanner - updated to use v1 routes
  async savePathLegacy(path, options = {}) {
    const response = await api.post('/paths', { path }, {
      signal: options.signal
    });
    return response.data;
  },

  async getSavedPathsLegacy(options = {}) {
    const response = await api.get('/paths', {
      signal: options.signal
    });
    return response.data;
  },

  async deletePathLegacy(path, options = {}) {
    const response = await api.delete('/paths', { 
      data: { path },
      signal: options.signal
    });
    return response.data;
  },

  async checkFilesInDb(files, options = {}) {
    const response = await api.post('/files/check', { files }, {
      signal: options.signal
    });
    return response.data;
  },

  // Summary
  async getSummaryMatrix(options = {}) {
    const response = await api.get('/models/summary-matrix', {
      signal: options.signal
    });
    return response.data;
  },

  async getSummaryMatrixDownloaded(options = {}) {
    const response = await api.get('/models/summary-matrix-downloaded', {
      signal: options.signal
    });
    return response.data;
  },

  async registerUnregisteredFiles(files, options = {}) {
    const response = await api.post('/files/register-unregistered', { files }, {
      signal: options.signal
    });
    return response.data;
  },
};

export default apiService; 