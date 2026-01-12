/**
 * analytics-view.js
 * Handles the display and orchestration of the Analytics Dashboard.
 * Decoupled from the main App controller to follow SRP.
 */

const AnalyticsView = {
    /**
     * Load and render the analytics dashboard
     * @param {string} sessionId 
     * @param {string} projectId 
     */
    async render(sessionId, projectId) {
        console.log('📊 Loading Analytics View...');

        if (!sessionId) {
            window.ui.showError('No session found');
            return;
        }

        // Helper to timeout promises
        const withTimeout = (promise, name, ms = 8000) => {
            return Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)
                )
            ]);
        };

        try {
            if (window.ui.elements.analyticsResults) {
                window.ui.elements.analyticsResults.innerHTML = '';
            }

            // Show loading
            const showLoading = (msg) => {
                const container = window.ui.elements.analyticsResults || window.ui.elements.results;
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-12">
                            <div class="animate-spin w-8 h-8 border-4 border-amber border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p class="text-navy/60">${msg}</p>
                        </div>
                    `;
                }
            };

            showLoading('Connecting to analytics engine...');

            // Sequential loading with diagnostics
            console.log('Step 1: Aggregating stats...');
            showLoading('Aggregating session statistics...');
            try {
                var stats = await withTimeout(
                    window.Analytics.aggregateStats(sessionId),
                    'aggregateStats'
                );
                console.log('✅ Stats:', stats);
            } catch (e) { console.error(e); var stats = null; }

            console.log('Step 2: Getting breakdown...');
            showLoading('Analyzing error patterns...');
            try {
                var breakdown = await withTimeout(
                    window.Analytics.getErrorBreakdown(sessionId),
                    'getErrorBreakdown'
                );
                console.log('✅ Breakdown:', breakdown?.length);
            } catch (e) { console.error(e); var breakdown = []; }

            console.log('Step 3: Cross-project stats...');
            showLoading('Searching for cross-project skills...');
            try {
                var crossProject = await withTimeout(
                    window.Analytics.getCrossProjectStats(sessionId),
                    'getCrossProjectStats'
                );
                console.log('✅ Cross-project:', crossProject?.length);
            } catch (e) { console.error(e); var crossProject = []; }

            console.log('Step 4: Knowledge base...');
            showLoading('Compiling knowledge base...');
            try {
                var knowledge = await withTimeout(
                    window.Analytics.getKnowledgeBase(sessionId),
                    'getKnowledgeBase'
                );
                console.log('✅ Knowledge:', knowledge?.length);
            } catch (e) { console.error(e); var knowledge = []; }

            // Display in order (if we get here, everything worked)
            window.ui.displayAnalyticsStats(stats);

            if (breakdown && breakdown.length > 0) {
                window.ui.displayErrorBreakdown(breakdown);
            }

            if (crossProject && crossProject.length > 0) {
                window.ui.displayCrossProjectStats(crossProject);
            }

            if (knowledge && knowledge.length > 0) {
                window.ui.displayKnowledgeBase(knowledge);
            }

            console.log('✅ Analytics loaded successfully');

        } catch (error) {
            console.error('Analytics diagnostic error:', error);
            window.ui.showError('Analytics skipped a beat: ' + error.message);
            // Fallback UI
            const container = window.ui.elements.analyticsResults || window.ui.elements.results;
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-12 bg-red-50 border-2 border-red-100 rounded">
                        <p class="text-red-700 font-bold mb-2">Analytics Load Failed</p>
                        <p class="text-sm text-navy/60 mb-4">${error.message}</p>
                        <button onclick="window.app.handleAnalyticsTab()" class="bg-white border border-red-300 text-red-700 px-4 py-2 rounded text-sm hover:bg-red-50">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }
};

// Export globally
if (typeof window !== 'undefined') window.AnalyticsView = AnalyticsView;
if (typeof module !== 'undefined') module.exports = { AnalyticsView };
