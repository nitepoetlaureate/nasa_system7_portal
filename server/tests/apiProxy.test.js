const request = require('supertest');
const express = require('express');
const cors = require('cors');
const apiProxyRouter = require('../routes/apiProxy');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/nasa', apiProxyRouter);

describe('NASA API Proxy Routes', () => {
  describe('GET /api/nasa/apod', () => {
    it('should return APOD data successfully', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .query({ api_key: 'DEMO_KEY' })
        .expect(200);

      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('explanation');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('media_type');
    });

    it('should handle missing API key', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('API key');
    });

    it('should handle NASA API errors', async () => {
      // Mock NASA API error
      const axios = require('axios');
      const mockAxios = axios.create();
      mockAxios.get = jest.fn().mockRejectedValue({
        response: { status: 403, data: { error: 'Invalid API key' } }
      });

      const response = await request(app)
        .get('/api/nasa/apod')
        .query({ api_key: 'INVALID_KEY' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/nasa/neo', () => {
    it('should return NEO data successfully', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-07';

      const response = await request(app)
        .get('/api/nasa/neo')
        .query({
          start_date: startDate,
          end_date: endDate,
          api_key: 'DEMO_KEY'
        })
        .expect(200);

      expect(response.body).toHaveProperty('element_count');
      expect(response.body).toHaveProperty('near_earth_objects');
      expect(response.body.near_earth_objects).toHaveProperty(startDate);
    });

    it('should validate date parameters', async () => {
      const response = await request(app)
        .get('/api/nasa/neo')
        .query({
          start_date: 'invalid-date',
          end_date: '2024-01-07',
          api_key: 'DEMO_KEY'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should handle missing date range', async () => {
      const response = await request(app)
        .get('/api/nasa/neo')
        .query({ api_key: 'DEMO_KEY' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('start_date');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit requests after threshold', async () => {
      // Make multiple requests quickly
      const promises = Array(100).fill().map(() =>
        request(app)
          .get('/api/nasa/apod')
          .query({ api_key: 'DEMO_KEY' })
      );

      const responses = await Promise.all(promises);

      // At least one request should be rate limited
      const rateLimitedResponse = responses.find(res => res.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .query({ api_key: 'DEMO_KEY' })
        .expect(200);

      // Check for security headers (these should be set by helmet middleware)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from authorized origins', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .set('Origin', 'http://localhost:3000')
        .query({ api_key: 'DEMO_KEY' })
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .set('Origin', 'http://malicious-site.com')
        .query({ api_key: 'DEMO_KEY' })
        .expect(403);
    });
  });
});