const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');
const router = express.Router();

const NASA_API_KEY = process.env.NASA_API_KEY;
const NASA_API_URL = 'https://api.nasa.gov';

// Enhanced APOD endpoints with additional functionality

// Get APOD for specific date with enhanced metadata
router.get('/enhanced/:date', cacheMiddleware('apod-enhanced'), async (req, res) => {
    try {
        const { date } = req.params;

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                error: 'Invalid date format. Use YYYY-MM-DD.',
                code: 'INVALID_DATE_FORMAT'
            });
        }

        // Don't allow future dates
        const today = new Date().toISOString().split('T')[0];
        if (date > today) {
            return res.status(400).json({
                error: 'Date cannot be in the future.',
                code: 'FUTURE_DATE'
            });
        }

        // Don't allow dates before first APOD
        if (date < '1995-06-16') {
            return res.status(400).json({
                error: 'APOD started on June 16, 1995.',
                code: 'DATE_TOO_EARLY'
            });
        }

        const response = await axios.get(`${NASA_API_URL}/planetary/apod`, {
            params: {
                date,
                api_key: NASA_API_KEY,
                thumbs: true // Include thumbnail for videos
            }
        });

        const apodData = response.data;

        // Enhance with additional metadata
        const enhancedData = {
            ...apodData,
            enhanced: {
                dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
                month: new Date(date).toLocaleDateString('en-US', { month: 'long' }),
                year: new Date(date).getFullYear(),
                dayOfYear: Math.floor((new Date(date) - new Date(date.split('-')[0], 0, 0)) / 86400000),
                weekOfYear: Math.ceil((new Date(date) - new Date(date.split('-')[0], 0, 1)) / 604800000),
                imageUrlQuality: detectImageQuality(apodData.url, apodData.hdurl),
                hasThumbnail: !!apodData.thumbnail_url,
                tags: generateTags(apodData.title, apodData.explanation),
                categories: categorizeApod(apodData.title, apodData.explanation),
                readabilityScore: calculateReadabilityScore(apodData.explanation),
                wordCount: apodData.explanation.split(/\s+/).length,
                estimatedReadingTime: Math.ceil(apodData.explanation.split(/\s+/).length / 200), // 200 words per minute
                relatedTopics: findRelatedTopics(apodData.title, apodData.explanation),
                astronomicalEvents: findAstronomicalEvents(date),
                spaceMissions: findRelevantSpaceMissions(apodData.title, apodData.explanation),
                educationalResources: findEducationalResources(apodData.title, apodData.explanation)
            }
        };

        res.json(enhancedData);
    } catch (error) {
        console.error('Enhanced APOD API error:', error);

        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'No APOD available for this date.',
                code: 'NO_APOD_FOUND'
            });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch enhanced APOD data.',
            message: error.message,
            code: 'API_ERROR'
        });
    }
});

// Get APOD range with enhanced processing
router.post('/range', cacheMiddleware('apod-range'), async (req, res) => {
    try {
        const { startDate, endDate, includeEnhanced = true } = req.body;

        // Validate date range
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format. Use YYYY-MM-DD.',
                code: 'INVALID_DATE_FORMAT'
            });
        }

        if (startDate > endDate) {
            return res.status(400).json({
                error: 'Start date must be before end date.',
                code: 'INVALID_DATE_RANGE'
            });
        }

        if (startDate < '1995-06-16') {
            return res.status(400).json({
                error: 'APOD started on June 16, 1995.',
                code: 'DATE_TOO_EARLY'
            });
        }

        // Calculate days in range (limit to prevent abuse)
        const daysInRange = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
        if (daysInRange > 365) {
            return res.status(400).json({
                error: 'Date range cannot exceed 365 days.',
                code: 'DATE_RANGE_TOO_LARGE'
            });
        }

        // Fetch APODs for date range
        const promises = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            promises.push(
                axios.get(`${NASA_API_URL}/planetary/apod`, {
                    params: { date: dateStr, api_key: NASA_API_KEY, thumbs: true }
                })
            );
        }

        const results = await Promise.allSettled(promises);
        const apods = [];

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === 'fulfilled') {
                const apodData = result.data;

                if (includeEnhanced) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + i);
                    const dateStr = currentDate.toISOString().split('T')[0];

                    apods.push({
                        ...apodData,
                        enhanced: {
                            dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
                            month: currentDate.toLocaleDateString('en-US', { month: 'long' }),
                            year: currentDate.getFullYear(),
                            imageUrlQuality: detectImageQuality(apodData.url, apodData.hdurl),
                            tags: generateTags(apodData.title, apodData.explanation),
                            categories: categorizeApod(apodData.title, apodData.explanation)
                        }
                    });
                } else {
                    apods.push(apodData);
                }
            }
        }

        // Calculate statistics for the range
        const statistics = {
            totalApods: apods.length,
            imageApods: apods.filter(apod => apod.media_type === 'image').length,
            videoApods: apods.filter(apod => apod.media_type === 'video').length,
            copyrightApods: apods.filter(apod => apod.copyright).length,
            averageTitleLength: apods.reduce((sum, apod) => sum + apod.title.length, 0) / apods.length,
            averageExplanationLength: apods.reduce((sum, apod) => sum + apod.explanation.length, 0) / apods.length,
            mostCommonTags: getMostCommonTags(apods),
            dateRange: { start: startDate, end: endDate },
            dayRange: daysInRange
        };

        res.json({
            apods,
            statistics,
            rangeInfo: {
                startDate,
                endDate,
                totalDays: daysInRange,
                apodsFound: apods.length,
                coveragePercentage: Math.round((apods.length / daysInRange) * 100)
            }
        });
    } catch (error) {
        console.error('APOD range API error:', error);
        res.status(500).json({
            error: 'Failed to fetch APOD range.',
            message: error.message,
            code: 'API_ERROR'
        });
    }
});

// Search APODs by keywords (simulated search)
router.post('/search', cacheMiddleware('apod-search'), async (req, res) => {
    try {
        const { query, limit = 20, dateRange } = req.body;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                error: 'Search query must be at least 2 characters long.',
                code: 'INVALID_QUERY'
            });
        }

        // Determine search date range
        let endDate = new Date();
        let startDate = new Date();

        if (dateRange) {
            startDate = new Date(dateRange.start);
            endDate = new Date(dateRange.end);
        } else {
            // Default to last 90 days
            startDate.setDate(endDate.getDate() - 90);
        }

        // Limit search range to prevent abuse
        const daysInRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        if (daysInRange > 365) {
            return res.status(400).json({
                error: 'Search date range cannot exceed 365 days.',
                code: 'DATE_RANGE_TOO_LARGE'
            });
        }

        // Fetch APODs for search range
        const searchPromises = [];
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            searchPromises.push(
                axios.get(`${NASA_API_URL}/planetary/apod`, {
                    params: { date: dateStr, api_key: NASA_API_KEY, thumbs: true }
                })
            );
        }

        const results = await Promise.allSettled(searchPromises);
        const allApods = [];

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                allApods.push(result.data);
            }
        });

        // Filter APODs based on search query
        const searchTerms = query.toLowerCase().split(/\s+/);
        const scoredApods = allApods.map(apod => {
            const searchText = `${apod.title} ${apod.explanation}`.toLowerCase();
            let score = 0;

            // Calculate relevance score
            searchTerms.forEach(term => {
                // Title matches are worth more
                if (apod.title.toLowerCase().includes(term)) {
                    score += 10;
                }
                // Explanation matches
                if (apod.explanation.toLowerCase().includes(term)) {
                    score += 5;
                }
                // Copyright matches
                if (apod.copyright && apod.copyright.toLowerCase().includes(term)) {
                    score += 3;
                }
                // Date matches (if search term looks like a date)
                if (term.match(/^\d{4}$/) && apod.date.startsWith(term)) {
                    score += 8;
                }
            });

            return { ...apod, searchScore: score };
        });

        // Filter out results with no matches and sort by relevance
        const matchingApods = scoredApods
            .filter(apod => apod.searchScore > 0)
            .sort((a, b) => b.searchScore - a.searchScore)
            .slice(0, limit);

        res.json({
            query,
            results: matchingApods,
            totalFound: matchingApods.length,
            searchInfo: {
                dateRange: {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0]
                },
                totalSearched: allApods.length,
                matchesFound: matchingApods.length
            }
        });
    } catch (error) {
        console.error('APOD search API error:', error);
        res.status(500).json({
            error: 'Failed to search APODs.',
            message: error.message,
            code: 'API_ERROR'
        });
    }
});

// Get APOD statistics and analytics
router.get('/statistics', cacheMiddleware('apod-statistics'), async (req, res) => {
    try {
        const { period = 'year' } = req.query;

        let startDate, endDate;
        const today = new Date();

        switch (period) {
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                endDate = today;
                break;
            case 'quarter':
                startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
                endDate = today;
                break;
            case 'year':
                startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                endDate = today;
                break;
            case 'all':
                startDate = new Date('1995-06-16');
                endDate = today;
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid period. Use: month, quarter, year, or all.',
                    code: 'INVALID_PERIOD'
                });
        }

        // Sample data for statistics (in production, this would query a database)
        const sampleStatistics = {
            totalApods: Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)),
            imageApods: Math.floor(Math.random() * 0.95 * ((endDate - startDate) / (1000 * 60 * 60 * 24))),
            videoApods: Math.floor(Math.random() * 0.05 * ((endDate - startDate) / (1000 * 60 * 60 * 24))),
            copyrightApods: Math.floor(Math.random() * 0.6 * ((endDate - startDate) / (1000 * 60 * 60 * 24))),
            averageTitleLength: 45 + Math.floor(Math.random() * 20),
            averageExplanationLength: 800 + Math.floor(Math.random() * 400),
            topCategories: [
                { name: 'galaxies', count: Math.floor(Math.random() * 100) },
                { name: 'nebulae', count: Math.floor(Math.random() * 80) },
                { name: 'planets', count: Math.floor(Math.random() * 60) },
                { name: 'stars', count: Math.floor(Math.random() * 90) },
                { name: 'spacecraft', count: Math.floor(Math.random() * 40) }
            ],
            periodInfo: {
                period,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                daysInPeriod: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
            }
        };

        res.json(sampleStatistics);
    } catch (error) {
        console.error('APOD statistics API error:', error);
        res.status(500).json({
            error: 'Failed to fetch APOD statistics.',
            message: error.message,
            code: 'API_ERROR'
        });
    }
});

// Helper functions for enhanced metadata
function detectImageQuality(standardUrl, hdUrl) {
    if (!hdUrl) return 'standard';
    if (hdUrl.includes('_hires_') || hdUrl.includes('_4k_')) return 'ultra-hd';
    if (hdUrl.includes('_hd_') || hdUrl.includes('_large_')) return 'high-definition';
    return 'standard';
}

function generateTags(title, explanation) {
    const text = `${title} ${explanation}`.toLowerCase();
    const tags = [];

    const tagPatterns = {
        'galaxy': /galax(y|ies)/,
        'nebula': /nebula/,
        'planet': /mars|jupiter|saturn|venus|mercury|uranus|neptune/,
        'star': /star|supernova|pulsar/,
        'spacecraft': /hubble|james webb|telescope|rover|spacecraft/,
        'earth': /earth|aurora|atmosphere/,
        'moon': /moon|lunar/,
        'sun': /sun|solar|corona/,
        'black-hole': /black hole|event horizon/,
        'comet': /comet/,
        'asteroid': /asteroid|meteor/
    };

    Object.entries(tagPatterns).forEach(([tag, pattern]) => {
        if (pattern.test(text)) {
            tags.push(tag);
        }
    });

    return tags;
}

function categorizeApod(title, explanation) {
    const text = `${title} ${explanation}`.toLowerCase();
    const categories = [];

    if (/galax(y|ies)/.test(text)) categories.push('deep-space');
    if (/nebula/.test(text)) categories.push('stellar-nursery');
    if (/mars|jupiter|saturn|venus|mercury/.test(text)) categories.push('planetary');
    if (/earth|aurora|atmosphere/.test(text)) categories.push('earth-science');
    if (/hubble|james webb|telescope/.test(text)) categories.push('observational');
    if (/rover|spacecraft|mission/.test(text)) categories.push('space-exploration');
    if (/sun|solar|corona/.test(text)) categories.push('solar-system');

    return categories.length > 0 ? categories : ['general'];
}

function calculateReadabilityScore(text) {
    // Simple readability calculation (Flesch-Kincaid approximation)
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = text.toLowerCase().split(/\s+/).reduce((count, word) => {
        return count + Math.max(1, word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g)?.length || 1);
    }, 0);

    if (sentences === 0) return 0;

    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, Math.round(score)));
}

function findRelatedTopics(title, explanation) {
    const text = `${title} ${explanation}`.toLowerCase();
    const topics = [];

    if (text.includes('hubble')) topics.push('Hubble Space Telescope');
    if (text.includes('james webb')) topics.push('James Webb Space Telescope');
    if (text.includes('mars')) topics.push('Mars Exploration');
    if (text.includes('black hole')) topics.push('Black Holes & Relativity');
    if (text.includes('galaxy')) topics.push('Galaxies & Cosmology');

    return topics;
}

function findAstronomicalEvents(date) {
    const events = [];
    const d = new Date(date);

    // Check for some common astronomical events (simplified)
    const month = d.getMonth() + 1;
    const day = d.getDate();

    if (month === 8 && day >= 11 && day <= 13) events.push('Perseid Meteor Shower');
    if (month === 12 && day >= 13 && day <= 15) events.push('Geminid Meteor Shower');
    if (month === 3 && day >= 20 && day <= 22) events.push('Spring Equinox');
    if (month === 9 && day >= 20 && day <= 23) events.push('Autumn Equinox');

    return events;
}

function findRelevantSpaceMissions(title, explanation) {
    const text = `${title} ${explanation}`.toLowerCase();
    const missions = [];

    const missionKeywords = {
        'Hubble Space Telescope': ['hubble', 'hst'],
        'James Webb Space Telescope': ['james webb', 'jwst'],
        'Mars Rovers': ['mars rover', 'curiosity', 'perseverance', 'opportunity'],
        'Voyager': ['voyager'],
        'Apollo': ['apollo', 'moon landing'],
        'International Space Station': ['iss', 'international space station'],
        'Cassini': ['cassini', 'saturn'],
        'New Horizons': ['new horizons', 'pluto']
    };

    Object.entries(missionKeywords).forEach(([mission, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
            missions.push(mission);
        }
    });

    return missions;
}

function findEducationalResources(title, explanation) {
    const text = `${title} ${explanation}`.toLowerCase();
    const resources = [];

    if (/galax(y|ies)/.test(text)) resources.push('NASA Galaxy Exploration');
    if (/black hole/.test(text)) resources.push('Black Hole Basics');
    if (/mars/.test(text)) resources.push('Mars Exploration Program');
    if (/telescope/.test(text)) resources.push('Space Telescopes Guide');

    return resources;
}

function getMostCommonTags(apods) {
    const allTags = apods.flatMap(apod => apod.enhanced?.tags || []);
    const tagCount = {};
    allTags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
    });

    return Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
}

module.exports = router;