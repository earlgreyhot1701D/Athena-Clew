/**
 * tests/setup.js
 * Global mock environment setup for Jest tests.
 */

// Mock Firestore Database (window.db)
const dbMock = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ id: 'mock-doc-id', name: 'Mock Project' }),
        docs: []
    }),
    add: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
    set: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    onSnapshot: jest.fn()
};

global.window.db = dbMock;
global.db = dbMock; // Some files might access it globally without window

// Mock UI Helper (window.ui)
global.window.ui = {
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showStepProgress: jest.fn(),
    displayAnalysis: jest.fn(),
    displayPastFixes: jest.fn(),
    displayPrinciple: jest.fn(),
    displaySolutions: jest.fn(),
    showFeedbackButtons: jest.fn(),
    clearResults: jest.fn(),
    clearInput: jest.fn(),
    setButtonState: jest.fn()
};

// Mock Projects Helper (window.Projects)
global.window.Projects = {
    getCurrent: jest.fn().mockReturnValue('project-abc'),
    setCurrent: jest.fn(),
    getAllProjects: jest.fn().mockResolvedValue([
        { id: 'project-abc', name: 'Project ABC' }
    ])
};

// Mock FirestoreOps (window.FirestoreOps)
global.window.FirestoreOps = {
    searchPastFixes: jest.fn().mockResolvedValue([]),
    searchAcrossAllProjects: jest.fn().mockResolvedValue([]),
    storeFix: jest.fn().mockResolvedValue('fix-123'),
    storePrinciple: jest.fn().mockResolvedValue('principle-123'),
    queryPrinciples: jest.fn().mockResolvedValue([]),
    updateSuccessRate: jest.fn(),
    getAllFixesForProject: jest.fn().mockResolvedValue([]),
    getAllPrinciples: jest.fn().mockResolvedValue([])
};

// Mock Gemini (window.Gemini)
global.window.Gemini = {
    init: jest.fn(),
    analyzeError: jest.fn().mockResolvedValue({
        classification: 'logic',
        rootCause: 'Mock root cause',
        confidence: 0.9,
        thinkingTokens: 100 // Required by test
    }),
    extractPrinciple: jest.fn().mockResolvedValue({
        principle: 'Mock principle',
        category: 'logic'
    }),
    rankSolutionsBySemantic: jest.fn().mockImplementation((principles, error) => {
        // Simple logic to pass the test: 
        // If sorting test, return id:2 as first.
        // Or generic sort by successRate?
        // Let's implement basic sorting so logic tests happen "naturally"
        return Promise.resolve([...principles].sort((a, b) => {
            // Mock sorting logic matching test: syntax (id 2) > logic (id 1)
            if (a.category === error.classification) return -1;
            if (b.category === error.classification) return 1;
            return 0;
        }));
    })
};

// Mock Vertex AI Model (window.GeminiModel)
global.window.GeminiModel = {
    generateContent: jest.fn().mockResolvedValue({
        response: {
            text: () => JSON.stringify({
                classification: 'logic',
                rootCause: 'Mock root cause from AI',
                patterns: [],
                confidence: 0.95
            })
        }
    })
};

// Mock Global Functions (from session.js)
global.getOrCreateSession = jest.fn().mockResolvedValue('mock-session-id');

// Mock Firebase Global (needed for some indirect calls)
global.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: jest.fn()
        }
    }
};

// Mock LocalStorage
const localStorageMock = {
    getItem: jest.fn().mockReturnValue('mock-session-id'),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn()
};
global.localStorage = localStorageMock;

// Mock Console (to keep test output clean, optional)
// global.console = { ...console, log: jest.fn(), warn: jest.fn(), error: jest.fn() };

// Mock Refactored Modules
global.window.ErrorClassifier = {
    classify: jest.fn().mockReturnValue('logic')
};
global.ErrorClassifier = global.window.ErrorClassifier;

global.window.AnalyticsView = {
    render: jest.fn().mockResolvedValue()
};
global.AnalyticsView = global.window.AnalyticsView;

global.window.PersonalInsights = {
    analyzeUserPatterns: jest.fn().mockResolvedValue([]),
    detectSimilarError: jest.fn().mockResolvedValue(null)
};
global.PersonalInsights = global.window.PersonalInsights;

global.window.Logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    scrub: jest.fn(val => val)
};
global.Logger = global.window.Logger;

global.window.ErrorHandler = {
    handle: jest.fn(),
    asyncWrapper: (fn) => fn
};
global.ErrorHandler = global.window.ErrorHandler;
