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
    },

    /**
     * Detect if user has debugged similar error before
     * @param {string} currentError - Current error message
     * @param {string} sessionId
     * @param {string} projectId
     * @returns {Promise<object|null>} Similar fix or null
     */
    async detectSimilarError(currentError, sessionId, projectId) {
        // Get all past fixes
        const allFixes = await window.FirestoreOps.getAllFixesForProject(sessionId, projectId);

        if (allFixes.length === 0) {
            return null; // No history
        }

        // Find similar errors
        const similarFixes = [];

        for (const fix of allFixes) {
            const similarity = this._calculateTextSimilarity(
                currentError.toLowerCase(),
                fix.error.message.toLowerCase()
            );

            if (similarity > 0.7) { // 70% similar threshold
                similarFixes.push({
                    ...fix,
                    similarity
                });
            }
        }

        if (similarFixes.length === 0) {
            return null; // No similar errors found
        }

        // Return most recent similar fix
        similarFixes.sort((a, b) => {
            // Sort by similarity first, then recency
            if (Math.abs(a.similarity - b.similarity) < 0.1) {
                return b.timestamp?.toMillis() - a.timestamp?.toMillis();
            }
            return b.similarity - a.similarity;
        });

        return similarFixes[0];
    },

    /**
     * Calculate text similarity between two strings
     * Simple word-overlap algorithm (no ML needed)
     * @param {string} text1
     * @param {string} text2
     * @returns {number} Similarity score 0.0-1.0
     */
    _calculateTextSimilarity(text1, text2) {
        // Tokenize: split on spaces and remove special chars
        const tokenize = (text) => {
            return text
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 2); // Ignore short words
        };

        const words1 = tokenize(text1);
        const words2 = tokenize(text2);

        if (words1.length === 0 || words2.length === 0) {
            return 0;
        }

        // Count common words
        const set1 = new Set(words1);
        const set2 = new Set(words2);

        let commonCount = 0;
        for (const word of set1) {
            if (set2.has(word)) {
                commonCount++;
            }
        }

        // Jaccard similarity: intersection / union
        const union = set1.size + set2.size - commonCount;
        return commonCount / union;
    },
};

// Export
if (typeof window !== 'undefined') {
    window.PersonalInsights = PersonalInsights;
}
if (typeof module !== 'undefined') module.exports = { PersonalInsights };
