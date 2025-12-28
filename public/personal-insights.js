const PersonalInsights = {
    /**
     * Analyze user's debugging patterns
     * @param {string} sessionId
     * @param {string} projectId
     * @returns {Promise<object>} Pattern analysis
     */
    async analyzeUserPatterns(sessionId, projectId) {
        // Get all fixes for this project
        const allFixes = await window.FirestoreOps.getAllFixesForProject(sessionId, projectId);

        if (allFixes.length === 0) {
            return null; // Not enough data
        }

        // Count error types
        const typeCounts = {};
        allFixes.forEach(fix => {
            const type = fix.error?.type || 'unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        // Calculate percentages
        const total = allFixes.length;
        const typeBreakdown = Object.keys(typeCounts).map(type => ({
            type,
            count: typeCounts[type],
            percentage: Math.round((typeCounts[type] / total) * 100)
        })).sort((a, b) => b.count - a.count);

        // Find most common error type
        const mostCommon = typeBreakdown[0];

        // Calculate growth (if enough data)
        const growthMetric = this._calculateGrowth(allFixes, mostCommon.type);

        return {
            totalErrors: total,
            typeBreakdown,
            mostCommon,
            growthMetric
        };
    },

    /**
     * Calculate growth/improvement over time
     * @param {Array} fixes - All fixes
     * @param {string} errorType - Type to analyze
     * @returns {object} Growth metrics
     */
    _calculateGrowth(fixes, errorType) {
        // Filter fixes of this type
        const typeFixes = fixes.filter(f => f.error?.type === errorType);

        if (typeFixes.length < 3) {
            return null; // Not enough data
        }

        // Sort by timestamp
        typeFixes.sort((a, b) => a.timestamp?.toMillis() - b.timestamp?.toMillis());

        // Simple growth: are later fixes faster?
        // (In real implementation, you'd track time-to-fix)
        // For now, just show encouraging message if user has debugged many

        return {
            isImproving: typeFixes.length > 5,
            message: typeFixes.length > 5
                ? `Great progress! You're mastering ${errorType} patterns through practice!`
                : `You're building your ${errorType} debugging skills - keep going!`
        };
    },

    /**
     * Generate pattern alert for current error
     * @param {object} patterns - User's patterns
     * @param {string} currentErrorType - Current error being debugged
     * @returns {string|null} Alert message
     */
    generatePatternAlert(patterns, currentErrorType) {
        if (!patterns || patterns.totalErrors < 3) {
            return null; // Not enough data for patterns
        }

        // Check if this error type is common for user
        const currentTypeData = patterns.typeBreakdown.find(t => t.type === currentErrorType);

        if (currentTypeData && currentTypeData.count >= 3) {
            return `You're practicing ${currentErrorType} patterns - this is session #${currentTypeData.count + 1}! Each encounter strengthens your skills.`;
        }

        if (patterns.mostCommon.type === currentErrorType) {
            return `You're building expertise in ${currentErrorType} patterns (${patterns.mostCommon.percentage}% of your practice)`;
        }

        return null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.PersonalInsights = PersonalInsights;
}
if (typeof module !== 'undefined') module.exports = { PersonalInsights };
