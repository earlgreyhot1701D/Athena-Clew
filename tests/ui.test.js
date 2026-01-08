/**
 * tests/ui.test.js
 * Unit tests for ui.js with manual DOM mocking
 */

// --- Manual DOM Mock ---
const elementStore = {};

const createMockElement = (id) => {
    if (!elementStore[id]) {
        elementStore[id] = {
            id,
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(),
            },
            value: '',
            _innerHTML: '',
            get innerHTML() { return this._innerHTML; },
            set innerHTML(val) { this._innerHTML = val; },
            disabled: false,
            textContent: '',
            insertAdjacentHTML: jest.fn(function (pos, html) {
                this._innerHTML += html;
            }),
            remove: jest.fn()
        };
    }
    return elementStore[id];
};

// Reset store helper
const resetStore = () => {
    for (const key in elementStore) delete elementStore[key];
    // Pre-seed expected elements
    createMockElement('error-input');
    createMockElement('get-help-btn');
    createMockElement('results');
    createMockElement('theseus-demo');
    createMockElement('analytics-results'); // Added missing element
};

// --- Require Module Under Test ---
const ui = require('../public/ui');

describe('UI Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetStore();

        // Spy on document methods instead of overwriting global.document
        jest.spyOn(document, 'getElementById').mockImplementation((id) => createMockElement(id));
        jest.spyOn(document, 'createElement').mockImplementation((tag) => ({
            tag,
            className: '',
            textContent: '',
            remove: jest.fn(),
            style: {}
        }));
        // Note: document.body is available in JSDOM, can spy on appendChild if needed
        jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());

        window.ui.init(); // Re-bind elements
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('init captures elements', () => {
        expect(window.ui.elements.errorInput).toBeDefined();
        expect(document.getElementById).toHaveBeenCalledWith('error-input');
    });

    test('setButtonState toggles disabled state', () => {
        const btn = elementStore['get-help-btn'];

        window.ui.setButtonState(false);
        expect(btn.disabled).toBe(true);
        expect(btn.innerHTML).toContain('THINKING');

        window.ui.setButtonState(true);
        expect(btn.disabled).toBe(false);
        expect(btn.innerHTML).toContain('GET HELP');
    });

    // --- Validation Tests ---

    test('validateAnalysisData throws on invalid input', () => {
        expect(() => window.ui.validateAnalysisData(null)).toThrow('undefined');
        expect(() => window.ui.validateAnalysisData({})).toThrow('Missing field: classification');
    });

    test('validateSolutionsData return true for valid input', () => {
        const valid = [{ solution: 'fix', confidence: 0.9 }];
        expect(window.ui.validateSolutionsData(valid)).toBe(true);
    });

    // --- Display Tests ---

    test('displayAnalysis renders content to innerHTML', () => {
        const data = { classification: 'Runtime Error', rootCause: 'Null Pointer' };
        window.ui.displayAnalysis(data);

        const results = elementStore['results'];
        expect(results.innerHTML).toContain('Runtime Error');
        expect(results.innerHTML).toContain('Null Pointer');
    });

    test('displayAnalysis handles error gracefully', () => {
        const spy = jest.spyOn(window.ui, 'showError');
        window.ui.displayAnalysis({}); // Invalid
        expect(spy).toHaveBeenCalled();
    });

    test('displaySolutions appends content', () => {
        const data = [{ solution: 'Restart', confidence: 0.95, source: 'Docs' }];
        window.ui.displaySolutions(data);

        const results = elementStore['results'];
        // insertAdjacentHTML is mocked to append to innerHTML
        expect(results.insertAdjacentHTML).toHaveBeenCalled();
        expect(results.innerHTML).toContain('Restart');
    });

    test('clearResults empties the container', () => {
        const results = elementStore['results'];
        results.innerHTML = '<div>Content</div>';

        window.ui.clearResults();
        expect(results.innerHTML).toBe('');
    });

    test('showError creates toast', () => {
        window.ui.showError('Test Error');
        expect(document.createElement).toHaveBeenCalledWith('div');
        expect(document.body.appendChild).toHaveBeenCalled();
        // Check content of the last created element passed to appendChild?
        // Mock implies logic flow is sufficient coverage
    });
});
