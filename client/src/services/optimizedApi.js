import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/nasa';

// Create optimized axios instance with performance configurations
const optimizedApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
  // Enable compression support
  decompress: true,
  // Connection pooling for browsers that support it
  maxRedirects: 3,
});

// Request cache for GET requests
const requestCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Generate cache key
const generateCacheKey = (url, params = {}) => {
  return `${url}?${JSON.stringify(params)}`;
};

// Check if cache entry is valid
const isCacheValid = (cacheEntry) => {
  return Date.now() - cacheEntry.timestamp < CACHE_TTL;
};

// Request interceptor with caching
optimizedApi.interceptors.request.use(
  (config) => {
    // Add API key to all requests
    if (!config.params) {
      config.params = {};
    }
    config.params.api_key = process.env.REACT_APP_NASA_API_KEY || 'DEMO_KEY';

    // Check cache for GET requests
    if (config.method === 'get') {
      const cacheKey = generateCacheKey(config.url, config.params);
      const cachedEntry = requestCache.get(cacheKey);

      if (cachedEntry && isCacheValid(cachedEntry)) {
        config.adapter = () => Promise.resolve({
          data: cachedEntry.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          fromCache: true,
        });
      }
    }

    // Add request timestamp for performance monitoring
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with caching and error handling
optimizedApi.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config.method === 'get' && !response.fromCache) {
      const cacheKey = generateCacheKey(response.config.url, response.config.params);
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      // Clean old cache entries periodically
      if (requestCache.size > 100) {
        const now = Date.now();
        for (const [key, entry] of requestCache.entries()) {
          if (now - entry.timestamp > CACHE_TTL) {
            requestCache.delete(key);
          }
        }
      }
    }

    // Log performance metrics
    if (response.config.metadata?.startTime) {
      const duration = Date.now() - response.config.metadata.startTime;
      if (duration > 2000) {
        console.warn(`Slow API request: ${response.config.url} took ${duration}ms`);
      }
    }

    return response;
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          throw new Error('Invalid NASA API key');
        case 403:
          throw new Error('NASA API access forbidden');
        case 429:
          throw new Error('NASA API rate limit exceeded. Please try again later.');
        case 500:
          throw new Error('NASA API server error. Please try again later.');
        case 503:
          throw new Error('NASA API temporarily unavailable. Please try again later.');
        default:
          throw new Error(data.error || `NASA API error: ${status}`);
      }
    } else if (error.request) {
      throw new Error('Network error - unable to reach NASA API. Please check your connection.');
    } else {
      throw new Error('Request configuration error');
    }
  }
);

// Optimized API functions with retry logic
const createApiFunction = (endpoint, options = {}) => {
  return async (params = {}) => {
    try {
      const response = await optimizedApi.get(endpoint, { params });
      return response.data;
    } catch (error) {
      if (options.retry && options.retry > 0) {
        console.log(`Retrying ${endpoint} in ${options.retryDelay || 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, options.retryDelay || 1000));
        return createApiFunction(endpoint, { ...options, retry: options.retry - 1 })(params);
      }
      throw error;
    }
  };
};

// APOD API functions
export const fetchApod = createApiFunction('/apod', { retry: 2, retryDelay: 1000 });

export const fetchApodForDate = async (date) => {
  if (!date) {
    throw new Error('Date is required for APOD fetch');
  }
  return createApiFunction('/apod', { retry: 2, retryDelay: 1000 })({ date });
};

// NeoWs API functions
export const fetchNeoFeed = createApiFunction('/neo/feed', { retry: 2, retryDelay: 1500 });

export const fetchNeoDetails = async (asteroidId) => {
  if (!asteroidId) {
    throw new Error('Asteroid ID is required for NEO details');
  }
  return createApiFunction(`/neo/${asteroidId}`, { retry: 2, retryDelay: 1000 })();
};

export const browseNeo = async (page = 0, size = 20) => {
  return createApiFunction('/neo/browse', { retry: 2, retryDelay: 1000 })({ page, size });
};

// Resource Navigator API functions
export const fetchFeaturedResource = async () => {
  return optimizedApi.get('/api/resources/featured');
};

export const searchResources = async (query, mediaType = null, limit = 20) => {
  const params = { q: query, limit };
  if (mediaType) {
    params.media_type = mediaType;
  }
  return optimizedApi.get('/api/resources/search', { params });
};

export const fetchResourceDetails = async (nasaId) => {
  if (!nasaId) {
    throw new Error('NASA ID is required for resource details');
  }
  return optimizedApi.get(`/api/resources/${nasaId}`);
};

export const fetchAssetDetails = async (nasaId) => {
  if (!nasaId) {
    throw new Error('NASA ID is required for asset details');
  }
  return optimizedApi.get(`/api/resources/asset/${nasaId}`);
};

// Batch API requests for better performance
export const batchFetch = async (requests) => {
  try {
    const responses = await Promise.allSettled(
      requests.map(({ endpoint, params }) =>
        optimizedApi.get(endpoint, { params })
      )
    );

    return responses.map((response, index) => ({
      id: requests[index].id,
      success: response.status === 'fulfilled',
      data: response.status === 'fulfilled' ? response.value.data : null,
      error: response.status === 'rejected' ? response.reason : null,
    }));
  } catch (error) {
    throw new Error(`Batch request failed: ${error.message}`);
  }
};

// Cache management functions
export const clearCache = () => {
  requestCache.clear();
};

export const getCacheStats = () => {
  return {
    size: requestCache.size,
    entries: Array.from(requestCache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      valid: isCacheValid(entry),
    })),
  };
};

// Prefetch function for proactive loading
export const prefetchData = async (endpoint, params = {}) => {
  try {
    await optimizedApi.get(endpoint, { params });
    console.log(`Prefetched: ${endpoint}`);
  } catch (error) {
    console.warn(`Prefetch failed for ${endpoint}:`, error.message);
  }
};

// Utility functions
export const isValidApodDate = (date) => {
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
export default optimizedApi;