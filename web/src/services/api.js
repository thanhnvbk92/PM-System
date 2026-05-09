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

export const getProductionTrends = async () => {
  try {
    const response = await apiClient.get('/api/stats/trends');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAnalyticsDashboard = async (params) => {
  try {
    const response = await apiClient.get('/api/stats/dashboard', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getChannelsStatus = async () => {
  try {
    const response = await apiClient.get('/api/stats/channel-status');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getActiveChannelIds = async () => {
  try {
    const response = await apiClient.get('/api/stats/active-channel-ids');
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

// Command Endpoints
export const sendAgentCommand = async (channelId, action, params = {}) => {
  try {
    // action có thể là 'files/search', 'files/pull', 'files/push', 'update', 'model/change'
    const response = await apiClient.post(`/api/commands/${channelId}/${action}`, params);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    return { success: false, error: errorMsg };
  }
};

export const getAgentHealth = async (channelId) => {
  try {
    const response = await apiClient.get(`/api/commands/${channelId}/health`);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    return { success: false, error: errorMsg };
  }
};

export const getJobStatus = async (channelId, jobId) => {
  try {
    const response = await apiClient.get(`/api/commands/${channelId}/jobs/${jobId}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    return { success: false, error: errorMsg };
  }
};

export const downloadAgentFile = async (channelId, params) => {
  try {
    const response = await apiClient.post(`/api/commands/${channelId}/files/export`, params, {
      responseType: 'blob'
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    return { success: false, error: errorMsg };
  }
};

export default apiClient;
