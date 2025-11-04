describe('NASA System 7 Portal - API Integration', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('APOD (Astronomy Picture of the Day) Integration', () => {
    beforeEach(() => {
      // Mock successful NASA API response
      cy.interceptNasaApi('apod', 'apod-success.json');
    });

    it('should fetch and display APOD data', () => {
      cy.openSystem7App('apod');

      cy.waitForNasaApi('apod');

      // Verify APOD content is displayed
      cy.validateApodData();

      // Check that API was called correctly
      cy.get('@nasa-apod').should('have.property', 'request');
      cy.get('@nasa-apod').its('request.url').should('include', 'api_key=');
    });

    it('should handle date-specific APOD requests', () => {
      const testDate = '2024-01-01';
      cy.interceptNasaApi('apod', 'apod-historical.json');

      cy.openSystem7App('apod');

      // Navigate to specific date
      cy.get('[data-testid="date-picker"]').type(testDate);
      cy.get('[data-testid="load-date-button"]').click();

      cy.waitForNasaApi('apod');

      // Verify correct date was requested
      cy.get('@nasa-apod').its('request.url').should('include', `date=${testDate}`);
    });

    it('should handle APOD API errors gracefully', () => {
      cy.handleNasaApiError(500);
      cy.openSystem7App('apod');

      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'Failed to load');

      // Should provide retry option
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should implement proper caching for APOD requests', () => {
      cy.openSystem7App('apod');
      cy.waitForNasaApi('apod');

      // Close and reopen app
      cy.closeSystem7Window('apod');
      cy.openSystem7App('apod');

      // Should not make additional API call due to caching
      cy.get('@nasa-apod').should('have.been.calledOnce');
    });

    it('should handle HD image loading', () => {
      cy.interceptNasaApi('apod', 'apod-hd.json');

      cy.openSystem7App('apod');
      cy.waitForNasaApi('apod');

      // Toggle HD image
      cy.get('[data-testid="hd-toggle"]').click();

      // Should load HD image
      cy.get('[data-testid="apod-image"]')
        .should('have.attr', 'src')
        .and('include', 'hd');
    });
  });

  describe('NeoWs (Near Earth Object Web Service) Integration', () => {
    beforeEach(() => {
      cy.interceptNasaApi('neo/feed', 'neo-feed-success.json');
    });

    it('should fetch and display NEO data', () => {
      cy.openSystem7App('neows');

      cy.waitForNasaApi('neo/feed');

      // Verify NEO content is displayed
      cy.validateNeoData();

      // Check that API was called with date range
      cy.get('@nasa-neo-feed').its('request.url').should('include', 'start_date');
      cy.get('@nasa-neo-feed').its('request.url').should('include', 'end_date');
    });

    it('should handle custom date range requests', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-07';

      cy.openSystem7App('neows');

      // Set custom date range
      cy.get('[data-testid="start-date"]').type(startDate);
      cy.get('[data-testid="end-date"]').type(endDate);
      cy.get('[data-testid="search-button"]').click();

      cy.waitForNasaApi('neo/feed');

      // Verify correct date range was requested
      cy.get('@nasa-neo-feed').its('request.url').should('include', `start_date=${startDate}`);
      cy.get('@nasa-neo-feed').its('request.url').should('include', `end_date=${endDate}`);
    });

    it('should display NEO orbital parameters and threat assessment', () => {
      cy.interceptNasaApi('neo/feed', 'neo-detailed.json');

      cy.openSystem7App('neows');
      cy.waitForNasaApi('neo/feed');

      // Verify detailed NEO information
      cy.get('[data-testid="neo-name"]').should('be.visible');
      cy.get('[data-testid="neo-diameter"]').should('be.visible');
      cy.get('[data-testid="neo-velocity"]').should('be.visible');
      cy.get('[data-testid="neo-distance"]').should('be.visible');

      // Check threat assessment
      cy.get('[data-testid="neo-hazardous"]').should('be.visible');
    });

    it('should handle NeoWs API errors', () => {
      cy.handleNasaApiError(429); // Rate limit error

      cy.openSystem7App('neows');

      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'rate limit');
    });

    it('should implement rate limiting for NeoWs requests', () => {
      cy.openSystem7App('neows');
      cy.waitForNasaApi('neo/feed');

      // Make multiple rapid requests
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="refresh-button"]').click();
        cy.wait(100);
      }

      // Should eventually hit rate limit
      cy.get('[data-testid="rate-limit-message"]').should('be.visible');
    });
  });

  describe('Resource Navigator Integration', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/resources/featured', {
        fixture: 'resource-featured.json'
      }).as('featuredResource');

      cy.intercept('GET', '/api/resources/search*', {
        fixture: 'resource-search.json'
      }).as('resourceSearch');
    });

    it('should load and display featured resources', () => {
      cy.openSystem7App('navigator');

      cy.wait('@featuredResource');

      // Verify featured content
      cy.validateResourceData();

      cy.get('[data-testid="featured-content"]').should('be.visible');
      cy.get('[data-testid="resource-title"]').should('not.be.empty');
      cy.get('[data-testid="resource-description"]').should('not.be.empty');
    });

    it('should handle resource search functionality', () => {
      cy.openSystem7App('navigator');
      cy.wait('@featuredResource');

      const searchTerm = 'Mars';
      cy.get('[data-testid="search-input"]').type(searchTerm);
      cy.get('[data-testid="search-button"]').click();

      cy.wait('@resourceSearch');

      // Verify search was made with correct term
      cy.get('@resourceSearch').its('request.url').should('include', `q=${searchTerm}`);

      // Verify search results
      cy.get('[data-testid="search-results"]').should('be.visible');
      cy.get('[data-testid="resource-item"]').should('have.length.greaterThan', 0);
    });

    it('should display different media types (images, videos, audio)', () => {
      cy.intercept('GET', '/api/resources/featured', {
        fixture: 'resource-multimedia.json'
      }).as('multimediaResource');

      cy.openSystem7App('navigator');
      cy.wait('@multimediaResource');

      // Check for different media types
      cy.get('[data-testid="resource-image"]').should('be.visible');
      cy.get('[data-testid="resource-video"]').should('be.visible');
      cy.get('[data-testid="resource-audio"]').should('be.visible');
    });

    it('should handle resource API errors', () => {
      cy.intercept('GET', '/api/resources/featured', {
        statusCode: 503,
        body: { error: 'Resource service unavailable' }
      }).as('resourceError');

      cy.openSystem7App('navigator');
      cy.wait('@resourceError');

      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'unavailable');
    });
  });

  describe('API Response Validation', () => {
    it('should validate APOD response structure', () => {
      cy.intercept('GET', '/api/nasa/apod*', {
        body: {
          date: '2024-01-01',
          title: 'Valid APOD',
          explanation: 'Valid explanation',
          url: 'https://example.com/image.jpg',
          media_type: 'image'
        }
      }).as('validApod');

      cy.openSystem7App('apod');
      cy.wait('@validApod');

      // Validate response structure
      cy.task('validateNasaData', {
        type: 'apod',
        data: {
          date: '2024-01-01',
          title: 'Valid APOD',
          explanation: 'Valid explanation',
          url: 'https://example.com/image.jpg',
          media_type: 'image'
        }
      }).then((validation) => {
        expect(validation.isValid).to.be.true;
      });
    });

    it('should handle malformed API responses', () => {
      cy.intercept('GET', '/api/nasa/apod*', {
        body: {
          // Missing required fields
          title: 'Incomplete APOD'
        }
      }).as('malformedApod');

      cy.openSystem7App('apod');
      cy.wait('@malformedApod');

      // Should handle incomplete data gracefully
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'incomplete');
    });

    it('should validate NEO response structure', () => {
      cy.intercept('GET', '/api/nasa/neo/feed*', {
        body: {
          element_count: 1,
          near_earth_objects: {
            '2024-01-01': [{
              id: '12345',
              name: 'Test Asteroid',
              estimated_diameter: {
                kilometers: { min: 0.1, max: 0.2 }
              },
              close_approach_data: [{
                miss_distance: { kilometers: '1000000' }
              }]
            }]
          }
        }
      }).as('validNeo');

      cy.openSystem7App('neows');
      cy.wait('@validNeo');

      cy.task('validateNasaData', {
        type: 'neo',
        data: {
          element_count: 1,
          near_earth_objects: {
            '2024-01-01': [{
              id: '12345',
              name: 'Test Asteroid',
              estimated_diameter: { kilometers: { min: 0.1, max: 0.2 } },
              close_approach_data: [{ miss_distance: { kilometers: '1000000' } }]
            }]
          }
        }
      }).then((validation) => {
        expect(validation.isValid).to.be.true;
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should measure API response times', () => {
      const startTime = performance.now();

      cy.intercept('GET', '/api/nasa/apod*', {
        fixture: 'apod-success.json',
        delay: 500 // 500ms delay
      }).as('timedApod');

      cy.openSystem7App('apod');
      cy.wait('@timedApod');

      cy.window().then((win) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Log response time
        cy.log(`APOD API response time: ${responseTime}ms`);

        // Should be within acceptable range
        expect(responseTime).to.be.lessThan(2000);
      });
    });

    it('should handle slow API responses gracefully', () => {
      cy.intercept('GET', '/api/nasa/apod*', {
        fixture: 'apod-success.json',
        delay: 5000 // 5 second delay
      }).as('slowApod');

      cy.openSystem7App('apod');

      // Should show loading indicator during slow response
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      cy.get('[data-testid="loading-message"]').should('contain', 'Loading');

      cy.wait('@slowApod', { timeout: 10000 });

      // Should eventually load successfully
      cy.get('[data-testid="apod-image"]').should('be.visible');
    });
  });

  describe('Security and Validation', () => {
    it('should validate API key in requests', () => {
      cy.openSystem7App('apod');
      cy.waitForNasaApi('apod');

      // Verify API key is included in requests
      cy.get('@nasa-apod').its('request.url').should('include', 'api_key=');
    });

    it('should sanitize user input before API calls', () => {
      cy.openSystem7App('neows');

      // Test XSS prevention
      const maliciousInput = '<script>alert("xss")</script>';
      cy.get('[data-testid="search-input"]').type(maliciousInput);
      cy.get('[data-testid="search-button"]').click();

      // Should not execute malicious script
      cy.window().then((win) => {
        expect(win.alert).to.not.have.been.called;
      });
    });

    it('should handle API quota limitations', () => {
      // Mock quota exceeded response
      cy.handleNasaApiError(403);

      cy.openSystem7App('apod');

      cy.get('[data-testid="error-message"]').should('contain', 'quota');
      cy.get('[data-testid="error-message"]').should('contain', 'exceeded');
    });
  });
});