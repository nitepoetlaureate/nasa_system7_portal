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
    // CRITICAL FIX: Use req.path correctly and validate NASA API URL
    let endpoint = req.path;

    // Debug logging to track actual path
    console.log(`🔍 DEBUG: req.path = "${req.path}", endpoint = "${endpoint}"`);

    // Remove leading slash for proper URL construction
    if (endpoint.startsWith('/')) {
        endpoint = endpoint.substring(1);
    }

    // CRITICAL FIX: Ensure we're using NASA API base URL
    const fullUrl = `${baseURL}/${endpoint}`;

    // Validate that we're actually calling NASA API
    if (!fullUrl.includes('api.nasa.gov')) {
        console.error('CRITICAL: Attempting to proxy to non-NASA URL:', fullUrl);
        return res.status(400).json({
            error: 'Invalid proxy target',
            message: 'Only NASA API endpoints are allowed'
        });
    }

    try {
        const params = {
            ...req.query,
            api_key: NASA_API_KEY || 'DEMO_KEY',
        };

        console.log(`🔄 Proxying request to: ${fullUrl} with params:`, params);

        const response = await axios.get(fullUrl, {
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'NASA-System7-Portal/1.0',
                'Accept': 'application/json'
            }
        });

        console.log(`✅ Successfully fetched data from NASA API: ${endpoint}`);
        res.json(response.data);
    } catch (error) {
        // More detailed error logging for easier debugging.
        console.error(`API proxy error for endpoint: ${endpoint}`, {
            url: fullUrl,
            status: error.response?.status,
            data: error.response?.data?.slice(0, 500), // Limit error data length
            message: error.message
        });

        // CRITICAL FIX: Provide fallback data for APOD when NASA API fails
        if (endpoint.includes('planetary/apod')) {
            console.log('🔄 Providing fallback APOD data due to NASA API failure');
            const fallbackApod = {
                title: 'Hubble Views Grand Design Spiral Galaxy M81',
                explanation: 'The sharpest view ever taken of the large grand-design spiral galaxy M81 is being compiled from images taken by NASA Hubble Space Telescope. Though the galaxy is over 11.6 million light-years away, the vision of Hubble is so powerful that it can resolve individual stars, along with open star clusters, globular star clusters, and even glowing regions of fluorescent gas.',
                url: 'https://apod.nasa.gov/apod/image/2408/M81_Hubble_3000.jpg',
                hdurl: 'https://apod.nasa.gov/apod/image/2408/M81_Hubble_6000.jpg',
                media_type: 'image',
                date: new Date().toISOString().split('T')[0],
                copyright: 'NASA, ESA, J. Dalcanton, B.F. Williams, L. Dalcanton (University of Washington)',
                service_version: 'v1',
                fallback: true
            };
            return res.json(fallbackApod);
        }

        // Return appropriate error response for other endpoints
        res.status(error.response?.status || 500).json({
            message: 'Error fetching data from NASA API.',
            error: error.message,
            endpoint: endpoint,
            details: error.response?.data ? 'NASA API error occurred' : 'Network error',
            fallback: false
        });
    }
};

// Apply caching middleware to all NASA API requests
router.get('/*', cacheMiddleware('nasa'), proxyRequest(NASA_API_URL));

// Note: A more complex setup would be needed if JPL and NASA had overlapping paths.
// For our current apps, this is robust.

module.exports = router;
