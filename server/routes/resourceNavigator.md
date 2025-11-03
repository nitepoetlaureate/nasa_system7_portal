const express = require('express');
const axios = require('axios');
const router = express.Router();

const jplUrlBuilder = require('../services/jplUrlBuilder');

router.get('/search', async (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    if (!query) {
        return res.status(400).json({ message: 'A search query is required.' });
    }

    console.log(`Performing LIVE search for: "${query}"`);

    const dataNasaGovUrl = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=${query}`;
    const githubApiUrl = `https://api.github.com/search/repositories?q=org:nasa+${query}`;

    try {
        const [dataGovResponse, githubResponse] = await Promise.all([
            axios.get(dataNasaGovUrl),
            axios.get(githubApiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            })
        ]);

        // --- Transform the Live Data (NOW WITH DESCRIPTIONS) ---
        const datasets = dataGovResponse.data.results.map(item => ({
            id: item.resource.id,
            title: item.resource.name,
            url: item.permalink,
            category: item.resource.category || 'Uncategorized',
            description: item.resource.description // <-- ADDED
        }));

        const software = githubResponse.data.items.map(item => ({
            id: item.id,
            name: item.name,
            url: item.html_url,
            category: item.language || 'Code',
            description: item.description // <-- ADDED
        }));

        res.json({ datasets, software });

    } catch (error) {
        console.error("LIVE API SEARCH FAILED:", error.message);
        res.status(500).json({ message: 'Failed to fetch data from live APIs.' });
    }
});

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
