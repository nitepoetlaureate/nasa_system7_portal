import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// NASA APIs
export const getApod = () => apiClient.get('/nasa/planetary/apod');
export const getApodForDate = (date) => apiClient.get(`/nasa/planetary/apod?date=${date}`);
export const getNeoFeed = (startDate, endDate) => apiClient.get(`/nasa/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}`);
export const getNeoDetails = (id) => apiClient.get(`/nasa/neo/rest/v1/neo/${id}`);

// Enhanced APOD APIs
export const getEnhancedApod = (date) => apiClient.get(`/apod/enhanced/${date}`);
export const getApodRange = (startDate, endDate, includeEnhanced = true) =>
    apiClient.post('/apod/range', { startDate, endDate, includeEnhanced });
export const searchApods = (query, limit = 20, dateRange) =>
    apiClient.post('/apod/search', { query, limit, dateRange });
export const getApodStatistics = (period = 'year') =>
    apiClient.get(`/apod/statistics?period=${period}`);

// Resource Navigator Library APIs
export const getSavedItems = () => apiClient.get('/resources/saved-items');
export const saveItem = (item) => apiClient.post('/resources/save-item', item);
export const deleteItem = (id) => apiClient.delete(`/resources/delete-item/${id}`);
export const getSearchHistory = () => apiClient.get('/resources/search-history');
export const getFeaturedItem = () => apiClient.get('/resources/featured-item');
export const executeLiveSearch = (query) => apiClient.post('/resources/live-search', { query });
