const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    screenshot: true,
    screenshotFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    videoCompression: 32,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    execTimeout: 60000,
    taskTimeout: 60000,
    trashAssetsBeforeRuns: true,
    chromeWebSecurity: false,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      // NASA API keys and endpoints for testing
      NASA_API_URL: 'http://localhost:3001/api/nasa',
      NASA_API_KEY: process.env.NASA_API_KEY || 'DEMO_KEY',
    },
    setupNodeEvents(on, config) {
      // System 7 specific tasks
      on('task', {
        // NASA API mocking tasks
        mockNasaApiResponse({ endpoint, response }) {
          // Implementation for mocking NASA API responses
          return response;
        },

        // Database cleanup for testing
        cleanupTestData() {
          // Implementation for cleaning up test data
          return null;
        },

        // System 7 state management tasks
        logSystem7State(state) {
          console.log('System 7 State:', JSON.stringify(state, null, 2));
          return null;
        },

        // NASA data validation tasks
        validateNasaData(data) {
          // Implementation for validating NASA API data structure
          const isValid = data && typeof data === 'object';
          return { isValid, errors: isValid ? [] : ['Invalid NASA data structure'] };
        },
      });
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});