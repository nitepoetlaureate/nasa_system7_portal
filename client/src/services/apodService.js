import { apiClient } from './api';

/**
 * Enhanced APOD service with advanced functionality
 * Supports date range queries, batch operations, and enhanced metadata
 */

class ApodService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get APOD for a specific date
     */
    async getApodForDate(date) {
        const cacheKey = `apod-${date}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await apiClient.get(`/nasa/planetary/apod?date=${date}`);
            const data = response.data;

            // Enhance with additional metadata
            const enhancedData = {
                ...data,
                enhanced: {
                    dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
                    month: new Date(date).toLocaleDateString('en-US', { month: 'long' }),
                    year: new Date(date).getFullYear(),
                    imageUrlQuality: this.detectImageQuality(data.url, data.hdurl),
                    downloadSize: await this.estimateImageSize(data.hdurl || data.url),
                    tags: this.generateTags(data.title, data.explanation),
                    relatedTopics: this.findRelatedTopics(data.title, data.explanation)
                }
            };

            this.setCache(cacheKey, enhancedData);
            return enhancedData;
        } catch (error) {
            throw new Error(`Failed to fetch APOD for ${date}: ${error.message}`);
        }
    }

    /**
     * Get APOD for a date range
     */
    async getApodRange(startDate, endDate) {
        const cacheKey = `apod-range-${startDate}-${endDate}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const promises = [];
            const start = new Date(startDate);
            const end = new Date(endDate);

            for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toISOString().split('T')[0];
                promises.push(this.getApodForDate(dateStr));
            }

            const results = await Promise.allSettled(promises);
            const apods = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);

            this.setCache(cacheKey, apods);
            return apods;
        } catch (error) {
            throw new Error(`Failed to fetch APOD range: ${error.message}`);
        }
    }

    /**
     * Search APODs by keyword
     */
    async searchApods(query, limit = 20) {
        const cacheKey = `apod-search-${query}-${limit}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // Since NASA API doesn't support search directly, we'll search recent APODs
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30); // Search last 30 days

            const apods = await this.getApodRange(
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            const filteredApods = apods.filter(apod => {
                const searchText = `${apod.title} ${apod.explanation}`.toLowerCase();
                return searchText.includes(query.toLowerCase());
            }).slice(0, limit);

            this.setCache(cacheKey, filteredApods);
            return filteredApods;
        } catch (error) {
            throw new Error(`Failed to search APODs: ${error.message}`);
        }
    }

    /**
     * Get APOD statistics
     */
    async getApodStatistics() {
        const cacheKey = 'apod-stats';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // Get recent APODs for analysis
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 100); // Last 100 days

            const apods = await this.getApodRange(
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            const stats = {
                totalApods: apods.length,
                imageApods: apods.filter(apod => apod.media_type === 'image').length,
                videoApods: apods.filter(apod => apod.media_type === 'video').length,
                copyrightApods: apods.filter(apod => apod.copyright).length,
                averageTitleLength: apods.reduce((sum, apod) => sum + apod.title.length, 0) / apods.length,
                averageExplanationLength: apods.reduce((sum, apod) => sum + apod.explanation.length, 0) / apods.length,
                mostCommonTags: this.getMostCommonTags(apods),
                dateRange: {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0]
                }
            };

            this.setCache(cacheKey, stats);
            return stats;
        } catch (error) {
            throw new Error(`Failed to get APOD statistics: ${error.message}`);
        }
    }

    /**
     * Get APOD recommendations based on user preferences
     */
    async getApodRecommendations(userFavorites = []) {
        try {
            if (userFavorites.length === 0) {
                // Return popular recent APODs
                return await this.getApodRange(
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    new Date().toISOString().split('T')[0]
                );
            }

            // Analyze user favorites to find patterns
            const favoriteTags = userFavorites.flatMap(fav => fav.enhanced?.tags || []);
            const tagFrequency = {};
            favoriteTags.forEach(tag => {
                tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
            });

            const topTags = Object.entries(tagFrequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([tag]) => tag);

            // Search for APODs with similar tags
            const recommendations = [];
            for (const tag of topTags) {
                const searchResults = await this.searchApods(tag, 5);
                recommendations.push(...searchResults);
            }

            // Remove duplicates and user's existing favorites
            const uniqueRecommendations = recommendations
                .filter((apod, index, arr) => arr.findIndex(a => a.date === apod.date) === index)
                .filter(apod => !userFavorites.some(fav => fav.date === apod.date))
                .slice(0, 10);

            return uniqueRecommendations;
        } catch (error) {
            throw new Error(`Failed to get recommendations: ${error.message}`);
        }
    }

    /**
     * Get APOD collection by category
     */
    async getApodByCategory(category) {
        const categoryKeywords = {
            'galaxies': ['galaxy', 'galaxies', 'spiral', 'elliptical', 'andromeda'],
            'nebulae': ['nebula', 'nebulae', 'orion', 'crab', 'eagle'],
            'planets': ['mars', 'jupiter', 'saturn', 'venus', 'mercury'],
            'stars': ['star', 'stars', 'supernova', 'pulsar', 'neutron'],
            'spacecraft': ['hubble', 'james webb', 'telescope', 'rover', 'spacecraft'],
            'earth': ['earth', 'aurora', 'atmosphere', 'clouds', 'ocean']
        };

        const keywords = categoryKeywords[category.toLowerCase()];
        if (!keywords) {
            throw new Error(`Unknown category: ${category}`);
        }

        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 365); // Search last year

            const apods = await this.getApodRange(
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            const categoryApods = apods.filter(apod => {
                const searchText = `${apod.title} ${apod.explanation}`.toLowerCase();
                return keywords.some(keyword => searchText.includes(keyword));
            });

            return categoryApods;
        } catch (error) {
            throw new Error(`Failed to get ${category} APODs: ${error.message}`);
        }
    }

    // Helper methods
    detectImageQuality(standardUrl, hdUrl) {
        if (!hdUrl) return 'standard';
        if (hdUrl.includes('_hires_') || hdUrl.includes('_4k_')) return 'ultra-hd';
        if (hdUrl.includes('_hd_') || hdUrl.includes('_large_')) return 'high-definition';
        return 'standard';
    }

    async estimateImageSize(imageUrl) {
        try {
            const response = await fetch(imageUrl, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                const bytes = parseInt(contentLength);
                if (bytes > 10 * 1024 * 1024) return 'large';
                if (bytes > 5 * 1024 * 1024) return 'medium';
                return 'small';
            }
            return 'unknown';
        } catch {
            return 'unknown';
        }
    }

    generateTags(title, explanation) {
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

    findRelatedTopics(title, explanation) {
        const text = `${title} ${explanation}`.toLowerCase();
        const topics = [];

        if (text.includes('hubble')) topics.push('Hubble Space Telescope');
        if (text.includes('james webb')) topics.push('James Webb Space Telescope');
        if (text.includes('mars')) topics.push('Mars Exploration');
        if (text.includes('black hole')) topics.push('Black Holes & Relativity');
        if (text.includes('galaxy')) topics.push('Galaxies & Cosmology');

        return topics;
    }

    getMostCommonTags(apods) {
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

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }
}

export const apodService = new ApodService();
export default apodService;