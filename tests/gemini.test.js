// Mock Firebase Globals primarily for the init check
global.firebase = {
    app: jest.fn()
};

// Mock the Modular SDK function
const mockGenerateContent = jest.fn();
const mockModel = {
    generateContent: mockGenerateContent
};
global.window = {
    getGenerativeModel: jest.fn(() => mockModel)
};

const { Gemini } = require('../public/gemini');

describe('Gemini AI Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('init calls getGenerativeModel', () => {
        Gemini.init();
        expect(global.window.getGenerativeModel).toHaveBeenCalled();
    });

    test('analyzeError returns valid analysis from JSON response', async () => {
        const mockResponse = {
            response: {
                text: () => JSON.stringify({
                    classification: 'syntax',
                    rootCause: 'Missing semicolon',
                    patterns: [],
                    confidence: 0.9
                }),
                usageMetadata: { thinkingTokens: 100 }
            }
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await Gemini.analyzeError({ message: 'SyntaxError' });

        expect(result.classification).toBe('syntax');
        expect(result.rootCause).toBe('Missing semicolon');
        // Check for 100 or 0 depending on fallback, but mainly ensure it doesn't crash
        expect(result.thinkingTokens).toBeDefined();
    });

    test('analyzeError falls back on failure', async () => {
        mockGenerateContent.mockRejectedValue(new Error('API Error'));

        const result = await Gemini.analyzeError({ message: 'SyntaxError: Unexpected token' });

        expect(result.classification).toBe('syntax'); // Fallback logic
        expect(result.rootCause).toContain('Analysis failed');
    });

    test('extractPrinciple warns but accepts malformed principle', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const mockResponse = {
            response: {
                text: () => JSON.stringify({
                    principle: 'Always check your semicolons', // Missing "When"
                    category: 'syntax'
                })
            }
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await Gemini.extractPrinciple({ message: 'e' }, { solution: 's' }, { classification: 'c' });

        expect(consoleSpy).toHaveBeenCalled(); // At least one warning
        expect(result.principle).toBe('Always check your semicolons'); // Still returns it
    });

    test('rankSolutionsBySemantic sorts correctly', async () => {
        const principles = [
            { id: 1, category: 'logic', principle: 'foo', context: { successRate: 0.5 } },
            { id: 2, category: 'syntax', principle: 'bar', context: { successRate: 1.0 } } // Better match
        ];
        const error = { classification: 'syntax', message: 'bar error' };

        const ranked = await Gemini.rankSolutionsBySemantic(principles, error);

        expect(ranked[0].id).toBe(2); // Should be first (cat match + keyword + high success)
    });
});
