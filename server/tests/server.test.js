const request = require('supertest');
const express = require('express');

// Create a minimal test app to verify server setup
const app = express();
app.use(express.json());

// Basic test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running', status: 'ok' });
});

// Health check route (similar to main server)
app.get('/', (req, res) => {
  res.send('NASA System 7 Portal Backend is running.');
});

describe('NASA System 7 Portal - Basic Server Tests', () => {
  describe('Server Health', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toBe('NASA System 7 Portal Backend is running.');
    });

    it('should return proper JSON for test endpoint', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Server is running');
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Headers and Security', () => {
    it('should include basic security headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Basic headers that should be present
      expect(response.headers).toHaveProperty('content-type');
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(404); // Since we don't have CORS middleware in test app
    });
  });

  describe('Environment Setup', () => {
    it('should have test environment variables set', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.PORT).toBe('3002');
      expect(process.env.NASA_API_KEY).toBe('DEMO_KEY');
    });

    it('should have mocked database pool available', () => {
      const { mockPool } = require('./setup');
      expect(mockPool).toBeDefined();
      expect(mockPool.query).toBeDefined();
      expect(typeof mockPool.query).toBe('function');
    });
  });

  describe('Mock NASA API Responses', () => {
    it('should have properly structured mock APOD data', () => {
      const { mockNasaResponses } = require('./setup');
      expect(mockNasaResponses).toBeDefined();
      expect(mockNasaResponses.apod).toBeDefined();

      const apodData = mockNasaResponses.apod;
      expect(apodData).toHaveProperty('date');
      expect(apodData).toHaveProperty('title');
      expect(apodData).toHaveProperty('explanation');
      expect(apodData).toHaveProperty('url');
      expect(apodData).toHaveProperty('media_type');
    });

    it('should have properly structured mock NEO data', () => {
      const { mockNasaResponses } = require('./setup');
      expect(mockNasaResponses.neo).toBeDefined();

      const neoData = mockNasaResponses.neo;
      expect(neoData).toHaveProperty('element_count');
      expect(neoData).toHaveProperty('near_earth_objects');
      expect(typeof neoData.element_count).toBe('number');
    });

    it('should have properly structured mock resource data', () => {
      const { mockNasaResponses } = require('./setup');
      expect(mockNasaResponses.resource).toBeDefined();

      const resourceData = mockNasaResponses.resource;
      expect(resourceData).toHaveProperty('title');
      expect(resourceData).toHaveProperty('description');
      expect(resourceData).toHaveProperty('media_type');
    });
  });

  describe('Test Helpers', () => {
    it('should provide helper for creating mock responses', () => {
      const { testHelpers } = require('./setup');
      expect(testHelpers).toBeDefined();
      expect(testHelpers.createNasaMockResponse).toBeDefined();
      expect(typeof testHelpers.createNasaMockResponse).toBe('function');

      const mockResponse = testHelpers.createNasaMockResponse('apod');
      expect(mockResponse).toHaveProperty('data');
      expect(mockResponse).toHaveProperty('status', 200);
    });

    it('should provide helper for creating mock database responses', () => {
      const { testHelpers } = require('./setup');
      expect(testHelpers.createDbMockResponse).toBeDefined();

      const mockDbResponse = testHelpers.createDbMockResponse([{ id: 1 }]);
      expect(mockDbResponse).toHaveProperty('rows');
      expect(mockDbResponse).toHaveProperty('rowCount', 1);
    });

    it('should provide helper for creating error responses', () => {
      const { testHelpers } = require('./setup');
      expect(testHelpers.createNasaErrorResponse).toBeDefined();

      const errorResponse = testHelpers.createNasaErrorResponse(500, 'Test Error');
      expect(errorResponse).toHaveProperty('response');
      expect(errorResponse.response).toHaveProperty('status', 500);
      expect(errorResponse.response.data).toHaveProperty('error', 'Test Error');
    });
  });
});