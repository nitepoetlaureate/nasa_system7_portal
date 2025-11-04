import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/nasa';

// Create axios instance for NASA API calls
const nasaApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add API key
nasaApi.interceptors.request.use(
  (config) => {
    // Add API key to all requests
    if (!config.params) {
      config.params = {};
    }
    config.params.api_key = process.env.REACT_APP_NASA_API_KEY || 'DEMO_KEY';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
nasaApi.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle common error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          throw new Error('Invalid NASA API key');
        case 403:
          throw new Error('NASA API access forbidden');
        case 429:
          throw new Error('NASA API rate limit exceeded');
        case 500:
          throw new Error('NASA API server error');
        default:
          throw new Error(data.error || `NASA API error: ${status}`);
      }
    } else if (error.request) {
      // Network error
      throw new Error('Network error - unable to reach NASA API');
    } else {
      // Request configuration error
      throw new Error('Request configuration error');
    }
  }
);

// APOD API functions
export const fetchApod = async (date) => {
  const params = {};
  if (date) {
    params.date = date;
  }
  return nasaApi.get('/apod', { params });
};

export const fetchApodForDate = async (date) => {
  if (!date) {
    throw new Error('Date is required for APOD fetch');
  }
  return nasaApi.get('/apod', { params: { date } });
};

// NeoWs API functions
export const fetchNeoFeed = async (startDate, endDate) => {
  const params = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }
  return nasaApi.get('/neo/feed', { params });
};

export const fetchNeoDetails = async (asteroidId) => {
  if (!asteroidId) {
    throw new Error('Asteroid ID is required for NEO details');
  }
  return nasaApi.get(`/neo/${asteroidId}`);
};

export const browseNeo = async (page = 0, size = 20) => {
  return nasaApi.get('/neo/browse', {
    params: { page, size }
  });
};

// Resource Navigator API functions
export const fetchFeaturedResource = async () => {
  return axios.get('/api/resources/featured');
};

export const searchResources = async (query, mediaType = null, limit = 20) => {
  const params = { q: query, limit };
  if (mediaType) {
    params.media_type = mediaType;
  }
  return axios.get('/api/resources/search', { params });
};

export const fetchResourceDetails = async (nasaId) => {
  if (!nasaId) {
    throw new Error('NASA ID is required for resource details');
  }
  return axios.get(`/api/resources/${nasaId}`);
};

export const fetchAssetDetails = async (nasaId) => {
  if (!nasaId) {
    throw new Error('NASA ID is required for asset details');
  }
  return axios.get(`/api/resources/asset/${nasaId}`);
};

// Utility functions
export const isValidApodDate = (date) => {
  // APOD is available from 1995-06-16 to today
  const startDate = new Date('1995-06-16');
  const today = new Date();
  const inputDate = new Date(date);

  return inputDate >= startDate && inputDate <= today;
};

export const formatDateForApi = (date) => {
  if (!date) return null;

  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Export the configured axios instance for advanced usage
export default nasaApi;