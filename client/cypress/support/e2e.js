// Import custom commands
import './commands';

// Global setup for NASA System 7 Portal E2E tests
beforeEach(() => {
  // Set up System 7 environment variables
  cy.viewport(1280, 720);

  // Clear localStorage before each test
  cy.clearLocalStorage();

  // Clear cookies before each test
  cy.clearCookies();

  // Handle uncaught exceptions for System 7 sound effects
  Cypress.on('uncaught:exception', (err, runnable) => {
    // Prevent Cypress from failing on uncaught exceptions from sound effects
    if (err.message.includes('AudioContext') || err.message.includes('audio')) {
      return false;
    }

    // Handle NASA API timeout errors gracefully
    if (err.message.includes('timeout') || err.message.includes('network')) {
      return false;
    }

    return true;
  });
});

// Global cleanup after each test
afterEach(() => {
  // Clean up any test data
  cy.cleanupTestData();

  // Take screenshots on test failure
  cy.screenshot({ capture: 'viewport' });
});

// Performance monitoring for System 7
Cypress.on('window:before:load', (win) => {
  // Add performance monitoring
  win.addEventListener('load', () => {
    const navigation = win.performance.getEntriesByType('navigation')[0];
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    cy.log(`Performance: Page loaded in ${loadTime}ms`);
  });
});

// Network monitoring for NASA API calls
Cypress.on('window:before:load', (win) => {
  // Intercept fetch requests for NASA API monitoring
  const originalFetch = win.fetch;
  win.fetch = (...args) => {
    const [url, options] = args;
    if (url.includes('/api/nasa/')) {
      cy.log(`NASA API Request: ${url}`);
    }
    return originalFetch.apply(win, args);
  };
});