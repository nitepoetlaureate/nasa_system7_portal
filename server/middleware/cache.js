const redis = require('redis');

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
      // Redis v4+ configuration
      const config = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis reconnection attempts exhausted');
              return new Error('Redis reconnection attempts exhausted');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      };

      // Add password only if it exists
      if (process.env.REDIS_PASSWORD) {
        config.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(config);

      this.client.on('error', (err) => {
        console.error('Redis error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.warn('Redis connection failed, cache disabled:', error.message);
      this.isConnected = false;
      this.client = null;
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
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.client) return false;

    try {
      const serializedData = JSON.stringify(data);
      if (ttl > 0) {
        await this.client.setEx(key, ttl, serializedData);
      } else {
        await this.client.set(key, serializedData);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        // Use a pipeline for better performance
        const pipeline = this.client.multi();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error.message);
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
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
      } catch (error) {
        console.error('Redis disconnect error:', error.message);
      }
    }
  }
}

const cache = new RedisCache();

// Cache middleware factory
const cacheMiddleware = (endpointPrefix) => {
  return async (req, res, next) => {
    // Skip cache if Redis is not connected
    if (!cache.isConnected || !cache.client) {
      res.set('X-Cache', 'DISABLED');
      return next();
    }

    const cacheKey = cache.generateKey(endpointPrefix, {
      path: req.path,
      query: JSON.stringify(req.query)
    });

    try {
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        res.set('X-Cache', 'HIT');
        // Only get TTL if Redis is connected and client exists
        if (cache.isConnected && cache.client) {
          try {
            const ttl = await cache.client.ttl(cacheKey);
            res.set('X-Cache-TTL', ttl.toString());
          } catch (ttlError) {
            // Ignore TTL errors, still serve cached content
          }
        }
        return res.json(cachedData);
      }

      // Store original res.json to intercept response
      const originalJson = res.json;
      res.json = function(data) {
        const ttl = cache.getTTLForEndpoint(req.path);
        cache.set(cacheKey, data, ttl).catch(err => {
          // Ignore cache errors, don't break the response
          console.warn('Cache set error:', err.message);
        });
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
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

// Initialize cache connection in background
cache.connect().catch(err => {
  console.warn('Background cache initialization failed:', err.message);
});

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache
};