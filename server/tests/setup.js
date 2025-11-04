// NASA System 7 Portal Server Test Setup

// Test database configuration
const { Pool } = require('pg');

// Mock database for testing
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};

// Mock PostgreSQL pool
jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3002'; // Use different port for testing
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nasa_system7_test';
  process.env.NASA_API_KEY = 'DEMO_KEY';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

  // Initialize mock database
  mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockPool.query.mockReset();
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  if (mockPool.end) {
    await mockPool.end();
  }

  // Clean up any remaining resources
  jest.restoreAllMocks();
});

// Mock NASA API responses
const mockNasaResponses = {
  apod: {
    date: '2024-01-01',
    title: 'Test APOD',
    explanation: 'Test explanation for Astronomy Picture of the Day',
    url: 'https://apod.nasa.gov/apod/image/2401/test.jpg',
    hdurl: 'https://apod.nasa.gov/apod/image/2401/test_hd.jpg',
    media_type: 'image',
    service_version: 'v1',
    copyright: 'Test Copyright',
  },
  neo: {
    links: { next: null, prev: null, self: 'http://api.nasa.gov/neo/rest/v1/feed' },
    element_count: 2,
    near_earth_objects: {
      '2024-01-01': [
        {
          id: '12345',
          neo_reference_id: '12345',
          name: '(12345) Test Asteroid',
          name_limited: '(12345) Test Asteroid',
          designation: '12345',
          nasa_jpl_url: 'http://ssd.jpl.nasa.gov/sbdb.cgi?sstr=12345',
          absolute_magnitude_h: 20.5,
          estimated_diameter: {
            kilometers: { estimated_diameter_min: 0.1, estimated_diameter_max: 0.2 },
            meters: { estimated_diameter_min: 100, estimated_diameter_max: 200 },
            miles: { estimated_diameter_min: 0.06, estimated_diameter_max: 0.12 },
            feet: { estimated_diameter_min: 328, estimated_diameter_max: 656 },
          },
          is_potentially_hazardous_asteroid: false,
          close_approach_data: [
            {
              close_approach_date: '2024-01-01',
              close_approach_date_full: '2024-Jan-01 00:00',
              epoch_date_close_approach: 1704067200000,
              relative_velocity: { kilometers_per_second: '10.5', kilometers_per_hour: '37800' },
              miss_distance: { kilometers: '1000000', lunar: '2.6', miles: '621371' },
              orbiting_body: 'Earth',
            },
          ],
          is_sentry_object: false,
        },
      ],
    },
  },
  resource: {
    title: 'Test Resource',
    description: 'Test resource description',
    media_type: 'image',
    media_url: 'https://images-assets.nasa.gov/test/test.jpg',
    location: 'NASA Headquarters',
    keywords: ['test', 'nasa', 'space'],
    date_created: '2024-01-01T00:00:00Z',
  },
};

// Mock axios for NASA API calls
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn((url) => {
      if (url.includes('apod')) {
        return Promise.resolve({ data: mockNasaResponses.apod });
      }
      if (url.includes('neo')) {
        return Promise.resolve({ data: mockNasaResponses.neo });
      }
      if (url.includes('resource')) {
        return Promise.resolve({ data: mockNasaResponses.resource });
      }
      return Promise.resolve({ data: {} });
    }),
  })),
}));

// Export mocks for use in tests
global.mockPool = mockPool;
global.mockNasaResponses = mockNasaResponses;

// Helper functions for testing
global.testHelpers = {
  // Create mock NASA API response
  createNasaMockResponse: (endpoint, data = null) => {
    const response = data || mockNasaResponses[endpoint] || {};
    return { data: response, status: 200 };
  },

  // Create mock database response
  createDbMockResponse: (rows = [], rowCount = rows.length) => ({
    rows,
    rowCount,
  }),

  // Test helper for NASA API errors
  createNasaErrorResponse: (status = 500, message = 'NASA API Error') => ({
    response: { status, data: { error: message } },
  }),
};