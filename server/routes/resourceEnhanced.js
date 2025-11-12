const express = require('express');
const axios = require('axios');
const router = express.Router();
const { db } = require('../config/database');
const legacyDb = require('../db'); // Legacy database wrapper

// Featured item cache (from old resourceNavigator)
let featuredItem = null;

// Enhanced search functionality for NASA resources
router.get('/search', async (req, res) => {
    try {
        const { query, category, format, usage_level, sortBy = 'relevance', page = 1, limit = 20 } = req.query;

        // Mock enhanced search results for demonstration
        const mockResults = {
            datasets: [
                {
                    id: 'mars-climate-2024',
                    type: 'Dataset',
                    title: 'Mars Climate Data 2020-2024',
                    category: 'Planetary Data',
                    format: 'CSV',
                    usage_level: 'Research',
                    description: 'Comprehensive climate data from Mars rovers and orbiters including temperature, atmospheric pressure, and dust storm activity.',
                    url: 'https://pds.nasa.gov/mars-climate',
                    download_count: 15420,
                    rating: 4.8,
                    review_count: 127,
                    file_size: '2.4 GB',
                    updated_at: '2024-01-15T10:30:00Z',
                    preview_url: 'https://mars-climate-preview.nasa.gov'
                },
                {
                    id: 'earth-temperature',
                    type: 'Dataset',
                    title: 'Global Temperature Anomaly Dataset',
                    category: 'Climate & Weather',
                    format: 'NetCDF',
                    usage_level: 'Intermediate',
                    description: 'Monthly global temperature anomalies from 1880 to present, with detailed spatial resolution and uncertainty estimates.',
                    url: 'https://data.giss.nasa.gov/gistemp',
                    download_count: 28350,
                    rating: 4.9,
                    review_count: 203,
                    file_size: '156 MB',
                    updated_at: '2024-01-20T14:15:00Z'
                },
                {
                    id: 'hubble-deep-field',
                    type: 'Dataset',
                    title: 'Hubble Ultra Deep Field Images',
                    category: 'Astronomy',
                    format: 'FITS',
                    usage_level: 'Research',
                    description: 'High-resolution images from the Hubble Space Telescope Ultra Deep Field observation, including raw and processed data.',
                    url: 'https://hubblesite.org/contents/media/images/2004/07/1714-Image.html',
                    download_count: 31200,
                    rating: 4.7,
                    review_count: 156,
                    file_size: '8.7 GB',
                    updated_at: '2024-01-10T09:45:00Z',
                    preview_url: 'https://hubble-preview.stsci.edu'
                }
            ],
            software: [
                {
                    id: 'nasa-worldwind',
                    type: 'Software',
                    title: 'NASA World Wind',
                    category: 'Software Tools',
                    format: 'Java',
                    usage_level: 'Intermediate',
                    description: 'Open-source virtual globe SDK for creating interactive 3D maps and geospatial visualizations.',
                    url: 'https://worldwind.arc.nasa.gov',
                    download_count: 45800,
                    rating: 4.6,
                    review_count: 189,
                    file_size: '125 MB',
                    updated_at: '2024-01-18T16:20:00Z'
                },
                {
                    id: 'panoply',
                    type: 'Software',
                    title: 'Panoply NetCDF Data Viewer',
                    category: 'Data Analysis',
                    format: 'Java',
                    usage_level: 'Beginner',
                    description: 'Cross-platform tool for plotting geo-referenced arrays from netCDF, HDF and GRIB datasets.',
                    url: 'https://www.giss.nasa.gov/tools/panoply',
                    download_count: 22400,
                    rating: 4.5,
                    review_count: 98,
                    file_size: '45 MB',
                    updated_at: '2024-01-12T11:30:00Z'
                }
            ],
            tutorials: [
                {
                    id: 'getting-started-nasa-data',
                    type: 'Tutorial',
                    title: 'Getting Started with NASA Open Data',
                    category: 'Educational',
                    usage_level: 'Beginner',
                    description: 'Comprehensive guide to accessing and using NASA open data APIs, including code examples and best practices.',
                    url: 'https://data.nasa.gov/education/getting-started',
                    rating: 4.8,
                    review_count: 342,
                    duration: '45 minutes'
                },
                {
                    id: 'satellite-image-analysis',
                    type: 'Tutorial',
                    title: 'Satellite Image Processing with Python',
                    category: 'Image Processing',
                    usage_level: 'Intermediate',
                    description: 'Learn to process and analyze satellite imagery using Python libraries like GDAL, rasterio, and matplotlib.',
                    url: 'https://earthdata.nasa.gov/learn/satellite-image-processing',
                    rating: 4.7,
                    review_count: 156,
                    duration: '2 hours'
                }
            ]
        };

        // Apply filters
        const filterItems = (items) => {
            return items.filter(item => {
                if (category && item.category !== category) return false;
                if (format && item.format !== format) return false;
                if (usage_level && item.usage_level !== usage_level) return false;
                return true;
            });
        };

        const filteredResults = {
            datasets: filterItems(mockResults.datasets),
            software: filterItems(mockResults.software),
            tutorials: filterItems(mockResults.tutorials)
        };

        res.json({
            success: true,
            data: filteredResults,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filteredResults.datasets.length + filteredResults.software.length + filteredResults.tutorials.length
            }
        });

    } catch (error) {
        console.error('Enhanced search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed. Please try again.',
            message: error.message
        });
    }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
    try {
        const { query } = req.query;

        // Mock suggestions based on query
        const suggestions = [
            'Mars rover data',
            'Climate change analysis',
            'Earth observation',
            'Satellite imagery',
            'Astronomical data',
            'Space mission data',
            'Atmospheric science',
            'Oceanographic data',
            'Solar activity',
            'Near Earth Objects'
        ].filter(suggestion =>
            suggestion.toLowerCase().includes(query.toLowerCase())
        );

        res.json({
            success: true,
            data: suggestions.slice(0, 5)
        });

    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load suggestions'
        });
    }
});

// Get featured item
router.get('/featured', async (req, res) => {
    try {
        const featuredItem = {
            id: 'james-webb-first-images',
            type: 'Dataset',
            title: 'James Webb Space Telescope First Images',
            category: 'Astronomy',
            usage_level: 'Educational',
            description: 'Stunning high-resolution images from the James Webb Space Telescope, including the deepest infrared view of the universe to date.',
            url: 'https://webbtelescope.org/news',
            download_count: 89500,
            rating: 4.9,
            review_count: 445,
            updated_at: '2024-01-22T12:00:00Z',
            preview_url: 'https://webbtelescope.org/contents/media/images/2022/07/01/62c49a3c7466e2e732e1c5f9/2100x1400.jpg'
        };

        res.json({
            success: true,
            data: featuredItem
        });

    } catch (error) {
        console.error('Featured item error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load featured item'
        });
    }
});

// Get recommendations
router.get('/recommendations', async (req, res) => {
    try {
        const { query } = req.query;

        // Mock personalized recommendations
        const recommendations = [
            {
                id: 'exoplanet-data',
                type: 'Dataset',
                title: 'NASA Exoplanet Archive',
                category: 'Astronomy',
                rating: 4.8,
                download_count: 42100,
                description: 'Comprehensive database of confirmed exoplanets and their properties.'
            },
            {
                id: 'earth-observation-tools',
                type: 'Software',
                title: 'NASA Earth Observation Tools Suite',
                category: 'Software Tools',
                rating: 4.6,
                download_count: 35600,
                description: 'Collection of tools for processing and analyzing Earth observation satellite data.'
            },
            {
                id: 'space-mission-timeline',
                type: 'Tutorial',
                title: 'Interactive Space Mission Timeline',
                category: 'Educational',
                rating: 4.7,
                description: 'Explore the history of space exploration through an interactive timeline.'
            }
        ];

        res.json({
            success: true,
            data: recommendations
        });

    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load recommendations'
        });
    }
});

// Get trending items
router.get('/trending', async (req, res) => {
    try {
        const trendingItems = [
            {
                id: 'solar-wind-data',
                type: 'Dataset',
                title: 'Solar Wind Data from Parker Solar Probe',
                category: 'Space Science',
                download_count: 67800,
                rating: 4.7
            },
            {
                id: 'arctic-sea-ice',
                type: 'Dataset',
                title: 'Arctic Sea Ice Extent Data',
                category: 'Climate & Weather',
                download_count: 52300,
                rating: 4.6
            },
            {
                id: 'machine-learning-earth',
                type: 'Software',
                title: 'Machine Learning for Earth Science',
                category: 'Machine Learning',
                download_count: 48900,
                rating: 4.8
            }
        ];

        res.json({
            success: true,
            data: trendingItems
        });

    } catch (error) {
        console.error('Trending items error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load trending items'
        });
    }
});

// Get tutorials
router.get('/tutorials', async (req, res) => {
    try {
        const tutorials = [
            {
                id: 'nasa-api-basics',
                type: 'Tutorial',
                title: 'NASA API Fundamentals',
                category: 'Getting Started',
                duration: '30 minutes',
                description: 'Learn the basics of working with NASA APIs, including authentication and common endpoints.',
                url: 'https://api.nasa.gov',
                rating: 4.6,
                review_count: 89
            },
            {
                id: 'data-visualization',
                type: 'Tutorial',
                title: 'Visualizing NASA Data',
                category: 'Visualization',
                duration: '1 hour',
                description: 'Create compelling visualizations from NASA datasets using modern web technologies.',
                url: 'https://data.nasa.gov/visualization',
                rating: 4.7,
                review_count: 134
            },
            {
                id: 'python-space-analysis',
                type: 'Tutorial',
                title: 'Python for Space Data Analysis',
                category: 'Data Analysis',
                duration: '2.5 hours',
                description: 'Use Python libraries to analyze and visualize space and Earth science data.',
                url: 'https://data.nasa.gov/python-tutorial',
                rating: 4.8,
                review_count: 201
            },
            {
                id: 'remote-sensing-basics',
                type: 'Tutorial',
                title: 'Remote Sensing Fundamentals',
                category: 'Earth Science',
                duration: '45 minutes',
                description: 'Understanding the basics of satellite remote sensing and Earth observation.',
                url: 'https://earthdata.nasa.gov/learn/remote-sensing',
                rating: 4.5,
                review_count: 78
            }
        ];

        res.json({
            success: true,
            data: tutorials
        });

    } catch (error) {
        console.error('Tutorials error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load tutorials'
        });
    }
});

// Save item to library
router.post('/save', async (req, res) => {
    try {
        const { item } = req.body;

        if (!item || !item.id) {
            return res.status(400).json({
                success: false,
                error: 'Invalid item data'
            });
        }

        // Save to database
        await db.query(
            `INSERT INTO saved_items (id, type, title, url, category, description, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [
                item.id,
                item.type,
                item.title,
                item.url,
                item.category,
                item.description,
                JSON.stringify({
                    format: item.format,
                    usage_level: item.usage_level,
                    rating: item.rating,
                    download_count: item.download_count,
                    file_size: item.file_size
                })
            ]
        );

        res.json({
            success: true,
            message: 'Item saved successfully'
        });

    } catch (error) {
        console.error('Save item error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save item'
        });
    }
});

// Delete item from library
router.delete('/save/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM saved_items WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Item deleted successfully'
        });

    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete item'
        });
    }
});

// Rate item
router.post('/rate/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rating } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Invalid rating'
            });
        }

        // In a real implementation, this would update the rating in the database
        // For now, we'll just return success
        res.json({
            success: true,
            message: 'Rating submitted successfully'
        });

    } catch (error) {
        console.error('Rate item error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit rating'
        });
    }
});

// ===== LEGACY ROUTES FROM resourceNavigator.js =====

// Get saved items from database
router.get('/saved-items', async (req, res) => {
    try {
        const { rows } = await legacyDb.query('SELECT * FROM saved_items ORDER BY saved_at DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching saved items:', err);
        res.status(500).json({ message: 'Error fetching saved items.' });
    }
});

// Save item to database (legacy endpoint)
router.post('/save-item', async (req, res) => {
    const { id, type, title, url, category, description } = req.body;
    try {
        const text = 'INSERT INTO saved_items(id, type, title, url, category, description) VALUES($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description RETURNING *';
        const values = [id, type, title, url, category, description];
        const { rows } = await legacyDb.query(text, values);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error saving item:', err);
        res.status(500).json({ message: 'Error saving item.' });
    }
});

// Delete item from database (legacy endpoint)
router.delete('/delete-item/:id', async (req, res) => {
    try {
        await legacyDb.query('DELETE FROM saved_items WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ message: 'Error deleting item.' });
    }
});

// Get search history
router.get('/search-history', async (req, res) => {
    try {
        const { rows } = await legacyDb.query('SELECT query_string FROM saved_searches ORDER BY search_time DESC LIMIT 10');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching search history:', err);
        res.status(500).json({ message: 'Error fetching search history.' });
    }
});

// Get featured item (legacy endpoint using cached data)
router.get('/featured-item', (req, res) => {
    res.json(featuredItem);
});

// Live search against NASA APIs
router.post('/live-search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: 'Query is required.' });

    try {
        // Save search to history
        await legacyDb.query('INSERT INTO saved_searches(query_string) VALUES($1)', [query]);

        const dataNasaGovUrl = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=${query}&limit=50`;
        const githubApiUrl = `https://api.github.com/search/repositories?q=org:nasa+${query}&per_page=50`;

        const results = await Promise.allSettled([
            axios.get(dataNasaGovUrl, { headers: { 'X-App-Token': process.env.NASA_API_KEY }, timeout: 20000 }),
            axios.get(githubApiUrl, { timeout: 20000 })
        ]);

        const datasets = results[0].status === 'fulfilled'
            ? results[0].value.data.results.map(item => ({
                id: item.resource.id,
                type: 'Dataset',
                title: item.resource.name,
                url: item.permalink,
                category: item.resource.category,
                description: item.resource.description
            })).filter(d => d.title)
            : [];
        if (results[0].status === 'rejected') console.error("data.nasa.gov search failed:", results[0].reason.message);

        const software = results[1].status === 'fulfilled'
            ? results[1].value.data.items.map(s => ({
                id: s.id.toString(),
                type: 'Software',
                title: s.name,
                url: s.html_url,
                category: s.language,
                description: s.description
            }))
            : [];
        if (results[1].status === 'rejected') console.error("GitHub search failed:", results[1].reason.message);

        res.json({ datasets, software });
    } catch (err) {
        console.error('Live search failed:', err);
        res.status(500).json({ message: 'Live search failed.' });
    }
});

// Featured item fetcher function (called on startup)
const fetchFeaturedItem = async () => {
    try {
        console.log("Fetching featured dataset for Encarta panel...");
        const url = `https://data.nasa.gov/api/catalog/v1?search_context=data.nasa.gov&q=Mars%20Rover%20Photos&limit=1`;
        const response = await axios.get(url, { headers: { 'X-App-Token': process.env.NASA_API_KEY } });
        const item = response.data.results[0];
        if (item) {
            featuredItem = {
                title: item.resource.name,
                description: item.resource.description,
                url: item.permalink,
                category: item.resource.category
            };
            console.log(`✅ Featured item '${featuredItem.title}' cached.`);
        }
    } catch (error) {
        console.error("Could not fetch featured item.", error.message);
    }
};

module.exports = { router, fetchFeaturedItem };