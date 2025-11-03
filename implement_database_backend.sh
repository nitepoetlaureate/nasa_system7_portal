#!/bin/bash

# ==================================================================================
# Database Backend Implementation Script
# This provides the indexer and the new database-backed API route.
# ==================================================================================

echo "--- Implementing Database Backend for Resource Navigator ---"

# --- 1. Create the Resource Indexer Service ---
echo "Creating: server/services/resourceIndexer.js"
cat << 'EOF' > server/services/resourceIndexer.js
// This is a standalone script to populate your PostgreSQL database.
// Run it from your server directory: node services/resourceIndexer.js

require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

// --- DATABASE CONFIGURATION ---
// IMPORTANT: Adjust these settings if your PostgreSQL setup is different.
const dbConfig = {
    user: process.env.DB_USER || 'postgres', // Or your username
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'nasa_resources',
    password: process.env.DB_PASSWORD || 'your_password', // <-- CHANGE THIS
    port: process.env.DB_PORT || 5432,
};

const client = new Client(dbConfig);

const createTables = async () => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS datasets (
            id VARCHAR(255) PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT,
            category TEXT,
            description TEXT
        );
    `);
    await client.query(`
        CREATE TABLE IF NOT EXISTS software (
            id BIGINT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT,
            category TEXT,
            description TEXT
        );
    `);
    console.log('Tables created or already exist.');
};

const indexData = async () => {
    console.log('--- Starting NASA Resource Indexing ---');

    // Clear old data
    await client.query('TRUNCATE TABLE datasets, software RESTART IDENTITY;');
    console.log('Cleared old data.');

    // --- Index Datasets from data.nasa.gov (first 1000 results) ---
    console.log('Fetching datasets from data.nasa.gov...');
    const dataGovUrl = 'https://data.nasa.gov/api/catalog/v1?limit=1000'; // Increased limit
    const dataGovResponse = await axios.get(dataGovUrl);
    const datasets = dataGovResponse.data.results.map(item => item.resource);

    for (const d of datasets) {
        await client.query(
            'INSERT INTO datasets (id, title, url, category, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
            [d.id, d.name, `https://data.nasa.gov/d/${d.id}`, d.category, d.description]
        );
    }
    console.log(`Indexed ${datasets.length} datasets.`);

    // --- Index Software from GitHub (first 100 results) ---
    console.log('Fetching software from GitHub...');
    const githubApiUrl = 'https://api.github.com/search/repositories?q=org:nasa&per_page=100';
    const githubResponse = await axios.get(githubApiUrl);
    const software = githubResponse.data.items;

    for (const s of software) {
        await client.query(
            'INSERT INTO software (id, name, url, category, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
            [s.id, s.name, s.html_url, s.language, s.description]
        );
    }
    console.log(`Indexed ${software.length} software packages.`);
    
    console.log('--- Indexing Complete ---');
};

const main = async () => {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database.');
        await createTables();
        await indexData();
    } catch (err) {
        console.error('An error occurred:', err);
    } finally {
        await client.end();
        console.log('Disconnected from database.');
    }
};

main();
EOF

# --- 2. Overwrite the API Route to Query the Database ---
echo "Overwriting: server/routes/resourceNavigator.js"
cat << 'EOF' > server/routes/resourceNavigator.js
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// --- DATABASE CONFIGURATION ---
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'nasa_resources',
    password: process.env.DB_PASSWORD || 'your_password', // <-- CHANGE THIS
    port: process.env.DB_PORT || 5432,
});

// The search endpoint now queries our local, indexed database.
router.get('/search', async (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    if (!query) {
        return res.status(400).json({ message: 'A search query is required.' });
    }

    console.log(`Performing DB search for: "${query}"`);

    try {
        const datasetQuery = {
            text: "SELECT * FROM datasets WHERE title ILIKE $1 OR description ILIKE $1",
            values: [`%${query}%`],
        };
        const softwareQuery = {
            text: "SELECT * FROM software WHERE name ILIKE $1 OR description ILIKE $1",
            values: [`%${query}%`],
        };

        const [datasetResults, softwareResults] = await Promise.all([
            pool.query(datasetQuery),
            pool.query(softwareQuery),
        ]);

        res.json({
            datasets: datasetResults.rows,
            software: softwareResults.rows,
        });

    } catch (error) {
        console.error("Database search error:", error.message);
        res.status(500).json({ message: 'Failed to search the resource database.' });
    }
});

// The Tier 2 URL builder remains unchanged.
const jplUrlBuilder = require('../services/jplUrlBuilder');
router.post('/build-url', (req, res) => {
    const { tool, params } = req.body;
    const url = jplUrlBuilder(tool, params);
    if (url) { res.json({ url }); }
    else { res.status(400).json({ message: 'Invalid tool or parameters.' }); }
});

module.exports = router;
EOF

echo ""
echo "✅ Database Backend Implementation Complete."
echo ""
echo "FINAL INSTRUCTIONS:"
echo "1. IMPORTANT: Open the new script 'server/services/resourceIndexer.js' AND 'server/routes/resourceNavigator.js' and CHANGE the 'your_password' placeholder to your actual PostgreSQL password."
echo "2. Run the Indexer for the first time: (from the 'server' directory)"
echo "   node services/resourceIndexer.js"
echo ""
echo "3. Stop and restart your backend server: (from the 'server' directory)"
echo "   npm start"
echo ""
echo "The Resource Navigator is now running on a high-performance database backend."