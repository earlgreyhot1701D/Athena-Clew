/**
 * Jest Global Setup
 * Runs before each test file
 */

// Suppress console noise in tests
global.console = {
    ...console,
    // Keep log for debugging
    log: console.log,
    // Suppress expected errors/warnings during tests
    error: jest.fn(),
    warn: jest.fn(),
    info: console.info,
    debug: console.debug
};

// Mock localStorage if not available
if (typeof localStorage === 'undefined') {
    global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    };
}

// Add any global test utilities here
global.testUtils = {
    // Helper to wait for async operations
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // Helper to create mock session
    mockSession: () => ({
        sessionId: 'test-session-' + Date.now(),
        projectId: 'test-project-' + Date.now()
    })
};
