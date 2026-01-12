/**
 * error-handler.js
 * Centralized error handling and reporting logic.
 */

class AppError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
    }
}

const ErrorHandler = {
    /**
     * Handle an error globally.
     * @param {Error|string} error - The error object or message.
     * @param {string} [context] - Where the error occurred (function name, etc.)
     * @param {boolean} [showUser] - Whether to show a UI alert to the user.
     */
    handle(error, context = 'Global', showUser = true) {
        // 1. Normalize error
        const errObj = error instanceof Error ? error : new Error(String(error));
        const message = errObj.message || 'An unexpected error occurred';

        // 2. Log via structured Logger (if available), else console
        if (window.Logger) {
            window.Logger.error(`[${context}] ${message}`, {
                stack: errObj.stack,
                details: errObj.details || 'No details'
            });
        } else {
            console.error(`[${context}] ${message}`, errObj);
        }

        // 3. UI Notification (if requested)
        if (showUser) {
            if (window.ui && typeof window.ui.showError === 'function') {
                // Formatting for user friendliness
                const displayMsg = errObj instanceof AppError
                    ? `${errObj.message} (Code: ${errObj.code})`
                    : message;

                window.ui.showError(displayMsg);
            } else {
                // Fallback for critical failures before UI loads
                // console.warn('UI not loaded, alerting user via console only to avoid popup spam');
            }
        }
    },

    /**
     * Wrap an async function with error handling.
     * @param {Function} fn - The async function to wrap.
     * @param {string} context - The context name.
     */
    asyncWrapper(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, context);
            }
        };
    }
};

// Global error listeners
if (typeof window !== 'undefined') {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        ErrorHandler.handle(event.reason, 'UnhandledPromise', false);
    });

    // Catch global script errors
    window.onerror = (msg, url, line, col, error) => {
        ErrorHandler.handle(error || msg, `ScriptError:${line}`, false);
        return false; // let default handler run too (or true to suppress)
    };

    window.AppError = AppError;
    window.ErrorHandler = ErrorHandler;
}

if (typeof module !== 'undefined') {
    module.exports = { AppError, ErrorHandler };
}
