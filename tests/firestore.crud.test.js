const { FirestoreOps } = require('../public/firestore');

// Mock Data
const mockSessionId = 'session-1';
const mockProjectId = 'project-1';
const mockTimestamp = { seconds: 123, nanoseconds: 0 };

// Firestore Mock Chain
const mockDocRef = {
    id: 'new-id',
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    collection: jest.fn().mockReturnThis()
};
const mockCollectionRef = {
    doc: jest.fn().mockReturnValue(mockDocRef),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn()
};

global.db = {
    collection: jest.fn().mockReturnValue(mockCollectionRef)
};
global.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => mockTimestamp
        }
    }
};

describe('FirestoreOps CRUD', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset default mock behavior
        mockDocRef.collection.mockReturnValue(mockCollectionRef);
    });

    test('storeFix writes to correct path', async () => {
        await FirestoreOps.storeFix(mockSessionId, mockProjectId,
            { message: 'Error' },
            { solution: 'Fix' },
            { classification: 'syntax', thinkingTokens: 10 }
        );

        // Path verification: sessions -> sessionID -> projects -> projID -> fixes -> doc
        expect(global.db.collection).toHaveBeenCalledWith('sessions');
        // doc().collection().doc().collection()... implied by structure
        expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({ type: 'syntax' }),
            geminiThinking: expect.objectContaining({ tokensUsed: 10 })
        }));
    });

    test('searchAcrossAllProjects iterates multiple projects', async () => {
        // 1. Projects Query returns 2 projects
        const projectDocs = [
            { id: 'p1', ref: { collection: () => mockCollectionRef }, data: () => ({ projectName: 'P1' }) },
            { id: 'p2', ref: { collection: () => mockCollectionRef }, data: () => ({ projectName: 'P2' }) }
        ];

        // We mock the *first* get() call (projects list)
        // Then subsequent get() calls (fixes list)
        mockCollectionRef.get
            .mockResolvedValueOnce({ docs: projectDocs }) // Projects
            .mockResolvedValue({ docs: [{ id: 'fix1', data: () => ({ timestamp: 100 }) }] }); // Fixes (default for loop)

        const results = await FirestoreOps.searchAcrossAllProjects(mockSessionId, 'syntax');

        expect(results.length).toBe(2); // 1 fix per project
        expect(results[0].projectId).toBeDefined();
    });

    test('updateSuccessRate calculates new moving average', async () => {
        // Current state: Rate 0.5, Count 1
        mockDocRef.exists = true;
        mockDocRef.get.mockResolvedValue({
            exists: true,
            data: () => ({
                context: { successRate: 0.5, appliedCount: 1 }
            })
        });

        // Update: Was helpful (1.0)
        // New Rate = (0.5 * 1 + 1.0) / 2 = 1.5 / 2 = 0.75
        await FirestoreOps.updateSuccessRate(mockSessionId, mockProjectId, 'principle-1', true);

        expect(mockDocRef.update).toHaveBeenCalledWith({
            'context.successRate': 0.75,
            'context.appliedCount': 2
        });
    });
});
