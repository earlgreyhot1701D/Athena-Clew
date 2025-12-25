/**
 * gemini.js
 * AI Integration using Hybrid SDK approach.
 * Bridges Modular Vertex AI SDK (via window.getGenerativeModel) with Compat App.
 */

const Gemini = {
    model: null,

    /**
     * Initialize Gemini Model
     * Uses the global window.getGenerativeModel exposed in index.html
     */
    init() {
        try {
            if (!window.getGenerativeModel) {
                throw new Error('Vertex AI SDK not loaded (window.getGenerativeModel missing)');
            }

            // Use the default firebase app (Compat) passed to Modular SDK
            // This requires the compat app instance, which firebase.app() returns
            this.model = window.getGenerativeModel(firebase.app(), {
                model: 'gemini-1.5-pro',
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 2048
                }
            });
            console.log('✅ Gemini 1.5 Pro initialized');
        } catch (error) {
            console.error('Failed to initialize Gemini:', error);
            throw error;
        }
    },

    /**
     * Step 1: Deep Error Analysis
     * @param {object} errorData - {message, stack}
     * @returns {Promise<object>} {classification, rootCause, confidence, thinkingTokens}
     */
    async analyzeError(errorData) {
        if (!this.model) {
            try { this.init(); } catch (e) { console.warn('Gemini auto-init failed, using fallback.'); }
        }

        if (!this.model) {
            // Immediate fallback if init failed
            return {
                classification: this._fallbackClassification(errorData.message),
                rootCause: 'Analysis failed - SDK unavailable',
                patterns: [],
                confidence: 0.3,
                thinkingTokens: 0,
                responseTime: 0,
                error: 'SDK not loaded'
            };
        }

        const prompt = `You are an expert debugging assistant. Analyze this error deeply and classify it.
  
  ERROR MESSAGE:
  ${errorData.message}
  
  STACK TRACE:
  ${errorData.stack || 'No stack trace provided'}
  
  ANALYZE and return ONLY a JSON object with this structure:
  {
    "classification": "syntax|dependency|logic|async|unknown",
    "rootCause": "Brief explanation of what went wrong",
    "patterns": ["Pattern 1", "Pattern 2"],
    "confidence": 0.0-1.0
  }
  
  Think step-by-step:
  1. What type of error is this?
  2. What patterns do you see in the stack trace?
  3. What is the likely root cause?
  
  Return ONLY valid JSON, no other text.`;

        const maxRetries = 1;
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                const startTime = Date.now();

                const result = await this.model.generateContent({
                    contents: [{
                        role: 'user',
                        parts: [{ text: prompt }]
                    }]
                    // Thinking budget omitted as it may not be supported on 1.5 Pro stable yet
                });

                const responseTime = Date.now() - startTime;
                const responseText = result.response.text();
                const thinkingTokens = result.response.usageMetadata?.thinkingTokens || 0;

                // Parse JSON response
                const analysisData = this._parseJSON(responseText);

                console.log(`✅ Error analyzed in ${responseTime}ms`);

                return {
                    classification: analysisData.classification || 'unknown',
                    rootCause: analysisData.rootCause || 'Unable to determine',
                    patterns: analysisData.patterns || [],
                    confidence: analysisData.confidence || 0.5,
                    thinkingTokens,
                    responseTime
                };

            } catch (error) {
                attempt++;

                // Rate limit check
                if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Busy'))) {
                    if (attempt <= maxRetries) {
                        console.warn(`⚠️ Rate limit hit, retrying in 2s... (Attempt ${attempt})`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue;
                    }
                }

                console.error('Error analysis failed:', error);

                // Fallback classification
                return {
                    classification: this._fallbackClassification(errorData.message),
                    rootCause: 'Analysis failed - using fallback',
                    patterns: [],
                    confidence: 0.3,
                    thinkingTokens: 0,
                    responseTime: 0,
                    error: error.message
                };
            }
        }
    },

    /**
     * Step 3: Extract Reusable Principle
     * @param {object} error - Original error
     * @param {object} fix - Applied solution
     * @param {object} analysis - Step 1 analysis
     * @returns {Promise<object>} {principle, category, confidence, thinkingTokens}
     */
    async extractPrinciple(error, fix, analysis) {
        if (!this.model) this.init();

        const prompt = `You are extracting a reusable debugging principle from a successful fix.
  
  ORIGINAL ERROR:
  Type: ${analysis.classification}
  Message: ${error.message}
  Root Cause: ${analysis.rootCause}
  
  SOLUTION THAT WORKED:
  ${fix.solution}
  
  EXTRACT a general principle that can apply to similar errors.
  
  FORMAT: "When [condition], then [action]"
  CATEGORY: Choose from: async, dependency, state, logic, syntax, other
  
  Return ONLY a JSON object:
  {
    "principle": "When [specific pattern], then [general solution]",
    "category": "async|dependency|state|logic|syntax|other",
    "reasoning": "Why this principle generalizes",
    "confidence": 0.0-1.0
  }
  
  Make it actionable and reusable. Think step-by-step:
  1. What was the underlying pattern?
  2. How can this apply to other situations?
  3. What's the general rule?
  
  Return ONLY valid JSON.`;

        try {
            const result = await this.model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            });

            const responseText = result.response.text();
            const thinkingTokens = result.response.usageMetadata?.thinkingTokens || 0;
            const principleData = this._parseJSON(responseText);

            // Validate principle format (Warn only)
            if (!principleData.principle.toLowerCase().includes('when')) {
                console.warn('⚠️ Principle does not follow "When X, then Y" format:', principleData.principle);
            }

            console.log(`✅ Principle extracted`);

            return {
                principle: principleData.principle,
                category: principleData.category || 'other',
                reasoning: principleData.reasoning || '',
                confidence: principleData.confidence || 0.7,
                thinkingTokens
            };

        } catch (error) {
            console.error('Principle extraction failed:', error);

            // Fallback
            return {
                principle: `When encountering ${analysis.classification} errors, check ${analysis.rootCause}`,
                category: analysis.classification,
                reasoning: 'Generated fallback principle',
                confidence: 0.4,
                thinkingTokens: 0,
                error: error.message
            };
        }
    },

    /**
     * Step 4 (partial): Rank solutions by semantic relevance
     * @param {Array} principles - Available principles
     * @param {object} currentError - Error being debugged
     * @returns {Promise<Array>} Sorted by relevance
     */
    async rankSolutionsBySemantic(principles, currentError) {
        // Simple implementation: score each principle
        const scoredPrinciples = principles.map(p => ({
            ...p,
            relevanceScore: this._calculateRelevance(p, currentError)
        }));

        return scoredPrinciples.sort((a, b) => b.relevanceScore - a.relevanceScore);
    },

    /**
     * Helper: Parse JSON from Gemini response
     */
    _parseJSON(text) {
        try {
            // Remove markdown code blocks if present
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('JSON parse failed:', text);
            // If simple parse fails, try to find JSON object within text
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                try { return JSON.parse(match[0]); } catch (e) { /* ignore */ }
            }
            throw new Error('Invalid JSON response from Gemini');
        }
    },

    /**
     * Helper: Fallback classification from error message
     */
    _fallbackClassification(message) {
        if (!message) return 'unknown';

        const msg = message.toLowerCase();
        if (msg.includes('syntaxerror')) return 'syntax';
        if (msg.includes('referenceerror') || msg.includes('importerror')) return 'dependency';
        if (msg.includes('typeerror')) return 'logic';
        if (msg.includes('timeout') || msg.includes('promise') || msg.includes('network')) return 'async';
        return 'unknown';
    },

    /**
     * Helper: Calculate semantic relevance (simple heuristic)
     */
    _calculateRelevance(principle, error) {
        let score = 0;

        // Category match
        if (principle.category === error.classification) score += 0.5;

        // Keyword overlap
        const principleWords = principle.principle.toLowerCase().split(' ');
        const errorWords = error.message.toLowerCase().split(' ');
        const overlap = principleWords.filter(w => errorWords.includes(w)).length;
        score += Math.min(overlap * 0.1, 0.3);

        // Success rate
        score += (principle.context?.successRate || 0.5) * 0.2;

        return Math.min(score, 1.0);
    }
};

// Export
if (typeof window !== 'undefined') window.Gemini = Gemini;
if (typeof module !== 'undefined') module.exports = { Gemini };
