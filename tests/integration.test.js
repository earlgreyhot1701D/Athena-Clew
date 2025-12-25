/**
 * @jest-environment jsdom
 */

// Setup Environment
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true // Ensure it can be modified if needed
});
global.localStorage = mockLocalStorage; // For good measure if code uses global directly

// Define Mocks before requiring App
const mockGemini = {
    analyzeError: jest.fn(),
    extractPrinciple: jest.fn(),
    rankSolutionsBySemantic: jest.fn(),
    init: jest.fn()
};

const mockFirestoreOps = {
    searchPastFixes: jest.fn(),
    storeFix: jest.fn(),
    storePrinciple: jest.fn(),
    queryPrinciples: jest.fn(),
    searchAcrossAllProjects: jest.fn(),
    updateSuccessRate: jest.fn()
};

const mockProjects = {
    getCurrent: jest.fn(),
    init: jest.fn(),
    create: jest.fn()
};

const mockUI = {
    showStepProgress: jest.fn(),
    displayAnalysis: jest.fn(),
    displayPastFixes: jest.fn(),
    displayPrinciple: jest.fn(),
    displaySolutions: jest.fn(),
    showFeedbackButtons: jest.fn(),
    clearResults: jest.fn(),
    setButtonState: jest.fn(),
    showError: jest.fn(),
    showSuccess: jest.fn(),
    clearInput: jest.fn(),
    elements: { results: {} } // Mock elements if accessed directly
};

// Attach to window AND global for scope resolution
window.Gemini = mockGemini;
global.Gemini = mockGemini;

window.FirestoreOps = mockFirestoreOps;
global.FirestoreOps = mockFirestoreOps;

window.Projects = mockProjects;
global.Projects = mockProjects;

window.ProjectUI = { init: jest.fn() };
global.ProjectUI = window.ProjectUI;

window.ui = mockUI;
global.ui = mockUI; // app.js might use 'ui' variable directly
global.UI = mockUI; // compat

// Now import App (it will attach itself to window.app)
const { App } = require('../public/app');

describe('End-to-End Theseus Pipeline', () => {
    let sessionId = 'test-session-123';
    let projectId = 'project-abc';

    beforeAll(() => {
        // App.init logic check
        App.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        global.localStorage.getItem.mockReturnValue(sessionId);
        mockProjects.getCurrent.mockReturnValue(projectId);

        // Mock DOM
        document.body.innerHTML = `
            <input id="error-input" value="TypeError: test" />
            <div id="step-progress"></div>
        `;
        document.getElementById = jest.fn((id) => {
            if (id === 'error-input') return { value: 'TypeError: test' };
            return document.createElement('div');
        });
    });

    test('Complete pipeline: Error -> Analysis -> Principle stored', async () => {
        const testError = { message: 'TypeError: test', stack: '' };

        // 1. Analyze
        mockGemini.analyzeError.mockResolvedValue({
            classification: 'logic',
            rootCause: 'Root',
            confidence: 0.9,
            thinkingTokens: 10
        });

        // 2. Search (Cold Start)
        mockFirestoreOps.searchPastFixes.mockResolvedValue([]);

        // 4. Query Principles (Cold Start)
        mockFirestoreOps.queryPrinciples.mockResolvedValue([]);

        // Run
        await App.handleSubmit();

        // Assert Step 1 & 2
        expect(mockGemini.analyzeError).toHaveBeenCalled();
        expect(mockFirestoreOps.searchPastFixes).toHaveBeenCalledWith(sessionId, projectId, 'logic');

        // Assert UI Cold Start message was logged/handled (implied by execution continuing)
        expect(mockUI.displayPastFixes).toHaveBeenCalledWith([]);

        // Step 3 should remain uncalled
        expect(mockGemini.extractPrinciple).not.toHaveBeenCalled();

        // Step 5 ready
        expect(mockUI.showFeedbackButtons).toHaveBeenCalled();

        // Feedback
        App.currentFix = {
            error: testError,
            fix: null, // Cold start = no fix
            analysis: { classification: 'logic' },
            principle: null
        };
        mockFirestoreOps.storeFix.mockResolvedValue('fix-id');

        await App.handleHelpfulFeedback();

        expect(mockFirestoreOps.storeFix).toHaveBeenCalled();
    });

    test('Warm Start: Uses learned principle', async () => {
        const testError = { message: 'TypeError: known', stack: '' };
        document.getElementById = jest.fn().mockReturnValue({ value: 'TypeError: known' });

        // 1. Analyze
        mockGemini.analyzeError.mockResolvedValue({ classification: 'logic', rootCause: 'Known' });

        // 2. Search (Warm)
        mockFirestoreOps.searchPastFixes.mockResolvedValue([{ fix: { solution: 'Sol' }, successRate: 1.0 }]);

        // 3. Extract
        mockGemini.extractPrinciple.mockResolvedValue({ principle: 'P', category: 'logic' });

        // 4. Query
        mockFirestoreOps.queryPrinciples.mockResolvedValue([{ principle: 'Stored P', context: { successRate: 1.0 } }]);
        mockGemini.rankSolutionsBySemantic.mockResolvedValue([{ principle: 'Stored P', relevanceScore: 0.9 }]);

        await App.handleSubmit();

        expect(mockGemini.extractPrinciple).toHaveBeenCalled();
        expect(mockUI.displaySolutions).toHaveBeenCalled();
    });
});
