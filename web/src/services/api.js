import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Health check endpoint
export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Search logs endpoint
export const searchLogs = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/logs/search', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getLogDetail = async (id) => {
  try {
    const response = await apiClient.get(`/api/logs/${id}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get log statistics
export const getLogStatistics = async (startTime, endTime) => {
  try {
    const response = await apiClient.get('/api/logs/statistics', {
      params: {
        start_time: startTime,
        end_time: endTime,
      },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get log levels distribution
export const getLogLevelsDistribution = async () => {
  try {
    const response = await apiClient.get('/api/logs/levels-distribution');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Statistics Endpoints
export const getStatsSummary = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/stats/summary', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getStatsByBuyer = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/stats/by-buyer', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getStatsByResult = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/stats/by-result', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get hosts list
export const getHostsList = async () => {
  try {
    const response = await apiClient.get('/api/logs/hosts');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Master Data Endpoints
export const getMasterData = async (entity) => {
  try {
    const response = await apiClient.get(`/api/master/${entity}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    return { success: false, error: errorMsg };
  }
};

export const saveMasterData = async (entity, data) => {
  try {
    const response = await apiClient.post(`/api/master/${entity}`, data);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    return { success: false, error: errorMsg };
  }
};

export const deleteMasterData = async (entity, id) => {
  try {
    const response = await apiClient.delete(`/api/master/${entity}/${id}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const importMasterData = async (entity, data) => {
  try {
    const response = await apiClient.post(`/api/master/${entity}/bulk`, data);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    return { success: false, error: errorMsg };
  }
};

export default apiClient;
