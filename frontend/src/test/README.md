# Frontend Tests

This directory contains tests for the Vue.js frontend application.

## Test Structure

- **smoke.test.js** - Basic smoke tests to verify the app can mount and render
- **sanity.test.js** - Sanity tests to verify basic routing and navigation functionality
- **router.test.js** - Tests for router configuration and navigation
- **components/** - Component-specific tests
  - **LoadingSpinner.test.js** - Tests for the LoadingSpinner component

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Configuration

The tests use:
- **Vitest** - Test runner
- **@vue/test-utils** - Vue component testing utilities
- **jsdom** - DOM environment for testing
- **@vitest/ui** - Test UI for better debugging

## Test Philosophy

Since the refactoring and design are not finalized, these tests focus on:

1. **Smoke Tests** - Verify the app can mount and basic structure is present
2. **Sanity Tests** - Verify basic functionality works (routing, navigation)
3. **Component Tests** - Test individual components in isolation
4. **Router Tests** - Verify routing configuration is correct

The tests are designed to be:
- **Resilient to refactoring** - Focus on behavior rather than implementation details
- **Fast to run** - Quick feedback during development
- **Easy to maintain** - Clear and simple test cases

## Adding New Tests

When adding new tests:

1. **Component Tests** - Place in `components/` directory
2. **Integration Tests** - Place in root test directory
3. **Utility Tests** - Place in root test directory

### Example Component Test
```javascript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MyComponent from '@/components/MyComponent.vue';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const wrapper = mount(MyComponent);
    expect(wrapper.exists()).toBe(true);
  });
});
```

## Test Coverage

The tests aim to cover:
- ✅ App mounting and basic structure
- ✅ Navigation and routing
- ✅ Component rendering
- ✅ Basic user interactions
- ✅ Error boundaries and notifications

Areas that may need more coverage as the app stabilizes:
- API integration
- Complex user workflows
- Error handling scenarios
- Performance testing
- E2E testing

## Notes

- Tests use minimal mocks to avoid over-engineering
- Focus on testing behavior rather than implementation
- Tests should remain stable during refactoring
- Use descriptive test names that explain the expected behavior 