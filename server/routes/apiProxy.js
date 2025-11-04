const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');
const router = express.Router();

const NASA_API_KEY = process.env.NASA_API_KEY;
const NASA_API_URL = 'https://api.nasa.gov';
const JPL_SSD_API_URL = 'https://ssd-api.jpl.nasa.gov';

// This is the corrected proxy middleware.
// It now uses `req.path` to reconstruct the full, correct path to the external API.
const proxyRequest = (baseURL) => async (req, res) => {
    // req.path provides the full path of the request, e.g., "/planetary/apod"
    const endpoint = req.path; 

    try {
        const params = {
            ...req.query,
            api_key: NASA_API_KEY,
        };

        // The leading '/' from req.path is sliced off before appending to the base URL.
        const response = await axios.get(`${baseURL}${endpoint}`, { params });
        res.json(response.data);
    } catch (error) {
        // More detailed error logging for easier debugging.
        console.error(`API proxy error for endpoint: ${endpoint}`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        res.status(error.response?.status || 500).json({ 
            message: 'Error fetching data from external API.',
            error: error.message,
            details: error.response?.data 
        });
    }
};

// Apply caching middleware to all NASA API requests
router.get('/*', cacheMiddleware('nasa'), proxyRequest(NASA_API_URL));

// Note: A more complex setup would be needed if JPL and NASA had overlapping paths.
// For our current apps, this is robust.

module.exports = router;
