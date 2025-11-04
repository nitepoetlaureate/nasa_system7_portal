# NASA System 7 Portal - Testing Documentation

## Overview

This document provides comprehensive guidelines and standards for testing the NASA System 7 Portal. The testing infrastructure follows a multi-layered approach to ensure quality, reliability, and performance across all components.

## Testing Pyramid Strategy

```
    E2E Tests (Cypress)
         ^
         |
    Integration Tests (Jest + React Testing Library)
         ^
         |
    Unit Tests (Jest)
```

### Coverage Targets
- **Unit Tests**: 80% coverage minimum
- **Integration Tests**: All critical user flows
- **E2E Tests**: Core application workflows
- **Performance Tests**: Load time < 3 seconds, API response < 2 seconds

## Test Structure

### Client-Side Testing (React)

#### Unit Tests
- **Location**: `client/src/**/__tests__/**/*.test.js`
- **Framework**: Jest + React Testing Library
- **Focus**: Component behavior, hooks, utilities

#### Integration Tests
- **Location**: `client/src/**/*.integration.test.js`
- **Framework**: Jest + React Testing Library
- **Focus**: Component interactions, API integration

#### E2E Tests
- **Location**: `client/cypress/e2e/**/*.cy.js`
- **Framework**: Cypress
- **Focus**: Complete user workflows

### Server-Side Testing (Node.js)

#### Unit Tests
- **Location**: `server/tests/**/*.test.js`
- **Framework**: Jest + Supertest
- **Focus**: API endpoints, middleware, utilities

#### Integration Tests
- **Location**: `server/tests/**/*.integration.test.js`
- **Framework**: Jest + Supertest
- **Focus**: API workflows, database integration

## Testing Standards

### Test Naming Conventions

#### Unit Tests
```javascript
// Describe the component/module
describe('ComponentName', () => {
  // Describe the functionality
  describe('Functionality Being Tested', () => {
    // Use "should" or "should not" for test expectations
    it('should render correctly with props', () => {});
    it('should handle user interaction', () => {});
    it('should show error state when API fails', () => {});
  });
});
```

#### E2E Tests
```javascript
// Use user-centric descriptions
describe('User Workflow Description', () => {
  beforeEach(() => {
    // Setup common state
    cy.visit('/');
  });

  it('should complete action when user interacts with system', () => {
    // User actions and expectations
  });
});
```

### System 7 Specific Testing Requirements

#### UI Components
- All System 7 windows must be draggable and resizable
- Menu bar functionality must work with keyboard navigation
- Desktop icons must respond to double-click events
- Sound effects must be properly mocked in tests

#### NASA API Integration
- All API calls must include proper error handling
- Rate limiting must be tested
- Data validation must be implemented for all responses
- Caching behavior must be verified

#### Accessibility
- ARIA labels must be present on all interactive elements
- Keyboard navigation must be supported
- Color contrast must meet WCAG standards
- Screen reader announcements must be implemented

## Test Data Management

### Fixtures
- **Location**: `client/cypress/fixtures/`
- **Purpose**: Mock API responses for consistent testing
- **Format**: JSON files matching NASA API structure

### Mock Services
- **API Mocking**: MSW for client-side API interception
- **Database Mocking**: In-memory SQLite for server tests
- **Component Mocking**: Jest mocks for external dependencies

### Test Data Standards
```javascript
// Use realistic but test-friendly data
const mockApodData = {
  date: '2024-01-01',
  title: 'Test Astronomy Picture',
  explanation: 'Test explanation',
  url: 'https://apod.nasa.gov/apod/image/test.jpg',
  media_type: 'image'
};
```

## Performance Testing

### Metrics to Track
- **Page Load Time**: < 3 seconds
- **API Response Time**: < 2 seconds
- **Component Render Time**: < 100ms
- **Memory Usage**: Monitor for leaks

### Performance Test Patterns
```javascript
it('should render within performance threshold', () => {
  const startTime = performance.now();

  render(<Component />);

  const endTime = performance.now();
  const renderTime = endTime - startTime;

  expect(renderTime).toBeLessThan(100);
});
```

## Error Handling Tests

### API Error Scenarios
- Network timeouts
- Rate limiting (429)
- Invalid API keys (403)
- Server errors (500)
- Malformed responses

### UI Error Scenarios
- Component render failures
- User input validation errors
- State management errors
- Memory exhaustion

## CI/CD Integration

### Test Commands
```bash
# Client-side tests
npm run test              # Run unit tests
npm run test:coverage     # Run tests with coverage
npm run test:ci          # Run tests in CI mode
npm run test:e2e         # Run E2E tests

# Server-side tests
cd server && npm test     # Run all tests
cd server && npm run test:coverage  # Run with coverage
```

### Quality Gates
- **Minimum Coverage**: 80%
- **All Tests Must Pass**: No failures allowed
- **Performance Thresholds**: Must meet defined metrics
- **Security Scans**: No high-severity vulnerabilities

## Testing Best Practices

### General Guidelines
1. **Test Behavior, Not Implementation**: Focus on what the user experiences
2. **Use Descriptive Test Names**: Tests should document themselves
3. **Independent Tests**: Each test should run in isolation
4. **Proper Setup/Teardown**: Clean up after each test
5. **Mock External Dependencies**: Tests should be deterministic

### System 7 Specific Guidelines
1. **Mock Sound Effects**: Prevent actual audio playback during tests
2. **Test Window Management**: Verify open/close/minimize functionality
3. **Validate System 7 Styling**: Ensure authentic retro appearance
4. **Test Keyboard Shortcuts**: Command+W, Alt+F4, etc.
5. **Verify Drag & Drop**: Window movement and resizing

### API Testing Guidelines
1. **Validate Request/Response**: Ensure correct data structure
2. **Test Error Cases**: Verify graceful failure handling
3. **Mock Rate Limiting**: Test client-side rate limiting
4. **Verify Caching**: Ensure appropriate caching behavior
5. **Security Testing**: Validate input sanitization and API key usage

## Test Environment Setup

### Local Development
```bash
# Install dependencies
npm install

# Start test database (server tests)
docker-compose up -d postgres-test

# Run tests in watch mode
npm run test:watch

# Open Cypress for E2E testing
npm run test:e2e:open
```

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run client tests
        run: npm run test:ci

      - name: Run server tests
        run: cd server && npm run test:ci

      - name: Run E2E tests
        run: npm run test:e2e
```

## Debugging Tests

### Common Issues and Solutions

#### Test Timeouts
```javascript
// Increase timeout for slow operations
it('should handle slow API responses', async () => {
  // Increase timeout for this specific test
  cy.clock();
  // Test implementation
}, { timeout: 10000 });
```

#### Mock Failures
```javascript
// Verify mocks are properly set up
beforeEach(() => {
  jest.clearAllMocks();
  // Set up fresh mocks for each test
});
```

#### State Leaks
```javascript
// Clean up state between tests
afterEach(() => {
  // Clear localStorage
  cy.clearLocalStorage();

  // Clear cookies
  cy.clearCookies();

  // Reset any global state
  window.localStorage.clear();
});
```

## Test Coverage Reports

### Coverage Configuration
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},
collectCoverageFrom: [
  'src/**/*.{js,jsx}',
  '!src/index.js',
  '!src/**/*.stories.js',
  '!src/**/*.test.js',
],
```

### Coverage Reports
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Format**: For integration with coverage services
- **Console Summary**: Displayed in CI/CD pipeline

## Future Enhancements

### Planned Improvements
1. **Visual Regression Testing**: Add Percy or Chromatic for UI testing
2. **Load Testing**: Implement Artillery for performance testing
3. **Security Testing**: Add OWASP ZAP integration
4. **Accessibility Testing**: Integrate axe-core for automated a11y testing
5. **Cross-Browser Testing**: Expand BrowserStack integration

### Test Metrics to Track
- **Test Execution Time**: Monitor test suite performance
- **Flaky Test Detection**: Identify and fix unstable tests
- **Coverage Trends**: Track coverage changes over time
- **Bug Detection Rate**: Measure effectiveness of test suite

## Contact and Support

### Testing Team
- **Testing Infrastructure Team**: Core testing framework and CI/CD
- **Frontend Testing Team**: React component and integration tests
- **Backend Testing Team**: API and server-side tests
- **E2E Testing Team**: End-to-end workflow testing

### Resources
- **Testing Documentation**: `/docs/testing`
- **Test Examples**: `/examples/tests`
- **Best Practices**: `/docs/testing-best-practices`
- **Troubleshooting Guide**: `/docs/test-troubleshooting`

---

This testing documentation ensures comprehensive quality assurance for the NASA System 7 Portal, maintaining the high standards expected for a NASA-branded application while providing authentic System 7 user experience.