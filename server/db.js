const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'nasa_resources',
    password: process.env.DB_PASSWORD || 'carlotta', // Your password
    port: process.env.DB_PORT || 5432,
});

const initDb = async () => {
    const client = await pool.connect();
    console.log('Initializing database schema...');
    try {
        await client.query('BEGIN');
        await client.query('DROP TABLE IF EXISTS datasets, software, saved_items, saved_searches CASCADE;');
        await client.query(`
            CREATE TABLE saved_items (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT,
                category TEXT,
                description TEXT,
                saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await client.query(`
            CREATE TABLE saved_searches (
                id SERIAL PRIMARY KEY,
                query_string TEXT NOT NULL,
                search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await client.query('COMMIT');
        console.log('✅ Database schema initialized successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Database initialization failed:', err);
        process.exit(1);
    } finally {
        client.release();
        pool.end(); // End pool after script runs
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initDb,
};
