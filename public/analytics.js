/**
 * analytics.js
 * Aggregates and processes debugging data for analytics display
 * NO API CALLS - pure Firestore queries
 */

const Analytics = {
    /**
     * Get aggregate statistics across all projects
     * @param {string} sessionId
     * @returns {Promise<object>} Aggregate stats
     */
    async aggregateStats(sessionId) {
        try {
            // Get all projects
            const allProjects = await window.Projects.getAllProjects(sessionId);

            if (!allProjects || allProjects.length === 0) {
                return null; // No data yet
            }

            // Gather all fixes across all projects
            let allFixes = [];
            let allPrinciples = [];

            for (const project of allProjects) {
                const fixes = await window.FirestoreOps.getAllFixesForProject(sessionId, project.id);
                // Get ALL principles (category=null, high limit)
                const principles = await window.FirestoreOps.queryPrinciples(sessionId, project.id, null, 999);

                allFixes = allFixes.concat(fixes);
                allPrinciples = allPrinciples.concat(principles);
            }

            if (allFixes.length === 0) {
                return null;
            }

            // Calculate success rate
            // Count as success if explicitly marked helpful OR if it has a solution and wasn't marked unhelpful
            const helpfulFixes = allFixes.filter(f =>
                f.userFeedback?.helpful === true ||
                (f.userFeedback?.helpful !== false && f.fix?.solution)
            );

            const successRate = allFixes.length > 0
                ? Math.round((helpfulFixes.length / allFixes.length) * 100)
                : 0;

            // Count UNIQUE principles by text
            const uniquePrinciples = new Set(allPrinciples.map(p => p.principle)).size;

            return {
                totalSessions: allFixes.length,
                totalPrinciples: uniquePrinciples, // Was allPrinciples.length
                successRate: successRate,
                totalProjects: allProjects.length
            };

        } catch (error) {
            console.error('Error aggregating stats:', error);
            return null;
        }
    },

    /**
     * Get error type breakdown with percentages
     * @param {string} sessionId
     * @returns {Promise<Array>} Error types with counts and percentages
     */
    async getErrorBreakdown(sessionId) {
        try {
            const allProjects = await window.Projects.getAllProjects(sessionId);

            if (!allProjects || allProjects.length === 0) {
                return [];
            }

            // Gather all fixes
            let allFixes = [];
            for (const project of allProjects) {
                const fixes = await window.FirestoreOps.getAllFixesForProject(sessionId, project.id);
                allFixes = allFixes.concat(fixes);
            }

            if (allFixes.length === 0) {
                return [];
            }

            // Count by type
            const typeCounts = {};
            allFixes.forEach(fix => {
                const type = fix.error?.type || 'unknown';
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });

            // Convert to array with percentages
            const total = allFixes.length;
            const breakdown = Object.keys(typeCounts).map(type => ({
                type,
                count: typeCounts[type],
                percentage: Math.round((typeCounts[type] / total) * 100)
            }));

            // Sort by count descending
            breakdown.sort((a, b) => b.count - a.count);

            return breakdown;

        } catch (error) {
            console.error('Error getting breakdown:', error);
            return [];
        }
    },

    /**
     * Get cross-project statistics
     * @param {string} sessionId
     * @returns {Promise<Array>} Per-project stats
     */
    async getCrossProjectStats(sessionId) {
        try {
            const allProjects = await window.Projects.getAllProjects(sessionId);

            if (!allProjects || allProjects.length === 0) {
                return [];
            }

            const projectStats = [];

            for (const project of allProjects) {
                const fixes = await window.FirestoreOps.getAllFixesForProject(sessionId, project.id);

                if (fixes.length > 0) {
                    // Count error types for this project
                    const typeCounts = {};
                    fixes.forEach(fix => {
                        const type = fix.error?.type || 'unknown';
                        typeCounts[type] = (typeCounts[type] || 0) + 1;
                    });

                    // Find most common type
                    const sortedTypes = Object.entries(typeCounts)
                        .sort((a, b) => b[1] - a[1]);
                    const topType = sortedTypes[0] ? sortedTypes[0][0] : 'unknown';
                    const topTypePercentage = sortedTypes[0]
                        ? Math.round((sortedTypes[0][1] / fixes.length) * 100)
                        : 0;

                    projectStats.push({
                        projectId: project.id,
                        projectName: project.name,
                        sessionCount: fixes.length,
                        topErrorType: topType,
                        topErrorPercentage: topTypePercentage
                    });
                }
            }

            // Sort by session count descending
            projectStats.sort((a, b) => b.sessionCount - a.sessionCount);

            return projectStats;

        } catch (error) {
            console.error('Error getting cross-project stats:', error);
            return [];
        }
    },

    /**
     * Get knowledge base with success rates
     * @param {string} sessionId
     * @returns {Promise<Array>} Principles with success metrics
     */
    async getKnowledgeBase(sessionId) {
        try {
            const allProjects = await window.Projects.getAllProjects(sessionId);

            if (!allProjects || allProjects.length === 0) {
                return [];
            }

            let allPrinciples = [];

            for (const project of allProjects) {
                // Get ALL principles (category=null, high limit)
                const principles = await window.FirestoreOps.queryPrinciples(sessionId, project.id, null, 999);

                // Tag with project name for context
                const tagged = principles.map(p => ({
                    ...p,
                    fromProject: project.name
                }));

                allPrinciples = allPrinciples.concat(tagged);
            }

            if (allPrinciples.length === 0) {
                return [];
            }

            // Format for display
            const knowledge = allPrinciples.map(p => ({
                principle: p.principle || 'No description',
                successRate: p.context?.successRate
                    ? Math.round(p.context.successRate * 100)
                    : 0,
                appliedCount: p.context?.appliedCount || 0,
                category: p.category || 'general',
                fromProject: p.fromProject
            }));

            // Sort by success rate descending
            knowledge.sort((a, b) => b.successRate - a.successRate);

            return knowledge;

        } catch (error) {
            console.error('Error getting knowledge base:', error);
            return [];
        }
    }
};

// Export
if (typeof window !== 'undefined') {
    window.Analytics = Analytics;
}
if (typeof module !== 'undefined') module.exports = { Analytics };
