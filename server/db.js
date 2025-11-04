const { db, initDatabase } = require('./config/database');

// Legacy compatibility wrapper
const initDb = async () => {
    console.log('Initializing optimized database schema...');
    try {
        await initDatabase();
        console.log('✅ Database schema initialized successfully with optimizations.');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
};

// Initialize database connection
db.connect().catch(console.error);

module.exports = {
    query: (text, params) => db.query(text, params),
    transaction: (callback) => db.transaction(callback),
    initDb,
    db,
    getPoolStats: () => db.getPoolStats()
};
