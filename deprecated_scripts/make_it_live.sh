#!/bin/bash

# ==================================================================================
# "Make It Live" Script for the Resource Navigator
# Replaces the entire mock data system with live API calls.
# ==================================================================================

echo "--- REWIRING RESOURCE NAVIGATOR TO LIVE NASA APIS ---"

# This overwrites the resourceNavigator.js file with a new version that contains
# the logic to query the live APIs in real-time.

cat << 'EOF' > server/routes/resourceNavigator.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// The Tier 2 URL builder remains, as it's still useful.
const jplUrlBuilder = require('../services/jplUrlBuilder');

// LIVE SEARCH ENDPOINT - NO MORE MOCK DATA
router.get('/search', async (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    if (!query) {
        return res.status(400).json({ message: 'A search query is required.' });
    }

    console.log(`Performing LIVE search for: "${query}"`);

    // We will make two API calls in parallel for maximum efficiency.
    const dataNasaGovUrl = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=${query}`;
    const githubApiUrl = `https://api.github.com/search/repositories?q=org:nasa+${query}`;

    try {
        const [dataGovResponse, githubResponse] = await Promise.all([
            axios.get(dataNasaGovUrl),
            axios.get(githubApiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            })
        ]);

        // --- Transform the Live Data ---

        // 1. Transform the datasets from data.nasa.gov
        const datasets = dataGovResponse.data.results.map(item => ({
            id: item.resource.id,
            title: item.resource.name,
            url: item.permalink,
            category: item.resource.category || 'Uncategorized'
        }));

        // 2. Transform the software repositories from GitHub
        const software = githubResponse.data.items.map(item => ({
            id: item.id,
            name: item.name,
            url: item.html_url,
            category: item.language || 'Code'
        }));

        res.json({ datasets, software });

    } catch (error) {
        console.error("LIVE API SEARCH FAILED:", error.message);
        res.status(500).json({ message: 'Failed to fetch data from live APIs.' });
    }
});

// Tier 2 deep linking endpoint remains unchanged.
router.post('/build-url', (req, res) => {
    const { tool, params } = req.body;
    const url = jplUrlBuilder(tool, params);
    if (url) {
        res.json({ url });
    } else {
        res.status(400).json({ message: 'Invalid tool or parameters.' });
    }
});

module.exports = router;
EOF

echo ""
echo "✅ WIRING COMPLETE. The Resource Navigator is now connected to live APIs."
echo ""
echo "INSTRUCTIONS:"
echo "1. Stop your backend server process (Ctrl+C)."
echo "2. Restart it from the 'server' directory: npm start"
echo ""
echo "The frontend client does not need to be restarted. The next search you perform"
echo "for 'Mars', 'rover', 'Juno', or anything else will be a live hit."