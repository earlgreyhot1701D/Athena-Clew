const { getOrCreateSession, isSessionValid, SESSION_KEY } = require('../public/session');

// Mock localStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: function (key) {
            return store[key] || null;
        },
        setItem: function (key, value) {
            store[key] = value.toString();
        },
        clear: function () {
            store = {};
        },
        removeItem: function (key) {
            delete store[key];
        }
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock Window and Firestore
global.window = {
    db: {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        set: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue(true),
        get: jest.fn()
    }
};

global.navigator = { userAgent: 'Jest-Test-Agent' };

describe('Session Logic', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    test('getOrCreateSession creates new ID if none exists', async () => {
        const sessionId = await getOrCreateSession();
        expect(sessionId).toBeDefined();
        expect(sessionId.length).toBeGreaterThan(10);
        expect(localStorage.getItem(SESSION_KEY)).toBe(sessionId);
        expect(window.db.collection).toHaveBeenCalledWith('sessions');
        expect(window.db.set).toHaveBeenCalled();
    });

    test('getOrCreateSession returns existing ID', async () => {
        const existingId = 'test-session-id-123';
        localStorage.setItem(SESSION_KEY, existingId);

        const sessionId = await getOrCreateSession();
        expect(sessionId).toBe(existingId);
        expect(window.db.update).toHaveBeenCalled();
    });

    test('isSessionValid checks Firestore', async () => {
        const sessionId = 'valid-id';
        window.db.get.mockResolvedValueOnce({ exists: true });

        const isValid = await isSessionValid(sessionId);
        expect(isValid).toBe(true);
        expect(window.db.doc).toHaveBeenCalledWith(sessionId);
    });

    test('isSessionValid returns false for invalid session', async () => {
        const sessionId = 'invalid-id';
        window.db.get.mockResolvedValueOnce({ exists: false });

        const isValid = await isSessionValid(sessionId);
        expect(isValid).toBe(false);
    });
});
