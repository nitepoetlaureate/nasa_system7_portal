const redis = require('redis');
const { promisify } = require('util');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour
    this.apodTTL = 86400; // 24 hours for APOD
    this.neoTTL = 1800; // 30 minutes for NEO data
    this.resourceTTL = 7200; // 2 hours for resources
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
        this.isConnected = true;
      });

      // Promisify Redis methods
      this.get = promisify(this.client.get).bind(this.client);
      this.set = promisify(this.client.set).bind(this.client);
      this.del = promisify(this.client.del).bind(this.client);
      this.exists = promisify(this.client.exists).bind(this.client);
      this.flushall = promisify(this.client.flushall).bind(this.client);

      await this.client.connect();
    } catch (error) {
      console.warn('Redis connection failed, cache disabled:', error.message);
      this.isConnected = false;
    }
  }

  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `nasa:${prefix}:${sortedParams}`;
  }

  async get(key) {
    if (!this.isConnected || !this.client) return null;

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.client) return false;

    try {
      const serializedData = JSON.stringify(data);
      await this.client.set(key, serializedData);
      if (ttl > 0) {
        await this.client.expire(key, ttl);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return false;
    }
  }

  getTTLForEndpoint(endpoint) {
    if (endpoint.includes('/apod')) return this.apodTTL;
    if (endpoint.includes('/neo')) return this.neoTTL;
    if (endpoint.includes('/resources')) return this.resourceTTL;
    return this.defaultTTL;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

const cache = new RedisCache();

// Cache middleware factory
const cacheMiddleware = (endpointPrefix) => {
  return async (req, res, next) => {
    const cacheKey = cache.generateKey(endpointPrefix, {
      path: req.path,
      query: JSON.stringify(req.query)
    });

    try {
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', await cache.client.ttl(cacheKey));
        return res.json(cachedData);
      }

      // Store original res.json to intercept response
      const originalJson = res.json;
      res.json = function(data) {
        const ttl = cache.getTTLForEndpoint(req.path);
        cache.set(cacheKey, data, ttl);
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// Cache invalidation middleware
const invalidateCache = async (patterns) => {
  if (Array.isArray(patterns)) {
    await Promise.all(patterns.map(pattern => cache.invalidatePattern(pattern)));
  } else {
    await cache.invalidatePattern(patterns);
  }
};

// Initialize cache connection
cache.connect();

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache
};