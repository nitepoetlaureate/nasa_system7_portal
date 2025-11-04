const { Pool } = require('pg');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.fallbackMode = false;
  }

  async connect() {
    // CRITICAL FIX: Skip database connections if disabled
    if (process.env.DISABLE_DATABASE_CONNECTIONS === 'true') {
      console.log('🔧 Database connections disabled - running in fallback mode');
      this.fallbackMode = true;
      this.isConnected = false;
      return true;
    }

    try {
      this.pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_DATABASE || 'nasa_system7',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
        max: 20, // Maximum number of connections in the pool
        idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
        connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
        statement_timeout: 10000, // How long to wait for a query to complete
        query_timeout: 10000, // How long to wait for a query to return results
        application_name: 'nasa_system7_portal',
        // Connection string for production environments
        ...(process.env.DATABASE_URL && {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        })
      });

      // Test the connection with shorter timeout
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        client.release();

        this.isConnected = true;
        console.log('✅ Database connected successfully');

        // Handle pool errors
        this.pool.on('error', (err, client) => {
          console.error('Unexpected error on idle client', err);
          this.isConnected = false;
        });

        this.pool.on('connect', (client) => {
          console.log('New database client connected');
        });

        this.pool.on('remove', (client) => {
          console.log('Database client removed');
        });

        return true;
      } catch (queryError) {
        client.release();
        throw queryError;
      }
    } catch (error) {
      console.warn('⚠️  PostgreSQL connection failed, enabling fallback mode:', error.message);
      console.log('🔄 Operating in fallback mode - some features may be limited');
      this.fallbackMode = true;
      this.isConnected = false;
      return true; // Return true to allow server to start
    }
  }

  async query(text, params = []) {
    if (this.fallbackMode) {
      console.warn('⚠️  Database query skipped (fallback mode):', text);
      // Return mock data for essential queries
      if (text.includes('saved_items')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('saved_searches')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, text);
      }

      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('Database connection closed');
    }
  }

  getPoolStats() {
    if (!this.pool) return null;

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// Database initialization with optimized schema
const initDatabase = async () => {
  const db = new DatabaseManager();
  await db.connect();

  const queries = [
    // Drop existing tables if they exist (for development)
    'DROP TABLE IF EXISTS saved_items, saved_searches, api_cache, user_sessions CASCADE',

    // Create optimized saved_items table with proper indexes
    `CREATE TABLE IF NOT EXISTS saved_items (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      category VARCHAR(100),
      description TEXT,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create indexes for saved_items
    'CREATE INDEX IF NOT EXISTS idx_saved_items_type ON saved_items(type)',
    'CREATE INDEX IF NOT EXISTS idx_saved_items_category ON saved_items(category)',
    'CREATE INDEX IF NOT EXISTS idx_saved_items_created_at ON saved_items(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_saved_items_title_gin ON saved_items USING gin(to_tsvector(\'english\', title))',

    // Create saved_searches table
    `CREATE TABLE IF NOT EXISTS saved_searches (
      id SERIAL PRIMARY KEY,
      query_string TEXT NOT NULL,
      search_type VARCHAR(50) DEFAULT \'general\',
      result_count INTEGER DEFAULT 0,
      search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      ip_address INET
    )`,

    // Create indexes for saved_searches
    'CREATE INDEX IF NOT EXISTS idx_saved_searches_search_time ON saved_searches(search_time)',
    'CREATE INDEX IF NOT EXISTS idx_saved_searches_search_type ON saved_searches(search_type)',

    // Create API cache table for persistent caching
    `CREATE TABLE IF NOT EXISTS api_cache (
      cache_key VARCHAR(255) PRIMARY KEY,
      cache_data JSONB NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      hit_count INTEGER DEFAULT 0
    )`,

    // Create indexes for api_cache
    'CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_api_cache_created_at ON api_cache(created_at)',

    // Create user_sessions table for session management
    `CREATE TABLE IF NOT EXISTS user_sessions (
      session_id VARCHAR(255) PRIMARY KEY,
      session_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    )`,

    // Create indexes for user_sessions
    'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)',

    // Create function to automatically update updated_at timestamp
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'`,

    // Create triggers for automatic timestamp updates
    `CREATE TRIGGER update_saved_items_updated_at
        BEFORE UPDATE ON saved_items
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

    `CREATE TRIGGER update_user_sessions_updated_at
        BEFORE UPDATE ON user_sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
  ];

  try {
    await db.transaction(async (client) => {
      for (const query of queries) {
        await client.query(query);
      }
    });

    console.log('✅ Database schema initialized with optimizations');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await db.close();
  }
};

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  initDatabase,
  db: dbManager
};