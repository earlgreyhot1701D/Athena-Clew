/**
 * classifier.js
 * Utility for classifying error messages when AI is unavailable or as a primary pass.
 */

const ErrorClassifier = {
    /**
     * Classify an error message into a category.
     * @param {string} message - The error message to classify.
     * @param {string} [geminiClassification] - Optional classification from Gemini to respect if valid.
     * @returns {string} The classification category ('dependency', 'async', 'logic', 'syntax', 'unknown').
     */
    classify(message, geminiClassification) {
        // Use Gemini classification if available and not 'unknown'
        if (geminiClassification && geminiClassification !== 'unknown') {
            return geminiClassification;
        }

        if (!message) return 'unknown';

        // Fallback: Pattern matching on error message
        const msg = message.toLowerCase();

        if (msg.includes('cannot find module') ||
            msg.includes('module not found') ||
            msg.includes('npm') ||
            msg.includes('package')) {
            return 'dependency';
        }

        if (msg.includes('timeout') ||
            msg.includes('promise') ||
            msg.includes('async') ||
            msg.includes('await')) {
            return 'async';
        }

        if (msg.includes('typeerror') ||
            msg.includes('cannot read property') ||
            msg.includes('undefined') ||
            msg.includes('null')) {
            return 'logic';
        }

        if (msg.includes('syntaxerror') ||
            msg.includes('unexpected token')) {
            return 'syntax';
        }

        return 'unknown';
    }
};

// Export globally
if (typeof window !== 'undefined') window.ErrorClassifier = ErrorClassifier;
if (typeof module !== 'undefined') module.exports = { ErrorClassifier };
