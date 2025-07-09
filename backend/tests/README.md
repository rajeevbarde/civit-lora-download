# Backend Unit Tests

This directory contains comprehensive unit tests for the CivitAI Lora Download Manager backend application.

## Test Structure

### Test Files

- **`smoke.test.js`** - Smoke tests that verify basic functionality and health of the application
- **`sanity.test.js`** - Sanity tests that verify core business logic and API endpoints
- **`integration.test.js`** - Integration tests that verify component interactions
- **`utils.test.js`** - Utility tests for helper functions and utility modules
- **`setup.js`** - Test setup and configuration
- **`.env.test`** - Test environment configuration

### Test Categories

#### Smoke Tests
- Application startup and configuration
- Environment variable validation
- Service initialization
- Basic API health checks
- Database connectivity
- File system operations
- Error handling basics

#### Sanity Tests
- API endpoint functionality
- Database service operations
- File service operations
- Path service operations
- Download service operations
- Configuration validation
- Middleware functionality
- Data validation
- Performance basics

#### Integration Tests
- Database and file service integration
- Path service and file service integration
- Download service and database integration
- API and service integration
- Error handling across components
- Performance under load
- Configuration integration
- Logging integration

#### Utility Tests
- Logger functionality
- Configuration constants
- Database configuration
- Middleware utilities
- File system utilities
- URL validation
- Data validation
- Environment variable validation
- Error handling utilities
- Performance utilities

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Ensure test environment is configured (`.env.test` file)

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only smoke and sanity tests
npm run test:smoke
```

### Test Configuration

The tests use the following configuration:

- **Test Environment**: `NODE_ENV=test`
- **Database**: In-memory SQLite (`:memory:`)
- **Port**: 3001 (configurable)
- **Timeout**: 30 seconds
- **Coverage**: Enabled with Jest

### Test Utilities

The test setup provides global utilities:

```javascript
// Create mock request objects
const req = testUtils.createMockRequest('GET', '/api/test');

// Create mock response objects
const res = testUtils.createMockResponse();

// Create mock next function
const next = testUtils.createMockNext();

// Wait for async operations
await testUtils.wait(1000);
```

## Test Coverage

The tests cover:

- ✅ Application startup and configuration
- ✅ API endpoints and routes
- ✅ Database operations
- ✅ File system operations
- ✅ Download functionality
- ✅ Path management
- ✅ Error handling
- ✅ Validation logic
- ✅ Performance considerations
- ✅ Integration scenarios

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data and files after tests
3. **Mocking**: Use mocks for external dependencies when appropriate
4. **Async Handling**: Properly handle async operations with await
5. **Error Testing**: Test both success and error scenarios
6. **Performance**: Include performance tests for critical paths

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Ensure test database path is accessible
2. **Port Conflicts**: Change test port in `.env.test` if needed
3. **Timeout Errors**: Increase timeout in test configuration
4. **File System Errors**: Ensure test directories are writable

### Debug Mode

To run tests in debug mode:

```bash
# Run specific test file with verbose output
npm test -- --verbose smoke.test.js

# Run tests with console output
NODE_ENV=test DEBUG=* npm test
```

## Adding New Tests

When adding new tests:

1. Follow the existing naming convention
2. Use appropriate test categories
3. Include both positive and negative test cases
4. Add proper cleanup in `afterEach` or `afterAll`
5. Update this README if adding new test categories

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- Fast execution (under 30 seconds)
- Minimal external dependencies
- Clear pass/fail criteria
- Comprehensive coverage reporting 