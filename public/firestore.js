/**
 * firestore.js
 * Database CRUD operations for fixes and principles.
 */

const FirestoreOps = {
    /**
     * Step 2: Search past fixes in current project
     * @param {string} sessionId 
     * @param {string} projectId 
     * @param {string} errorClassification 
     * @returns {Promise<Array>} Past fixes matching classification
     */
    async searchPastFixes(sessionId, projectId, errorClassification) {
        try {
            const fixesRef = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(projectId)
                .collection('fixes')
                .where('error.type', '==', errorClassification)
                .orderBy('timestamp', 'desc')
                .limit(5);

            const snapshot = await fixesRef.get();

            const fixes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                successRate: doc.data().userFeedback?.helpful ? 1.0 : 0.5 // Default/Calculated
            }));

            console.log(`✅ Found ${fixes.length} past fixes for ${errorClassification} in project`);
            return fixes;

        } catch (error) {
            console.error('Search past fixes failed:', error);
            return [];
        }
    },

    /**
     * Step 2 BONUS: Search across all projects in CURRENT session
     * @param {string} sessionId 
     * @param {string} errorClassification 
     * @returns {Promise<Array>} Fixes from all projects
     */
    async searchAcrossAllProjects(sessionId, errorClassification) {
        try {
            // Scoped to session for security
            const projectsSnapshot = await db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .get();

            const allFixes = [];

            // Parallel queries could be optimized, but sequential is safe for rate limits
            for (const projectDoc of projectsSnapshot.docs) {
                const fixesSnapshot = await projectDoc.ref
                    .collection('fixes')
                    .where('error.type', '==', errorClassification)
                    .orderBy('timestamp', 'desc')
                    .limit(3)
                    .get();

                fixesSnapshot.docs.forEach(fixDoc => {
                    allFixes.push({
                        id: fixDoc.id,
                        projectId: projectDoc.id,
                        projectName: projectDoc.data().projectName,
                        ...fixDoc.data()
                    });
                });
            }

            // Sort combined results
            return allFixes.sort((a, b) => b.timestamp - a.timestamp);

        } catch (error) {
            console.error('Cross-project search failed:', error);
            return [];
        }
    },

    /**
     * Step 5 (partial): Store debugging fix
     * @param {string} sessionId 
     * @param {string} projectId 
     * @param {object} errorData 
     * @param {object} fixData 
     * @param {object} analysis 
     * @returns {Promise<string>} fixId
     */
    async storeFix(sessionId, projectId, errorData, fixData, analysis) {
        try {
            const fixRef = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(projectId)
                .collection('fixes')
                .doc();

            await fixRef.set({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                error: {
                    message: errorData.message,
                    stack: errorData.stack || '',
                    type: analysis.classification
                },
                fix: {
                    solution: fixData.solution,
                    explanation: fixData.explanation || '',
                    codeSnippet: fixData.codeSnippet || ''
                },
                geminiThinking: {
                    tokensUsed: analysis.thinkingTokens,
                    responseTime: analysis.responseTime
                },
                userFeedback: null,
                linkedPrinciples: []
            });

            console.log(`✅ Fix stored: ${fixRef.id}`);
            return fixRef.id;

        } catch (error) {
            console.error('Store fix failed:', error);
            throw error;
        }
    },

    /**
     * Step 5: Store learned principle
     * @param {string} sessionId 
     * @param {string} projectId 
     * @param {object} principleData 
     * @param {string} linkedFixId 
     * @returns {Promise<string>} principleId
     */
    async storePrinciple(sessionId, projectId, principleData, linkedFixId) {
        try {
            const principleRef = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(projectId)
                .collection('principles')
                .doc();

            await principleRef.set({
                principle: principleData.principle,
                category: principleData.category,
                context: {
                    errorPatterns: [principleData.reasoning || ''],
                    successRate: 1.0, // Start high as it came from a successful fix
                    appliedCount: 1
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                linkedFixes: [linkedFixId]
            });

            console.log(`✅ Principle stored: ${principleRef.id}`);
            return principleRef.id;

        } catch (error) {
            console.error('Store principle failed:', error);
            throw error;
        }
    },

    /**
     * Step 4: Query principles for ranking
     * @param {string} sessionId 
     * @param {string} projectId 
     * @param {string} category 
     * @param {number} limit 
     * @returns {Promise<Array>} Principles sorted by success rate
     */
    async queryPrinciples(sessionId, projectId, category, limit = 5) {
        try {
            const principlesRef = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(projectId)
                .collection('principles')
                .where('category', '==', category)
                .orderBy('context.successRate', 'desc')
                .limit(limit);

            const snapshot = await principlesRef.get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        } catch (error) {
            console.error('Query principles failed:', error);
            return [];
        }
    },

    /**
     * Feedback loop: Update principle success rate
     * @param {string} sessionId 
     * @param {string} projectId 
     * @param {string} principleId 
     * @param {boolean} wasHelpful 
     */
    async updateSuccessRate(sessionId, projectId, principleId, wasHelpful) {
        try {
            const principleRef = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(projectId)
                .collection('principles')
                .doc(principleId);

            // Transaction would be safer in high concurrency, but get/update ok for single user session
            const doc = await principleRef.get();
            if (!doc.exists) return;

            const data = doc.data();

            const currentRate = data.context.successRate;
            const currentCount = data.context.appliedCount;

            const newRate = (currentRate * currentCount + (wasHelpful ? 1 : 0)) / (currentCount + 1);
            const newCount = currentCount + 1;

            await principleRef.update({
                'context.successRate': newRate,
                'context.appliedCount': newCount
            });

            console.log(`✅ Updated principle ${principleId}: ${newRate.toFixed(2)} (${newCount} uses)`);

        } catch (error) {
            console.error('Update success rate failed:', error);
        }
    },

    /**
     * Get all fixes for a project (for History View)
     */
    async getAllFixesForProject(sessionId, projectId) {
        try {
            const query = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(projectId)
                .collection('fixes')
                .orderBy('timestamp', 'desc')
                .limit(50);

            const snapshot = await query.get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        } catch (error) {
            console.error('Failed to get all fixes:', error);
            return [];
        }
    }
};

// Export
if (typeof window !== 'undefined') window.FirestoreOps = FirestoreOps;
if (typeof module !== 'undefined') module.exports = { FirestoreOps };
