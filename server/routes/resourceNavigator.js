const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');

// --- User Library Endpoints ---
router.get('/saved-items', async (req, res) => { try { const { rows } = await db.query('SELECT * FROM saved_items ORDER BY saved_at DESC'); res.json(rows); } catch (err) { res.status(500).json({ message: 'Error fetching saved items.' }); } });
router.post('/save-item', async (req, res) => { const { id, type, title, url, category, description } = req.body; try { const text = 'INSERT INTO saved_items(id, type, title, url, category, description) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description RETURNING *'; const values = [id, type, title, url, category, description]; const { rows } = await db.query(text, values); res.status(201).json(rows[0]); } catch (err) { res.status(500).json({ message: 'Error saving item.' }); } });
router.delete('/delete-item/:id', async (req, res) => { try { await db.query('DELETE FROM saved_items WHERE id = $1', [req.params.id]); res.status(204).send(); } catch (err) { res.status(500).json({ message: 'Error deleting item.' }); } });
router.get('/search-history', async (req, res) => { try { const { rows } = await db.query('SELECT query_string FROM saved_searches ORDER BY search_time DESC LIMIT 10'); res.json(rows); } catch (err) { res.status(500).json({ message: 'Error fetching search history.' }); } });

// --- Featured Item Endpoint ---
let featuredItem = null;
router.get('/featured-item', (req, res) => { res.json(featuredItem); });

// --- Live Search Endpoint ---
router.post('/live-search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: 'Query is required.' });
    try {
        await db.query('INSERT INTO saved_searches(query_string) VALUES($1)', [query]);
        
        const dataNasaGovUrl = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=${query}&limit=50`;
        const githubApiUrl = `https://api.github.com/search/repositories?q=org:nasa+${query}&per_page=50`;

        const results = await Promise.allSettled([
            axios.get(dataNasaGovUrl, { headers: { 'X-App-Token': process.env.NASA_API_KEY }, timeout: 20000 }),
            axios.get(githubApiUrl, { timeout: 20000 })
        ]);

        const datasets = results[0].status === 'fulfilled' 
            ? results[0].value.data.results.map(item => ({ id: item.resource.id, type: 'Dataset', title: item.resource.name, url: item.permalink, category: item.resource.category, description: item.resource.description })).filter(d => d.title)
            : [];
        if (results[0].status === 'rejected') console.error("data.nasa.gov search failed:", results[0].reason.message);
        
        const software = results[1].status === 'fulfilled'
            ? results[1].value.data.items.map(s => ({ id: s.id.toString(), type: 'Software', title: s.name, url: s.html_url, category: s.language, description: s.description }))
            : [];
        if (results[1].status === 'rejected') console.error("GitHub search failed:", results[1].reason.message);

        res.json({ datasets, software });
    } catch (err) {
        res.status(500).json({ message: 'Live search failed.' });
    }
});

const fetchFeaturedItem = async () => {
    try {
        console.log("Fetching featured dataset for Encarta panel...");
        const url = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=Mars%20Rover%20Photos&limit=1`;
        const response = await axios.get(url, { headers: { 'X-App-Token': process.env.NASA_API_KEY } });
        const item = response.data.results[0];
        if (item) {
            featuredItem = { title: item.resource.name, description: item.resource.description, url: item.permalink, category: item.resource.category };
            console.log(`✅ Featured item '${featuredItem.title}' cached.`);
        }
    } catch (error) {
        console.error("Could not fetch featured item.", error.message);
    }
};

module.exports = { router, fetchFeaturedItem };
