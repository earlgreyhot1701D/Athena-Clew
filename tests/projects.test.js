const { Projects } = require('../public/projects');

// Mock Data
const mockSessionId = 'session-123';
const mockProjectId = 'project-abc';
const mockTimestamp = { seconds: 1234567890, nanoseconds: 0 };

// Mock Firestore Structure
const mockDocRef = {
    id: mockProjectId,
    set: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    get: jest.fn(),
    collection: jest.fn().mockReturnThis()
};

const mockCollectionRef = {
    doc: jest.fn().mockReturnValue(mockDocRef),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn(), // Will be mocked per test
    add: jest.fn()
};

// Global Mocks
global.db = {
    collection: jest.fn().mockReturnValue(mockCollectionRef),
    doc: jest.fn().mockReturnValue(mockDocRef)
};

global.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => mockTimestamp
        }
    }
};

describe('Projects Management', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default doc().collection() behavior
        mockDocRef.collection.mockReturnValue(mockCollectionRef);
    });

    test('create() performs validation', async () => {
        await expect(Projects.create(mockSessionId, '')).rejects.toThrow('required');
        await expect(Projects.create(mockSessionId, 'a'.repeat(101))).rejects.toThrow('too long');
    });

    test('initialize() creates default project if none exist', async () => {
        // Mock empty projects list
        mockCollectionRef.get.mockResolvedValueOnce({ empty: true, docs: [] });

        // Spy on Create/SetCurrent to verify logical flow
        const createSpy = jest.spyOn(Projects, 'create');
        const setCurrentSpy = jest.spyOn(Projects, 'setCurrent');

        // Execute
        await Projects.initialize(mockSessionId);

        // Verification
        expect(createSpy).toHaveBeenCalledWith(mockSessionId, 'Default Project', expect.any(Object));
        expect(setCurrentSpy).toHaveBeenCalledWith(mockSessionId, expect.any(String));

        // Deep verification of Firestore calls
        // 1. Check for Project Existence
        expect(global.db.collection).toHaveBeenCalledWith('sessions');

        // 2. Create Project (set called on new doc)
        // Note: Projects.create calls db.collection(...).doc().set(...)
        // In our mock, doc() returns mockDocRef, so we check mockDocRef.set
        expect(mockDocRef.set).toHaveBeenCalled();
    });

    test('initialize() loads existing current project', async () => {
        // Mock Projects List (not empty, but logic checks session doc first)
        mockCollectionRef.get.mockResolvedValueOnce({ empty: false });

        // Mock Session Doc having currentProjectId
        mockDocRef.get.mockResolvedValueOnce({
            data: () => ({ currentProjectId: 'existing-id' })
        });

        const projectId = await Projects.initialize(mockSessionId);

        expect(projectId).toBe('existing-id');
        expect(Projects.getCurrent()).toBe('existing-id');
    });
});
