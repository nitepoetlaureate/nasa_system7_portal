const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');
const router = express.Router();

const NASA_API_KEY = process.env.NASA_API_KEY;
const NASA_API_URL = 'https://api.nasa.gov';
const JPL_SSD_API_URL = 'https://ssd-api.jpl.nasa.gov';

// Enhanced NEO feed with additional processing
router.get('/enhanced/feed', cacheMiddleware('neo', 300), async (req, res) => {
    try {
        const { start_date, end_date, detailed = 'false' } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required'
            });
        }

        // Fetch basic NEO feed
        const feedResponse = await axios.get(`${NASA_API_URL}/neo/rest/v1/feed`, {
            params: {
                start_date,
                end_date,
                api_key: NASA_API_KEY
            }
        });

        const enhancedData = await processNeoFeedData(feedResponse.data, detailed === 'true');

        res.json({
            success: true,
            data: enhancedData,
            metadata: {
                start_date,
                end_date,
                total_objects: enhancedData.total_count,
                hazardous_objects: enhancedData.hazardous_count,
                enhanced: detailed === 'true'
            }
        });

    } catch (error) {
        console.error('Enhanced NEO feed error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch enhanced NEO data',
            details: error.response?.data || error.message
        });
    }
});

// Get detailed NEO analysis
router.get('/enhanced/neo/:id', cacheMiddleware('neo', 600), async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch basic NEO data
        const neoResponse = await axios.get(`${NASA_API_URL}/neo/rest/v1/neo/${id}`, {
            params: { api_key: NASA_API_KEY }
        });

        // Enhance with additional calculations and risk assessment
        const enhancedNeo = await enhanceNeoData(neoResponse.data);

        res.json({
            success: true,
            data: enhancedNeo
        });

    } catch (error) {
        console.error('Enhanced NEO details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch enhanced NEO details',
            details: error.response?.data || error.message
        });
    }
});

// Get NEO statistics and trends
router.get('/enhanced/statistics', cacheMiddleware('neo', 1800), async (req, res) => {
    try {
        const { period = 'year' } = req.query;

        const endDate = new Date();
        const startDate = new Date();

        switch(period) {
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            case 'decade':
                startDate.setFullYear(startDate.getFullYear() - 10);
                break;
            default:
                startDate.setFullYear(startDate.getFullYear() - 1);
        }

        // Fetch data for the period
        const allData = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 7); // Weekly data

            if (nextDate > endDate) nextDate.setTime(endDate.getTime());

            try {
                const response = await axios.get(`${NASA_API_URL}/neo/rest/v1/feed`, {
                    params: {
                        start_date: dateStr,
                        end_date: nextDate.toISOString().split('T')[0],
                        api_key: NASA_API_KEY
                    }
                });

                // Process the week's data
                Object.keys(response.data.near_earth_objects).forEach(date => {
                    response.data.near_earth_objects[date].forEach(neo => {
                        allData.push({
                            ...neo,
                            approach_date: date,
                            week_of: dateStr
                        });
                    });
                });
            } catch (err) {
                console.warn(`Failed to fetch data for week starting ${dateStr}:`, err.message);
            }

            currentDate.setDate(currentDate.getDate() + 7);
        }

        // Calculate statistics
        const statistics = calculateNeoStatistics(allData);

        res.json({
            success: true,
            data: statistics,
            metadata: {
                period,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                total_records: allData.length
            }
        });

    } catch (error) {
        console.error('NEO statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate NEO statistics',
            details: error.message
        });
    }
});

// Get close approaches within specified timeframe
router.get('/enhanced/close-approaches', cacheMiddleware('neo', 60), async (req, res) => {
    try {
        const {
            start_date,
            end_date,
            distance_max = '10000000', // 10 million km default
            diameter_min = '0',
            hazardous_only = 'false'
        } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required'
            });
        }

        const feedResponse = await axios.get(`${NASA_API_URL}/neo/rest/v1/feed`, {
            params: {
                start_date,
                end_date,
                api_key: NASA_API_KEY
            }
        });

        // Filter and process close approaches
        const closeApproaches = processCloseApproaches(
            feedResponse.data,
            {
                distance_max: parseFloat(distance_max),
                diameter_min: parseFloat(diameter_min),
                hazardous_only: hazardous_only === 'true'
            }
        );

        res.json({
            success: true,
            data: closeApproaches,
            metadata: {
                start_date,
                end_date,
                filters: {
                    distance_max,
                    diameter_min,
                    hazardous_only
                },
                total_found: closeApproaches.length
            }
        });

    } catch (error) {
        console.error('Close approaches error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch close approaches',
            details: error.response?.data || error.message
        });
    }
});

// Helper function to process NEO feed data
async function processNeoFeedData(feedData, detailed = false) {
    const processedData = {
        ...feedData,
        enhanced_objects: [],
        total_count: 0,
        hazardous_count: 0,
        risk_distribution: { low: 0, medium: 0, high: 0, critical: 0 },
        size_distribution: { small: 0, medium: 0, large: 0, huge: 0 },
        distance_categories: { very_close: 0, close: 0, moderate: 0, distant: 0 }
    };

    Object.keys(feedData.near_earth_objects).forEach(date => {
        feedData.near_earth_objects[date].forEach(neo => {
            const enhancedNeo = enhanceNeoObject(neo);
            processedData.enhanced_objects.push(enhancedNeo);

            // Update statistics
            processedData.total_count++;
            if (neo.is_potentially_hazardous_asteroid) {
                processedData.hazardous_count++;
            }

            // Risk distribution
            const riskScore = enhancedNeo.risk_score;
            if (riskScore >= 70) processedData.risk_distribution.critical++;
            else if (riskScore >= 40) processedData.risk_distribution.high++;
            else if (riskScore >= 20) processedData.risk_distribution.medium++;
            else processedData.risk_distribution.low++;

            // Size distribution
            const diameter = neo.estimated_diameter.meters.estimated_diameter_max;
            if (diameter < 50) processedData.size_distribution.small++;
            else if (diameter < 500) processedData.size_distribution.medium++;
            else if (diameter < 1000) processedData.size_distribution.large++;
            else processedData.size_distribution.huge++;

            // Distance categories
            const distance = parseFloat(neo.close_approach_data[0].miss_distance.kilometers);
            if (distance < 1000000) processedData.distance_categories.very_close++;
            else if (distance < 5000000) processedData.distance_categories.close++;
            else if (distance < 10000000) processedData.distance_categories.moderate++;
            else processedData.distance_categories.distant++;
        });
    });

    if (detailed) {
        // Add additional analysis for detailed view
        processedData.analysis = await performDetailedAnalysis(processedData.enhanced_objects);
    }

    return processedData;
}

// Helper function to enhance individual NEO object
function enhanceNeoObject(neo) {
    const closeApproach = neo.close_approach_data[0];
    const missDistance = parseFloat(closeApproach.miss_distance.kilometers);
    const velocity = parseFloat(closeApproach.relative_velocity.kilometers_per_second);
    const diameter = neo.estimated_diameter.meters.estimated_diameter_max;

    // Calculate enhanced metrics
    const riskScore = calculateRiskScore(missDistance, velocity, diameter, neo.is_potentially_hazardous_asteroid);
    const torinoLevel = calculateTorinoScale(missDistance, diameter, neo.is_potentially_hazardous_asteroid);
    const kineticEnergy = calculateKineticEnergy(diameter, velocity);
    const palermoScale = calculatePalermoScale(missDistance, diameter, neo.is_potentially_hazardous_asteroid);

    return {
        ...neo,
        enhanced_metrics: {
            risk_score: riskScore,
            torino_level: torinoLevel,
            kinetic_energy_joules: kineticEnergy,
            palermo_scale: palermoScale,
            hiroshima_equivalent: kineticEnergy / 6.3e13,
            damage_radius_m: calculateDamageRadius(diameter, velocity),
            impact_probability: calculateImpactProbability(missDistance, diameter, neo.is_potentially_hazardous_asteroid),
            atmospheric_entry: calculateAtmosphericEntry(diameter, velocity),
            energy_category: categorizeEnergy(kineticEnergy)
        }
    };
}

// Enhanced NEO data processing
async function enhanceNeoData(neoData) {
    const enhanced = enhanceNeoObject(neoData);

    // Add additional historical data and orbital characteristics
    try {
        // This could fetch additional data from JPL SSD or other sources
        enhanced.orbital_characteristics = await calculateOrbitalCharacteristics(neoData);
        enhanced.historical_approaches = await getHistoricalApproaches(neoData.id);
        enhanced.future_approaches = await getFutureApproaches(neoData.id);
    } catch (error) {
        console.warn('Could not fetch additional NEO data:', error.message);
    }

    return enhanced;
}

// Calculate NEO statistics
function calculateNeoStatistics(data) {
    const stats = {
        total_objects: data.length,
        hazardous_objects: data.filter(n => n.is_potentially_hazardous_asteroid).length,
        average_diameter: data.reduce((sum, n) => sum + n.estimated_diameter.meters.estimated_diameter_max, 0) / data.length,
        average_velocity: data.reduce((sum, n) => sum + parseFloat(n.close_approach_data[0].relative_velocity.kilometers_per_second), 0) / data.length,
        average_distance: data.reduce((sum, n) => sum + parseFloat(n.close_approach_data[0].miss_distance.kilometers), 0) / data.length,
        weekly_trends: {},
        monthly_trends: {},
        risk_distribution: { low: 0, medium: 0, high: 0, critical: 0 },
        size_distribution: { small: 0, medium: 0, large: 0, huge: 0 }
    };

    // Calculate weekly trends
    data.forEach(neo => {
        const week = neo.week_of;
        if (!stats.weekly_trends[week]) {
            stats.weekly_trends[week] = { count: 0, hazardous: 0, avg_distance: 0, distances: [] };
        }
        stats.weekly_trends[week].count++;
        if (neo.is_potentially_hazardous_asteroid) stats.weekly_trends[week].hazardous++;
        const distance = parseFloat(neo.close_approach_data[0].miss_distance.kilometers);
        stats.weekly_trends[week].distances.push(distance);
    });

    // Calculate averages for weekly trends
    Object.keys(stats.weekly_trends).forEach(week => {
        const distances = stats.weekly_trends[week].distances;
        stats.weekly_trends[week].avg_distance = distances.reduce((a, b) => a + b, 0) / distances.length;
        delete stats.weekly_trends[week].distances;
    });

    return stats;
}

// Process close approaches with filtering
function processCloseApproaches(feedData, filters) {
    const approaches = [];

    Object.keys(feedData.near_earth_objects).forEach(date => {
        feedData.near_earth_objects[date].forEach(neo => {
            const distance = parseFloat(neo.close_approach_data[0].miss_distance.kilometers);
            const diameter = neo.estimated_diameter.meters.estimated_diameter_max;

            // Apply filters
            if (distance > filters.distance_max) return;
            if (diameter < filters.diameter_min) return;
            if (filters.hazardous_only && !neo.is_potentially_hazardous_asteroid) return;

            approaches.push({
                ...neo,
                approach_date: date,
                distance_km: distance,
                diameter_m: diameter,
                urgency_score: calculateUrgencyScore(distance, diameter, neo.is_potentially_hazardous_asteroid)
            });
        });
    });

    return approaches.sort((a, b) => a.distance_km - b.distance_km);
}

// Risk calculation functions
function calculateRiskScore(missDistance, velocity, diameter, isHazardous) {
    let score = 0;

    // Distance factor (0-40 points)
    if (missDistance < 100000) score += 40;
    else if (missDistance < 500000) score += 30;
    else if (missDistance < 1000000) score += 20;
    else if (missDistance < 5000000) score += 10;

    // Velocity factor (0-30 points)
    if (velocity > 30) score += 30;
    else if (velocity > 20) score += 20;
    else if (velocity > 10) score += 10;

    // Size factor (0-20 points)
    if (diameter > 1000) score += 20;
    else if (diameter > 500) score += 15;
    else if (diameter > 100) score += 10;
    else if (diameter > 50) score += 5;

    // Hazard status bonus (0-10 points)
    if (isHazardous) score += 10;

    return Math.min(100, score);
}

function calculateTorinoScale(missDistance, diameter, isHazardous) {
    if (!isHazardous) return 0;

    if (missDistance < 100000 && diameter > 1000) return 8;
    if (missDistance < 500000 && diameter > 500) return 6;
    if (missDistance < 1000000 && diameter > 100) return 4;
    if (missDistance < 5000000) return 2;
    return 1;
}

function calculateKineticEnergy(diameter, velocity) {
    const density = 2700; // kg/m³
    const volume = (4/3) * Math.PI * Math.pow(diameter/2, 3);
    const mass = density * volume;
    return 0.5 * mass * Math.pow(velocity * 1000, 2); // Joules
}

function calculatePalermoScale(missDistance, diameter, isHazardous) {
    if (!isHazardous) return -10;

    let score = 0;
    if (missDistance < 100000) score += 2;
    else if (missDistance < 1000000) score += 1;
    else if (missDistance < 10000000) score += 0;
    else score -= 1;

    if (diameter > 1000) score += 1;
    else if (diameter < 100) score -= 1;

    return Math.max(-10, Math.min(5, score));
}

function calculateDamageRadius(diameter, velocity) {
    const energy = calculateKineticEnergy(diameter, velocity);
    return Math.round(Math.pow(energy / 1e12, 0.4) * 1000); // meters
}

function calculateImpactProbability(missDistance, diameter, isHazardous) {
    let baseProbability = 1 / 1000000;

    if (isHazardous) baseProbability *= 100;
    if (missDistance < 1000000) baseProbability *= 10;
    if (diameter > 1000) baseProbability *= 5;

    return Math.min(1, baseProbability);
}

function calculateAtmosphericEntry(diameter, velocity) {
    const criticalDiameter = 50;
    const criticalVelocity = 20;

    if (diameter < criticalDiameter && velocity < criticalVelocity) {
        return 'Will burn up completely';
    } else if (diameter < criticalDiameter) {
        return 'Partial fragmentation, airburst possible';
    } else if (diameter < 500) {
        return 'Significant airburst, ground impact possible';
    } else {
        return 'Will reach ground with substantial energy';
    }
}

function categorizeEnergy(energy) {
    if (energy < 1e12) return 'Local';
    if (energy < 1e15) return 'Regional';
    if (energy < 1e18) return 'Continental';
    return 'Global';
}

function calculateUrgencyScore(distance, diameter, isHazardous) {
    let score = 0;

    // Distance urgency
    if (distance < 1000000) score += 40;
    else if (distance < 5000000) score += 20;
    else if (distance < 10000000) score += 10;

    // Size urgency
    if (diameter > 1000) score += 30;
    else if (diameter > 500) score += 20;
    else if (diameter > 100) score += 10;

    // Hazard urgency
    if (isHazardous) score += 30;

    return Math.min(100, score);
}

// Additional helper functions for detailed analysis
async function performDetailedAnalysis(objects) {
    // This would perform more complex analysis
    return {
        orbital_patterns: analyzeOrbitalPatterns(objects),
        collision_probabilities: calculateCollisionProbabilities(objects),
        historical_comparisons: compareWithHistoricalData(objects),
        resource_potential: assessResourcePotential(objects)
    };
}

async function calculateOrbitalCharacteristics(neoData) {
    // Calculate detailed orbital characteristics
    return {
        orbital_period: 'Calculated from orbital elements',
        eccentricity: 'Enhanced calculation',
        inclination: 'Precise measurement',
        perihelion: 'Closest approach to Sun',
        aphelion: 'Farthest distance from Sun'
    };
}

async function getHistoricalApproaches(neoId) {
    // Fetch historical close approaches
    return [];
}

async function getFutureApproaches(neoId) {
    // Calculate future approaches
    return [];
}

function analyzeOrbitalPatterns(objects) {
    // Analyze orbital patterns among multiple objects
    return {};
}

function calculateCollisionProbabilities(objects) {
    // Calculate collision probabilities
    return {};
}

function compareWithHistoricalData(objects) {
    // Compare with historical impact data
    return {};
}

function assessResourcePotential(objects) {
    // Assess resource extraction potential
    return {};
}

module.exports = router;