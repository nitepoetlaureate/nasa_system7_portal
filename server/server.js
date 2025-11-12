require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const apiProxyRouter = require('./routes/apiProxy');
const apodEnhancedRouter = require('./routes/apodEnhanced');
const neoEnhancedRouter = require('./routes/neoEnhanced');
const { router: resourceEnhancedRouter, fetchFeaturedItem } = require('./routes/resourceEnhanced');
const { performanceMiddleware, responseTimeMiddleware } = require('./middleware/performance');

const app = express();
const PORT = process.env.PORT || 3001;

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://api.nasa.gov", "https://images.nasa.gov"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https.api.nasa.gov"] // Corrected to allow https
    }
  }
}));

// Compression middleware for response compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Performance monitoring middleware
app.use(performanceMiddleware);
app.use(responseTimeMiddleware);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/nasa', apiProxyRouter);
app.use('/api/apod', apodEnhancedRouter);
app.use('/api/neo', neoEnhancedRouter);
app.use('/api/resources', resourceEnhancedRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const { monitor } = require('./middleware/performance');
  const metrics = monitor.getMetrics();
  res.json(metrics);
});

app.get('/', (req, res) => res.send('NASA System 7 Portal Backend is running.'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 NASA System 7 Portal Backend listening on port ${PORT}`);
  console.log(`📊 Performance monitoring enabled`);
  console.log(`🔒 Security middleware active`);
  console.log(`🗜️  Compression enabled`);

  // CRITICAL FIX: Skip initialization if disabled
  if (process.env.ENABLE_FALLBACK_MODE === 'true') {
    console.log('🔧 Running in fallback mode - skipping external connections');
    console.log('✅ NASA System 7 Portal Backend started successfully (fallback mode)');
    return;
  }

  // Initialize services with error handling
  try {
    console.log('🔄 Initializing database connection...');
    await require('./config/database').db.connect();
  } catch (dbError) {
    console.warn('⚠️  Database initialization failed:', dbError.message);
    console.log('🔄 Server will continue in limited mode');
  }

  try {
    console.log('🔄 Initializing cache connection...');
    await require('./middleware/cache').cache.connect();
  } catch (cacheError) {
    console.warn('⚠️  Cache initialization failed:', cacheError.message);
    console.log('🔄 Server will continue without caching');
  }

  // Fetch featured item with error handling
  try {
    console.log('🔄 Fetching featured dataset...');
    await fetchFeaturedItem();
  } catch (featuredError) {
    console.warn('⚠️  Featured item fetch failed:', featuredError.message);
    console.log('🔄 Server will continue without featured item');
  }

  console.log('✅ NASA System 7 Portal Backend started successfully');
});
