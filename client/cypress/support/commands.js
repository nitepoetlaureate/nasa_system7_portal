// Custom Cypress commands for NASA System 7 Portal testing

// System 7 UI Commands
Cypress.Commands.add('openSystem7App', (appName) => {
  cy.get(`[data-testid="desktop-icon-${appName}"]`).click();
  cy.get(`[data-testid="window-${appName}"]`).should('be.visible');
});

Cypress.Commands.add('closeSystem7Window', (windowId) => {
  cy.get(`[data-testid="window-${windowId}"] [data-testid="close-button"]`).click();
  cy.get(`[data-testid="window-${windowId}"]`).should('not.exist');
});

Cypress.Commands.add('clickMenuBarItem', (menuItem) => {
  cy.get(`[data-testid="menu-bar"]`).contains(menuItem).click();
});

// NASA API Commands
Cypress.Commands.add('interceptNasaApi', (endpoint, fixture = null, statusCode = 200) => {
  const alias = `nasa-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`;

  if (fixture) {
    cy.intercept('GET', `/api/nasa/${endpoint}*`, { fixture, statusCode }).as(alias);
  } else {
    cy.intercept('GET', `/api/nasa/${endpoint}*`, { statusCode }).as(alias);
  }

  return cy.get(`@${alias}`);
});

Cypress.Commands.add('waitForNasaApi', (endpoint, timeout = 10000) => {
  const alias = `nasa-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`;
  return cy.wait(`@${alias}`, { timeout });
});

// System 7 Data Validation Commands
Cypress.Commands.add('validateApodData', () => {
  cy.get('[data-testid="apod-image"]').should('be.visible');
  cy.get('[data-testid="apod-title"]').should('not.be.empty');
  cy.get('[data-testid="apod-date"]').should('match', /\d{4}-\d{2}-\d{2}/);
  cy.get('[data-testid="apod-explanation"]').should('not.be.empty');
});

Cypress.Commands.add('validateNeoData', () => {
  cy.get('[data-testid="neo-list"]').should('exist');
  cy.get('[data-testid="neo-item"]').should('have.length.greaterThan', 0);
  cy.get('[data-testid="neo-name"]').should('not.be.empty');
  cy.get('[data-testid="neo-diameter"]').should('not.be.empty');
  cy.get('[data-testid="neo-velocity"]').should('not.be.empty');
});

Cypress.Commands.add('validateResourceData', () => {
  cy.get('[data-testid="resource-list"]').should('exist');
  cy.get('[data-testid="resource-item"]').should('have.length.greaterThan', 0);
  cy.get('[data-testid="resource-title"]').should('not.be.empty');
  cy.get('[data-testid="resource-description"]').should('not.be.empty');
});

// System 7 Performance Commands
Cypress.Commands.add('measurePageLoad', () => {
  cy.window().then((win) => {
    const navigation = win.performance.getEntriesByType('navigation')[0];
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    cy.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).to.be.lessThan(3000); // 3 second threshold
  });
});

// System 7 Accessibility Commands
Cypress.Commands.add('checkSystem7Accessibility', () => {
  // Check keyboard navigation
  cy.get('body').tab();
  cy.focused().should('be.visible');

  // Check ARIA labels
  cy.get('[data-testid="desktop-icon"]').each(($icon) => {
    cy.wrap($icon).should('have.attr', 'aria-label');
  });

  // Check color contrast for System 7 UI
  cy.get('[data-testid="window"]').each(($window) => {
    cy.wrap($window).should('have.css', 'background-color');
    cy.wrap($window).find('[data-testid="window-title"]').should('have.css', 'color');
  });
});

// Error Handling Commands
Cypress.Commands.add('handleNasaApiError', (statusCode = 500) => {
  cy.intercept('GET', '/api/nasa/**', { statusCode, body: { error: 'NASA API Error' } });
  cy.get('[data-testid="error-message"]').should('be.visible');
  cy.get('[data-testid="error-message"]').should('contain', 'Error');
});

// Database Cleanup Commands
Cypress.Commands.add('cleanupTestData', () => {
  cy.task('cleanupTestData');
});