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
            while (!window.GeminiModel && attempts < 50) {
                await new Promise(r => setTimeout(r, 100)); // Wait 100ms
                attempts++;
            }

            if (!window.GeminiModel) {
                console.warn('Vertex AI SDK failed to load in time. AI features will use fallback.');
            }

            // Initialize Gemini (Safe Mode)
            if (window.Gemini && window.GeminiModel) {
                window.Gemini.init();
            } else {
                Logger.info('ℹ️ Skipping Gemini init - SDK not loaded');
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

            // Initialize HistoryView
            if (window.HistoryView) {
                const currentProjectId = window.Projects.getCurrent();
                window.HistoryView.init(sessionId, currentProjectId);
            }

            // Wire up tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tabName = e.target.id.replace('tab-', '');
                    this.handleTabSwitch(tabName);
                });
            });

            Logger.info('✅ App initialized');
        } catch (error) {
            ErrorHandler.handle(error, 'App.init');
        }
    },

    /**
     * Handle tab switching (Debug | History | Analytics)
     */
    handleTabSwitch(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`)?.classList.add('active');

        // Show/hide sections
        const sections = ['debug', 'history', 'analytics'];
        sections.forEach(section => {
            const el = document.getElementById(`${section}-section`);
            if (el) {
                el.classList.toggle('hidden', section !== tabName);
            }
        });

        // Load data for active tab
        if (tabName === 'history' && window.HistoryView) {
            const sessionId = localStorage.getItem('athena_session_id');
            const projectId = window.Projects.getCurrent();
            window.HistoryView.render(sessionId, projectId);
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
            window.ui.setButtonState(false);
            window.ui.clearResults();

            console.log(`🚀 Starting pipeline for project: ${projectId}`);

            // NEW: Check for personal patterns
            try {
                const patterns = await window.PersonalInsights.analyzeUserPatterns(sessionId, projectId);
                if (patterns) {
                    window.ui.displayPersonalInsights(patterns, 'unknown');
                }
            } catch (error) {
                Logger.info('⏭️ Personal insights unavailable:', error.message);
            }

            // NEW: Check for déjà vu
            if (!this.skipDejavu) {
                try {
                    const similarFix = await window.PersonalInsights.detectSimilarError(errorInput, sessionId);
                    if (similarFix) {
                        window.ui.displayDejavu(similarFix, errorInput);
                        this.currentDejavu = similarFix;
                        this.isProcessing = false;
                        window.ui.setButtonState(true);
                        return;
                    }
                } catch (error) {
                    Logger.info('⏭️ Déjà vu check unavailable:', error.message);
                }
            }

            // STEP 1: Analyze Error
            window.ui.showStepProgress(1, 'Analyzing error...');
            let analysis;
            try {
                analysis = await window.Gemini.analyzeError({
                    message: errorInput,
                    stack: ''
                });
            } catch (error) {
                console.warn('⚠️ Step 1 Gemini failed, using fallback:', error.message);
                analysis = {
                    classification: 'unknown',
                    rootCause: 'AI analysis unavailable. Using fallback.',
                    confidence: 0.3,
                    patterns: [],
                    responseTime: 0,
                    thinkingTokens: 0,
                    usedFallback: true
                };
            }
            window.ui.displayAnalysis(analysis);
            Logger.info('✅ Step 1 complete:', analysis);

            // STEP 2: Search Past Fixes
            window.ui.showStepProgress(2, 'Searching past fixes...');
            const pastFixes = await window.FirestoreOps.searchPastFixes(sessionId, projectId, analysis.classification);

            if (pastFixes.length === 0) {
                try {
                    const globalFixes = await window.FirestoreOps.searchAcrossAllProjects(sessionId, analysis.classification);
                    if (globalFixes.length > 0) {
                        pastFixes.push(...globalFixes);
                        window.ui.showStepProgress(2, 'Found solutions from your other projects!');
                    }
                } catch (err) {
                    console.warn('Cross-project search failed:', err);
                }
            }
            window.ui.displayPastFixes(pastFixes);
            Logger.info(`✅ Step 2 complete: Found ${pastFixes.length} past fixes`);

            // STEP 3: Extract Principle
            let principle = null;
            if (pastFixes.length > 0) {
                window.ui.showStepProgress(3, 'Extracting principle...');
                try {
                    principle = await window.Gemini.extractPrinciple({ message: errorInput }, pastFixes[0].fix, analysis);
                    window.ui.displayPrinciple(principle);
                    Logger.info('✅ Step 3 complete:', principle);
                } catch (error) {
                    const progressDiv = document.getElementById('step-progress');
                    if (progressDiv) progressDiv.innerHTML += ` <span class="text-xs text-amber-600">(Principle extraction unavailable)</span>`;
                }
            } else {
                const progressDiv = document.getElementById('step-progress');
                if (progressDiv) progressDiv.innerHTML += ` <span class="text-xs text-navy/50">(Skipped: No history)</span>`;
                Logger.info('⏭️ Step 3 skipped: Cold Start');
            }

            // STEP 4: Query & Rank Solutions
            window.ui.showStepProgress(4, 'Ranking solutions...');
            const principles = await window.FirestoreOps.queryPrinciples(sessionId, projectId, analysis.classification);

            let ranked = [];
            if (principles.length > 0) {
                ranked = await window.Gemini.rankSolutionsBySemantic(principles, { message: errorInput, classification: analysis.classification });
            }

            window.ui.displaySolutions(ranked);
            Logger.info(`✅ Step 4 complete: ${ranked.length} solutions ranked`);

            // FALLBACK: If no principles found, usage past fixes as solutions
            if (ranked.length === 0 && pastFixes.length > 0) {
                console.log('ℹ️ No principles found, promoting past fixes to solutions');
                ranked = pastFixes.map(pf => ({
                    solution: pf.fix.solution,
                    confidence: 0.85, // High confidence for exact matches
                    source: pf.projectName ? `Project: ${pf.projectName}` : 'Past Fix',
                    category: pf.error?.type || 'unknown',
                    // context for feedback loop
                    principleId: pf.linkedPrinciples?.[0] || null
                }));
                // Re-display with new data
                window.ui.displaySolutions(ranked);
            }

            // STEP 5: Ready for feedback
            this.currentFix = {
                error: { message: errorInput, stack: '' },
                fix: ranked.length > 0 ? { solution: ranked[0].solution } : null,
                analysis,
                principle
            };

            window.ui.showFeedbackButtons();
            const readyMsg = ranked.length > 0 ? 'Ready for your feedback!' : 'First occurrence! Fix it, then click "This Helped".';
            window.ui.showStepProgress(5, readyMsg);

        } catch (error) {
            if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
                window.ui.showError('⏰ Gemini API rate limit reached. Using fallback patterns.');
                Logger.warn('Gemini Rate Limit', error);
            } else {
                ErrorHandler.handle(error, 'Pipeline');
            }
        } finally {
            this.isProcessing = false;
            window.ui.setButtonState(true);
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

            // Pattern-based classification fallback
            // Pattern-based classification now handled by ErrorClassifier (utils/classifier.js)

            // Build better error data (include type from analysis)
            const errorData = {
                message: this.currentFix.error.message,
                stack: this.currentFix.error.stack || '',
                type: window.ErrorClassifier ? window.ErrorClassifier.classify(
                    this.currentFix.error.message,
                    this.currentFix.analysis?.classification
                ) : 'unknown'
            };

            // Build better fix data (use root cause if no explicit fix)
            const fixData = this.currentFix.fix ? this.currentFix.fix : {
                solution: this.currentFix.analysis?.rootCause
                    ? `Root cause: ${this.currentFix.analysis.rootCause}. Resolved by user.`
                    : 'Manual fix applied by user',
                explanation: this.currentFix.analysis?.rootCause || 'User resolved this error manually'
            };

            // Store fix with better data
            // Store fix with better data
            const fixId = await window.FirestoreOps.storeFix(
                sessionId,
                projectId,
                errorData,
                fixData,
                this.currentFix.analysis
            );

            console.log(`✅ Fix stored: ${fixId}`);

            // NEW: If we didn't extract a principle earlier (e.g. Cold Start), do it now!
            if (!this.currentFix.principle && window.Gemini) {
                try {
                    console.log('🎓 Extracting principle from new fix...');
                    const newPrinciple = await window.Gemini.extractPrinciple(
                        { message: errorData.message },
                        fixData,
                        this.currentFix.analysis
                    );
                    if (newPrinciple) {
                        this.currentFix.principle = newPrinciple;
                    }
                } catch (err) {
                    console.warn('Could not extract principle on-the-fly:', err);
                }
            }

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
                window.ui.showSuccess('Fix saved! (No principle extracted)');
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

    async handleAnalyticsTab() {
        const sessionId = localStorage.getItem('athena_session_id');
        const projectId = window.Projects.getCurrent();

        if (window.AnalyticsView) {
            await window.AnalyticsView.render(sessionId, projectId);
        } else {
            console.error('AnalyticsView module not loaded');
            window.ui.showError('Analytics not available');
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
    },

    async handleUsePastFix() {
        if (!this.currentDejavu) {
            window.ui.showError('No past fix available');
            return;
        }

        try {
            // Show the past solution
            window.ui.displayPastFixSolution(this.currentDejavu);

            // Reconstruct analysis object from stored data to satisfy storeFix() requirements
            const reconstructedAnalysis = {
                classification: this.currentDejavu.error?.type || 'unknown',
                rootCause: 'Reused past solution',
                thinkingTokens: this.currentDejavu.geminiThinking?.tokensUsed || 0,
                responseTime: this.currentDejavu.geminiThinking?.responseTime || 0
            };

            // Skip to Step 5 (feedback)
            this.currentFix = {
                error: { message: this.currentDejavu.error.message },
                fix: this.currentDejavu.fix,
                analysis: reconstructedAnalysis, // Use valid object
                principle: this.currentDejavu.principle
            };

            window.ui.showFeedbackButtons();
            window.ui.showStepProgress(5, 'Used past fix - was it helpful?');

        } catch (error) {
            console.error('Use past fix failed:', error);
            window.ui.showError('Could not apply past fix');
        }
    },

    async handleContinueAnalysis() {
        // User chose to do new analysis instead of using past fix
        this.currentDejavu = null;
        window.ui.clearResults();

        // Now run the normal pipeline
        const errorInput = document.getElementById('error-input').value; // Re-grab value
        // Note: we can't just call runDebugPipeline because it's not exported or named separately in this file structure, 
        // logic is inside handleSubmit. We should re-trigger handleSubmit but bypass the check we just added?
        // Actually, preventing infinite loop is key.
        // Option 1: Add a 'force' param to handleSubmit. 
        // Option 2: Just Copy-paste logic? Bad.
        // Option 3: Refactor handleSubmit to extract pipeline.
        // Given constraints "DO NOT modify existing Step 1-5 logic", I should probably trigger handleSubmit 
        // but finding a way to skip the checks.

        // Simpler approach for this specific prompt intervention:
        // Set a flag to skip detection for the next run.
        this.skipDejavu = true;
        await this.handleSubmit();
        this.skipDejavu = false;
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
