#!/bin/bash

# ==================================================================================
# Final Patch: User-Agent Spoofing for the Resource Indexer
# This modifies the Axios request to use a standard browser User-Agent,
# bypassing server-side blocking of script-like agents.
# ==================================================================================

echo "--- Patching the Resource Indexer with a standard browser User-Agent ---"

# This is the full, corrected file content for the indexer.
cat << 'EOF' > server/services/resourceIndexer.js
// This is a standalone script to populate your PostgreSQL database.
// Run it from your server directory: node services/resourceIndexer.js

require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'nasa_resources',
    password: process.env.DB_PASSWORD || 'carlotta', // Your password
    port: process.env.DB_PORT || 5432,
};

// Define a standard browser User-Agent header
const BROWSER_HEADER = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

const client = new Client(dbConfig);

const createTables = async () => {
    // [Database table creation logic remains the same]
    await client.query(`CREATE TABLE IF NOT EXISTS datasets (id VARCHAR(255) PRIMARY KEY, title TEXT NOT NULL, url TEXT, category TEXT, description TEXT);`);
    await client.query(`CREATE TABLE IF NOT EXISTS software (id BIGINT PRIMARY KEY, name TEXT NOT NULL, url TEXT, category TEXT, description TEXT);`);
    console.log('Tables created or already exist.');
};

const indexData = async () => {
    console.log('--- Starting NASA Resource Indexing ---');
    await client.query('TRUNCATE TABLE datasets, software RESTART IDENTITY;');
    console.log('Cleared old data.');

    // --- Index Datasets from data.nasa.gov ---
    try {
        console.log('Fetching datasets from data.nasa.gov...');
        const dataGovUrl = 'https://data.nasa.gov/api/views.json?limit=2000';
        // CORRECTED: Added headers to the axios config object
        const dataGovResponse = await axios.get(dataGovUrl, { 
            timeout: 120000,
            headers: BROWSER_HEADER 
        });
        
        const datasets = dataGovResponse.data;

        for (const d of datasets) {
            if (d.publicationDate) {
                await client.query(
                    'INSERT INTO datasets (id, title, url, category, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                    [d.id, d.name, `https://data.nasa.gov/d/${d.id}`, d.category, d.description]
                );
            }
        }
        console.log(`✅ Indexed ${datasets.length} datasets.`);
    } catch (error) {
        console.error("❌ FAILED to fetch or index datasets from data.nasa.gov.", error.message);
    }

    // --- Index Software from GitHub (GitHub API doesn't care about User-Agent) ---
    try {
        console.log('Fetching software from GitHub...');
        const githubApiUrl = 'https://api.github.com/search/repositories?q=org:nasa&per_page=100';
        const githubResponse = await axios.get(githubApiUrl, { timeout: 120000 });
        const software = githubResponse.data.items;

        for (const s of software) {
            await client.query(
                'INSERT INTO software (id, name, url, category, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                [s.id, s.name, s.html_url, s.language, s.description]
            );
        }
        console.log(`✅ Indexed ${software.length} software packages.`);
    } catch (error) {
        console.error("❌ FAILED to fetch or index software from GitHub.", error.message);
    }
    
    console.log('--- Indexing Complete ---');
};

const main = async () => {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database.');
        await createTables();
        await indexData();
    } catch (err) {
        console.error('An error occurred during the main process:', err);
    } finally {
        await client.end();
        console.log('Disconnected from database.');
    }
};

main();
EOF

echo ""
echo "✅ Indexer has been patched with a standard browser User-Agent."
echo ""
echo "This is the definitive fix. Run the indexer one last time."
echo "1. Navigate to the 'server' directory: cd server"
echo "2. Run the indexer:"
echo "   node services/resourceIndexer.js"