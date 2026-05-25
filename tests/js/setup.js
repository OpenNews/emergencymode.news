/**
 * Jest setup file - runs before all tests
 */

// Mock console methods to reduce noise in tests (can be overridden per-test)
global.console = {
  ...console,
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock sessionStorage for geolocation tests
const sessionStorageMock = (() => {
  let store = {};

  return {
    getItem: key => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: key => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock localStorage similarly
Object.defineProperty(window, "localStorage", {
  value: sessionStorageMock,
});

// Clear mocks between tests
beforeEach(() => {
  sessionStorageMock.clear();
  jest.clearAllMocks();
});
