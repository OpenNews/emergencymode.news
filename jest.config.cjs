/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/tests/js/**/*.test.js"],
  
  // Coverage tracking: Tests use extracted logic modules that mirror production code
  // The WordPress plugin file runs in browser context and can't be directly imported,
  // so we extract testable logic to tests/js/lib/ and track coverage there.
  collectCoverageFrom: [
    "tests/js/lib/**/*.js",
    "!tests/js/setup.js",
    "!**/node_modules/**",
    "!**/vendor/**",
  ],
  
  coverageDirectory: "coverage/js",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
    },
  },
  
  setupFilesAfterEnv: ["<rootDir>/tests/js/setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "/.venv/", "/vendor/"],
  modulePathIgnorePatterns: ["/.venv/", "/vendor/"],
  verbose: true,
};
