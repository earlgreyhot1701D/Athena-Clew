module.exports = {
    // Use jsdom for browser-like environment
    testEnvironment: 'jsdom',

    // Find all test files in tests/ directory
    testMatch: ['**/tests/**/*.test.js'],

    // Don't collect coverage for now (speeds up tests)
    collectCoverage: false,

    // Coverage settings (for future)
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    // Setup file runs before each test file
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Mock CSS imports (if any)
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },

    // Ignore these directories
    testPathIgnorePatterns: ['/node_modules/', '/public/'],

    // Verbose output for debugging
    verbose: true
};
