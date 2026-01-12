/**
 * logger.js
 * Structured logging utility with built-in PII scrubbing.
 */

const Logger = {
    /**
     * Log level configuration (can be adjusted at runtime)
     */
    config: {
        minLevel: 'info', // debug, info, warn, error
        scrubPatterns: [
            /sk-[a-zA-Z0-9]{32,}/g,           // Generic API Keys
            /AIza[0-9A-Za-z-_]{35}/g,        // Google API Keys
            /Bearer [a-zA-Z0-9\-\._~\+\/]+=*/g, // Bearer Tokens
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g // Emails
        ]
    },

    /**
     * Map strings to numeric levels
     */
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    },

    /**
     * Check if a log level should go to console
     */
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.config.minLevel];
    },

    /**
     * Scrub sensitive data from logs
     */
    scrub(data) {
        if (!data) return data;

        // Handle objects recursively
        if (typeof data === 'object') {
            try {
                // Determine if we should stringify (simple check)
                const str = JSON.stringify(data);
                let scrubbed = str;
                this.config.scrubPatterns.forEach(pattern => {
                    scrubbed = scrubbed.replace(pattern, '***REDACTED***');
                });
                return JSON.parse(scrubbed);
            } catch (e) {
                return data; // Circular ref or error, return original
            }
        }

        // Handle strings
        if (typeof data === 'string') {
            let scrubbed = data;
            this.config.scrubPatterns.forEach(pattern => {
                scrubbed = scrubbed.replace(pattern, '***REDACTED***');
            });
            return scrubbed;
        }

        return data;
    },

    debug(msg, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(`🐛 [DEBUG] ${this.scrub(msg)}`, ...args.map(a => this.scrub(a)));
        }
    },

    info(msg, ...args) {
        if (this.shouldLog('info')) {
            console.log(`ℹ️ [INFO] ${this.scrub(msg)}`, ...args.map(a => this.scrub(a)));
        }
    },

    warn(msg, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`⚠️ [WARN] ${this.scrub(msg)}`, ...args.map(a => this.scrub(a)));
        }
    },

    error(msg, ...args) {
        if (this.shouldLog('error')) {
            console.error(`❌ [ERROR] ${this.scrub(msg)}`, ...args.map(a => this.scrub(a)));
        }
    }
};

// Export globally
if (typeof window !== 'undefined') window.Logger = Logger;
if (typeof module !== 'undefined') module.exports = { Logger };
