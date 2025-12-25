/**
 * app.js
 * Main Orchestrator for Athena Clew Platform.
 * Coordinates the 5-step Theseus debugging pipeline.
 */

const App = {
    currentFix: null,
    isProcessing: false,

    /**
     * Initialize app on page load
     */
    async init() {
        try {
            // Wait for Vertex AI SDK (Module script race condition)
            // Increased to 50 attempts (5 seconds) for slower connections
            let attempts = 0;
            while (!window.getGenerativeModel && attempts < 50) {
                await new Promise(r => setTimeout(r, 100)); // Wait 100ms
                attempts++;
            }

            if (!window.getGenerativeModel) {
                console.warn('Vertex AI SDK failed to load in time. AI features will use fallback.');
            }

            // Initialize Gemini (Safe Mode)
            if (window.Gemini && window.getGenerativeModel) {
                window.Gemini.init();
            } else {
                console.log('ℹ️ Skipping Gemini init - SDK not loaded');
            }

            // Get session
            const sessionId = await getOrCreateSession(); // From session.js
            if (!sessionId) {
                throw new Error('No session could be established');
            }

            // Initialize projects
            if (window.ProjectUI) {
                await window.ProjectUI.init(sessionId);
            }

            console.log('✅ App initialized');
        } catch (error) {
            console.error('App initialization failed:', error);
            if (window.ui) window.ui.showError(`Failed to initialize app: ${error.message}`);
        }
    },

    /**
     * Main entry point: Handle error submission
     */
    async handleSubmit() {
        if (this.isProcessing) {
            window.ui.showError('Already processing...');
            return;
        }

        const errorInput = document.getElementById('error-input').value.trim();
        if (!errorInput) {
            window.ui.showError('Please paste an error message');
            return;
        }

        const sessionId = localStorage.getItem('athena_session_id');
        const projectId = window.Projects.getCurrent();

        if (!projectId) {
            window.ui.showError('No project selected. Please create or select a project.');
            return;
        }

        try {
            this.isProcessing = true;
            window.ui.setButtonState(false); // Set loading state
            window.ui.clearResults(); // Clear previous results

            // STEP 0: Verify project context
            console.log(`🚀 Starting pipeline for project: ${projectId}`);

            // STEP 1: Analyze Error
            window.ui.showStepProgress(1, 'Analyzing error...');
            let analysis;
            try {
                analysis = await window.Gemini.analyzeError({
                    message: errorInput,
                    stack: '' // Multiline stack extraction is future work
                });
            } catch (error) {
                console.warn('⚠️ Step 1 Gemini failed, using fallback classification:', error.message);

                // Graceful degradation: Continue with fallback
                analysis = {
                    classification: 'unknown',
                    rootCause: 'AI analysis unavailable (rate limit or network error). Using fallback classification.',
                    confidence: 0.3,
                    patterns: [],
                    responseTime: 0,
                    thinkingTokens: 0,
                    usedFallback: true
                };
            }
            window.ui.displayAnalysis(analysis);
            console.log('✅ Step 1 complete:', analysis);

            // STEP 2: Search Past Fixes
            window.ui.showStepProgress(2, 'Searching past fixes...');
            const pastFixes = await window.FirestoreOps.searchPastFixes(
                sessionId,
                projectId,
                analysis.classification
            );

            // Cold Start Handling: Show message but continue
            if (pastFixes.length === 0) {
                console.log('ℹ️ Cold Start: No past fixes found (this is your first!).');
            }
            window.ui.displayPastFixes(pastFixes);
            console.log(`✅ Step 2 complete: Found ${pastFixes.length} past fixes`);

            // STEP 3: Extract Principle (if past fixes exist)
            let principle = null;
            if (pastFixes.length > 0) {
                window.ui.showStepProgress(3, 'Extracting principle...');
                try {
                    principle = await window.Gemini.extractPrinciple(
                        { message: errorInput },
                        pastFixes[0].fix,
                        analysis
                    );
                    window.ui.displayPrinciple(principle);
                    console.log('✅ Step 3 complete:', principle);
                } catch (error) {
                    console.warn('⚠️ Step 3 Gemini failed, continuing without principle:', error.message);

                    // Graceful degradation: Continue without principle (non-critical)
                    const progressDiv = document.getElementById('step-progress');
                    if (progressDiv) {
                        progressDiv.innerHTML += ` <span class="text-xs text-amber-600">(Principle extraction unavailable - continuing)</span>`;
                    }
                }
            } else {
                // UI update specific for cold start
                const progressDiv = document.getElementById('step-progress');
                if (progressDiv) progressDiv.innerHTML += ` <span class="text-xs text-navy/50">(Skipped: No history)</span>`;
                console.log('⏭️  Step 3 skipped: Cold Start');
            }

            // STEP 4: Query & Rank Solutions
            window.ui.showStepProgress(4, 'Ranking solutions...');
            const principles = await window.FirestoreOps.queryPrinciples(
                sessionId,
                projectId,
                analysis.classification
            );

            let ranked = [];
            if (principles.length > 0) {
                ranked = await window.Gemini.rankSolutionsBySemantic(
                    principles,
                    { message: errorInput, classification: analysis.classification }
                );
            } else {
                console.log('ℹ️ Cold Start: No principles to rank yet.');
            }

            window.ui.displaySolutions(ranked);
            console.log(`✅ Step 4 complete: ${ranked.length} solutions ranked`);

            // STEP 5: Ready for feedback (store on user click)
            this.currentFix = {
                error: { message: errorInput, stack: '' },
                fix: ranked.length > 0 ? { solution: ranked[0].principle } : null, // If null, we'll store a generic or ask user
                analysis,
                principle
            };

            window.ui.showFeedbackButtons();

            const readyMsg = ranked.length > 0
                ? 'Ready for your feedback!'
                : 'First occurrence! Fix it, then click "This Helped" to learn.';
            window.ui.showStepProgress(5, readyMsg);

        } catch (error) {
            console.error('Pipeline failed:', error);
            window.ui.showError(`Pipeline failed: ${error.message}`);
        } finally {
            this.isProcessing = false;
            window.ui.setButtonState(true); // Reset button
        }
    },

    /**
     * Handle user feedback: "This helped!"
     */
    async handleHelpfulFeedback() {
        // If no auto fix available, maybe ask user what they did?
        // For MVP, we assume if they clicked "This helped", and we have a current fix/principle context, we save that.
        // If we don't have a fix (e.g. cold start), we store a generic fix for now or rely on the principle.

        const sessionId = localStorage.getItem('athena_session_id');
        const projectId = window.Projects.getCurrent();

        if (!this.currentFix) {
            window.ui.showError('No fix context found.');
            return;
        }

        try {
            window.ui.setButtonState(false);

            // Store fix
            const fixId = await window.FirestoreOps.storeFix(
                sessionId,
                projectId,
                this.currentFix.error,
                this.currentFix.fix || { solution: 'User manual fix' },
                this.currentFix.analysis
            );

            console.log(`✅ Fix stored: ${fixId}`);

            // Store principle (if extracted)
            if (this.currentFix.principle) {
                const principleId = await window.FirestoreOps.storePrinciple(
                    sessionId,
                    projectId,
                    this.currentFix.principle,
                    fixId
                );
                console.log(`✅ Principle stored: ${principleId}`);
                window.ui.showSuccess('Principle learned! 🎓');
            } else {
                window.ui.showSuccess('Fix saved!');
            }

            // Clear form
            window.ui.clearInput();
            window.ui.clearResults();
            this.currentFix = null;

        } catch (error) {
            console.error('Failed to store feedback:', error);
            window.ui.showError('Failed to save feedback');
        } finally {
            window.ui.setButtonState(true);
        }
    },

    /**
     * Handle user feedback: "Try another"
     */
    async handleTryAnother() {
        window.ui.clearInput();
        window.ui.clearResults();
        this.currentFix = null;
        window.ui.showSuccess('Ready for another error!');
    }
};

// Export globally
if (typeof window !== 'undefined') window.app = App;
if (typeof module !== 'undefined') module.exports = { App };

// Initialize on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Only init if not already (safeguard)
        // The individual scripts load, but App.init calls them
        await App.init();
    });
}
