import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
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
    
    // Handle different types of errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error('Network error: Cannot connect to server');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error: Please try again later');
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else {
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

// API service methods
export const apiService = {
  // Models
  async getModels(params = {}) {
    const response = await api.get('/models', { params });
    return response.data;
  },

  async getModelDetail(modelVersionId) {
    const response = await api.get(`/modeldetail/${modelVersionId}`);
    return response.data;
  },

  async getBaseModels() {
    const response = await api.get('/basemodels');
    return response.data;
  },

  // Downloads
  async downloadModelFile(downloadData) {
    const response = await api.post('/download-model-file', downloadData);
    return response.data;
  },

  async getDownloadStatus() {
    const response = await api.get('/download-status');
    return response.data;
  },

  // File operations
  async findMissingFiles() {
    const response = await api.post('/find-missing-files');
    return response.data;
  },

  async fixFile(fixData) {
    const response = await api.post('/fix-file', fixData);
    return response.data;
  },

  async computeFileHash(filePath) {
    const response = await api.post('/compute-file-hash', { filePath });
    return response.data;
  },

  // Paths
  async getSavedPaths() {
    const response = await api.get('/paths');
    return response.data;
  },

  async savePath(path) {
    const response = await api.post('/paths', { path });
    return response.data;
  },

  async deletePath(path) {
    const response = await api.delete('/paths', { data: { path } });
    return response.data;
  },

  async scanPaths() {
    const response = await api.post('/scan-paths');
    return response.data;
  },

  async markDownloaded(files) {
    const response = await api.post('/mark-downloaded', { files });
    return response.data;
  },

  async validateDownloadedFiles() {
    const response = await api.post('/validate-downloaded-files');
    return response.data;
  },

  // Summary
  async getSummaryMatrix() {
    const response = await api.get('/summary-matrix');
    return response.data;
  },

  async getSummaryMatrixDownloaded() {
    const response = await api.get('/summary-matrix-downloaded');
    return response.data;
  },
};

export default apiService; 