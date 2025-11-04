const performance = require('perf_hooks').performance;

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(),
      averageResponseTime: 0,
      totalRequests: 0,
      errorRate: 0,
      cacheHitRate: 0
    };
    this.requestTimes = [];
    this.maxRequestHistory = 1000;
  }

  startRequest(req) {
    const requestId = this.generateRequestId();
    const startTime = performance.now();

    this.metrics.requests.set(requestId, {
      method: req.method,
      path: req.path,
      query: req.query,
      startTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    return requestId;
  }

  endRequest(requestId, res) {
    const request = this.metrics.requests.get(requestId);
    if (!request) return;

    const endTime = performance.now();
    const responseTime = endTime - request.startTime;

    // Update metrics
    this.updateMetrics(responseTime, res.statusCode);

    // Log performance data
    this.logPerformanceData({
      ...request,
      responseTime,
      statusCode: res.statusCode,
      cacheHit: res.get('X-Cache') === 'HIT'
    });

    // Clean up request data
    this.metrics.requests.delete(requestId);
  }

  updateMetrics(responseTime, statusCode) {
    this.requestTimes.push(responseTime);

    // Keep only recent request times
    if (this.requestTimes.length > this.maxRequestHistory) {
      this.requestTimes.shift();
    }

    // Calculate average response time
    this.metrics.averageResponseTime =
      this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;

    this.metrics.totalRequests++;

    // Update error rate (4xx and 5xx responses)
    if (statusCode >= 400) {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
    } else {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalRequests - 1)) / this.metrics.totalRequests;
    }
  }

  logPerformanceData(data) {
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      console.log('Performance:', {
        path: data.path,
        method: data.method,
        responseTime: `${data.responseTime.toFixed(2)}ms`,
        statusCode: data.statusCode,
        cacheHit: data.cacheHit,
        userAgent: data.userAgent?.substring(0, 50)
      });
    }
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: Math.round(this.metrics.averageResponseTime * 100) / 100,
      errorRate: Math.round(this.metrics.errorRate * 10000) / 100,
      totalRequests: this.metrics.totalRequests
    };
  }

  resetMetrics() {
    this.metrics = {
      requests: new Map(),
      averageResponseTime: 0,
      totalRequests: 0,
      errorRate: 0,
      cacheHitRate: 0
    };
    this.requestTimes = [];
  }
}

const monitor = new PerformanceMonitor();

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const requestId = monitor.startRequest(req);

  // Override res.end to capture response completion
  const originalEnd = res.end;
  res.end = function(...args) {
    monitor.endRequest(requestId, res);
    originalEnd.apply(this, args);
  };

  // Add performance headers
  res.set('X-Response-Time-Start', Date.now());

  next();
};

// Response time middleware
const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now();

  // Override res.end to set response time header before sending
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      res.set('X-Response-Time', `${duration}ms`);
    }

    // Log slow requests
    if (duration > 2000) {
      console.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`);
    }

    originalEnd.apply(this, args);
  };

  next();
};

// Memory usage monitoring
const memoryMonitor = () => {
  const used = process.memoryUsage();

  if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
    console.log('Memory Usage:', {
      rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`
    });
  }

  // Warn if memory usage is high
  const heapUsedMB = used.heapUsed / 1024 / 1024;
  if (heapUsedMB > 500) {
    console.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)} MB`);
  }
};

// Start memory monitoring interval
setInterval(memoryMonitor, 30000); // Every 30 seconds

module.exports = {
  monitor,
  performanceMiddleware,
  responseTimeMiddleware,
  memoryMonitor
};