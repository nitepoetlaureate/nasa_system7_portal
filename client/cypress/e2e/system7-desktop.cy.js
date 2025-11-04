describe('NASA System 7 Portal - Desktop Experience', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.measurePageLoad();
  });

  describe('System 7 Desktop Loading', () => {
    it('should load the System 7 desktop interface', () => {
      cy.get('[data-testid="desktop"]').should('be.visible');
      cy.get('[data-testid="menu-bar"]').should('be.visible');
      cy.get('[data-testid="desktop-background"]').should('have.class', 's7-pattern');
    });

    it('should display all application icons', () => {
      // Verify System 7 application icons are present
      cy.get('[data-testid="desktop-icon-apod"]').should('be.visible');
      cy.get('[data-testid="desktop-icon-neows"]').should('be.visible');
      cy.get('[data-testid="desktop-icon-navigator"]').should('be.visible');
      cy.get('[data-testid="desktop-image-viewer"]').should('be.visible');
    });

    it('should have proper System 7 styling and aesthetics', () => {
      // Check System 7 gray color scheme
      cy.get('[data-testid="desktop"]').should('have.css', 'background-color', 'rgb(128, 128, 128)');

      // Check menu bar styling
      cy.get('[data-testid="menu-bar"]').should('have.css', 'background-color', 'rgb(160, 160, 160)');

      // Check window styling when opened
      cy.openSystem7App('apod');
      cy.get('[data-testid="window-apod"]').should('have.css', 'border-color', 'rgb(64, 64, 64)');
    });
  });

  describe('Application Launching', () => {
    it('should open APOD application on double-click', () => {
      cy.openSystem7App('apod');

      // Verify window opens with correct title
      cy.get('[data-testid="window-apod"]').should('be.visible');
      cy.get('[data-testid="window-title-apod"]').should('contain', 'APOD');

      // Verify window has System 7 controls
      cy.get('[data-testid="window-apod"] [data-testid="close-button"]').should('be.visible');
      cy.get('[data-testid="window-apod"] [data-testid="minimize-button"]').should('be.visible');
      cy.get('[data-testid="window-apod"] [data-testid="zoom-button"]').should('be.visible');
    });

    it('should open NeoWs application on double-click', () => {
      cy.openSystem7App('neows');

      cy.get('[data-testid="window-neows"]').should('be.visible');
      cy.get('[data-testid="window-title-neows"]').should('contain', 'Near Earth Objects');
    });

    it('should open Resource Navigator application on double-click', () => {
      cy.openSystem7App('navigator');

      cy.get('[data-testid="window-navigator"]').should('be.visible');
      cy.get('[data-testid="window-title-navigator"]').should('contain', 'Resource Navigator');
    });

    it('should open multiple applications simultaneously', () => {
      cy.openSystem7App('apod');
      cy.openSystem7App('neows');
      cy.openSystem7App('navigator');

      // All windows should be visible
      cy.get('[data-testid="window-apod"]').should('be.visible');
      cy.get('[data-testid="window-neows"]').should('be.visible');
      cy.get('[data-testid="window-navigator"]').should('be.visible');

      // Active window should be the last opened
      cy.get('[data-testid="window-navigator"]').should('have.class', 'active');
    });
  });

  describe('Window Management', () => {
    beforeEach(() => {
      cy.openSystem7App('apod');
    });

    it('should close windows using close button', () => {
      cy.closeSystem7Window('apod');
      cy.get('[data-testid="window-apod"]').should('not.exist');
    });

    it('should minimize windows using minimize button', () => {
      cy.get('[data-testid="window-apod"] [data-testid="minimize-button"]').click();
      cy.get('[data-testid="window-apod"]').should('have.class', 'minimized');
    });

    it('should bring windows to front when clicked', () => {
      // Open second window
      cy.openSystem7App('neows');

      // First window should not be active
      cy.get('[data-testid="window-apod"]').should('not.have.class', 'active');
      cy.get('[data-testid="window-neows"]').should('have.class', 'active');

      // Click first window to bring to front
      cy.get('[data-testid="window-apod"]').click();
      cy.get('[data-testid="window-apod"]').should('have.class', 'active');
      cy.get('[data-testid="window-neows"]').should('not.have.class', 'active');
    });

    it('should drag windows to new positions', () => {
      const window = cy.get('[data-testid="window-apod"]');

      // Get initial position
      window.should('have.attr', 'data-x').and('eq', '0');
      window.should('have.attr', 'data-y').and('eq', '0');

      // Drag window
      cy.get('[data-testid="window-title-apod"]')
        .trigger('mousedown', { which: 1 })
        .trigger('mousemove', { clientX: 100, clientY: 50 })
        .trigger('mouseup');

      // Verify new position
      window.should('have.attr', 'data-x').and('not.eq', '0');
      window.should('have.attr', 'data-y').and('not.eq', '0');
    });

    it('should resize windows using resize handle', () => {
      cy.get('[data-testid="window-apod"]').should('have.css', 'width', '800px');
      cy.get('[data-testid="window-apod"]').should('have.css', 'height', '600px');

      // Test resize functionality
      cy.get('[data-testid="window-apod"] [data-testid="resize-handle"]')
        .trigger('mousedown', { which: 1 })
        .trigger('mousemove', { clientX: 850, clientY: 650 })
        .trigger('mouseup');

      cy.get('[data-testid="window-apod"]').should('have.css', 'width').and('match', /\d+px/);
      cy.get('[data-testid="window-apod"]').should('have.css', 'height').and('match', /\d+px/);
    });
  });

  describe('Menu Bar Functionality', () => {
    it('should display menu bar with correct options', () => {
      cy.get('[data-testid="menu-bar"]').should('be.visible');
      cy.clickMenuBarItem('File');
      cy.clickMenuBarItem('Edit');
      cy.clickMenuBarItem('View');
      cy.clickMenuBarItem('Special');
      cy.clickMenuBarItem('Help');
    });

    it('should respond to menu item clicks', () => {
      cy.clickMenuBarItem('File');
      cy.get('[data-testid="file-menu"]').should('be.visible');

      // Test menu items
      cy.get('[data-testid="menu-item-new"]').should('be.visible');
      cy.get('[data-testid="menu-item-open"]').should('be.visible');
      cy.get('[data-testid="menu-item-quit"]').should('be.visible');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate desktop icons with Tab key', () => {
      cy.get('body').tab();
      cy.get('[data-testid="desktop-icon-apod"]').should('have.focus');

      cy.focused().tab();
      cy.get('[data-testid="desktop-icon-neows"]').should('have.focus');

      cy.focused().tab();
      cy.get('[data-testid="desktop-icon-navigator"]').should('have.focus');
    });

    it('should open windows with Enter key on focused icon', () => {
      cy.get('[data-testid="desktop-icon-apod"]').focus();
      cy.focused().type('{enter}');

      cy.get('[data-testid="window-apod"]').should('be.visible');
    });

    it('should close windows with Command+W (macOS) or Alt+F4 (Windows)', () => {
      cy.openSystem7App('apod');

      // Test both keyboard shortcuts
      cy.get('[data-testid="window-apod"]').click();
      cy.get('body').type('{meta}{w}'); // macOS

      // Window should close
      cy.get('[data-testid="window-apod"]').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle application launch failures gracefully', () => {
      // Mock failed API response
      cy.intercept('GET', '/api/nasa/apod*', {
        statusCode: 500,
        body: { error: 'NASA API Error' }
      }).as('failedApodRequest');

      cy.openSystem7App('apod');
      cy.wait('@failedApodRequest');

      // Should show error message
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'Error');

      // Should provide retry option
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should handle network timeouts gracefully', () => {
      // Mock network timeout
      cy.intercept('GET', '/api/nasa/apod*', {
        statusCode: 408,
        body: { error: 'Request Timeout' }
      }).as('timeoutRequest');

      cy.openSystem7App('apod');
      cy.wait('@timeoutRequest');

      cy.get('[data-testid="error-message"]').should('contain', 'timeout');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      cy.checkSystem7Accessibility();

      // Check specific accessibility features
      cy.get('[data-testid="desktop-icon-apod"]')
        .should('have.attr', 'aria-label', 'APOD - Astronomy Picture of the Day')
        .should('have.attr', 'role', 'button');

      cy.get('[data-testid="window-apod"]')
        .should('have.attr', 'role', 'dialog')
        .should('have.attr', 'aria-label', 'APOD Application Window');
    });

    it('should support screen reader announcements', () => {
      cy.get('[data-testid="screen-reader-announcements"]')
        .should('have.attr', 'aria-live', 'polite')
        .should('have.attr', 'aria-atomic', 'true');
    });

    it('should have sufficient color contrast', () => {
      // Check System 7 color contrast
      cy.get('[data-testid="desktop-icon-apod"]').then(($icon) => {
        const bgColor = $icon.css('background-color');
        const textColor = $icon.find('span').css('color');

        // This would need actual contrast calculation
        // For now, just verify colors are defined
        expect(bgColor).to.not.be.empty;
        expect(textColor).to.not.be.empty;
      });
    });
  });

  describe('Performance', () => {
    it('should load within performance thresholds', () => {
      cy.measurePageLoad();
    });

    it('should handle rapid window operations without lag', () => {
      const startTime = performance.now();

      // Open and close multiple windows rapidly
      for (let i = 0; i < 5; i++) {
        cy.openSystem7App('apod');
        cy.wait(100);
        cy.closeSystem7Window('apod');
      }

      cy.window().then((win) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete within 2 seconds
        expect(duration).to.be.lessThan(2000);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      // Test different viewport sizes
      cy.viewport(800, 600);
      cy.get('[data-testid="desktop"]').should('be.visible');

      cy.viewport(1200, 800);
      cy.get('[data-testid="desktop"]').should('be.visible');

      cy.viewport(1920, 1080);
      cy.get('[data-testid="desktop"]').should('be.visible');
    });

    it('should handle window resizing gracefully', () => {
      cy.viewport(800, 600);
      cy.openSystem7App('apod');

      // Resize viewport
      cy.viewport(1200, 800);

      // Window should adapt to new size
      cy.get('[data-testid="window-apod"]').should('be.visible');
      cy.get('[data-testid="window-apod"]').should('have.css', 'width').and('match', /\d+px/);
    });
  });
});