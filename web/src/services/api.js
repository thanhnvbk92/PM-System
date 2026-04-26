import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

// Get hosts list
export const getHostsList = async () => {
  try {
    const response = await apiClient.get('/api/logs/hosts');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default apiClient;
