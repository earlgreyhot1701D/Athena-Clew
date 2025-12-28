/**
 * ui.js
 * Handles DOM manipulation and user feedback.
 * 
 * enhanced: Validation, Error Handling, Loading States
 */

const UI = {
    elements: {
        errorInput: null,
        getHelpBtn: null,
        results: null,
        demoForm: null,
        resultsArea: null
    },

    state: {
        isLoading: false
    },

    init() {
        this.elements.errorInput = document.getElementById('error-input');
        this.elements.getHelpBtn = document.getElementById('get-help-btn');
        this.elements.results = document.getElementById('results');
        this.elements.demoForm = document.getElementById('theseus-demo');
    },

    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        this.setButtonState(!isLoading);
    },

    setButtonState(enabled) {
        if (!this.elements.getHelpBtn) return;

        this.elements.getHelpBtn.disabled = !enabled;
        if (enabled) {
            this.elements.getHelpBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            this.elements.getHelpBtn.innerHTML = '🚀 GET HELP';
        } else {
            this.elements.getHelpBtn.classList.add('opacity-50', 'cursor-not-allowed');
            this.elements.getHelpBtn.innerHTML = '🤔 THINKING...';
        }
    },

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-100 border-2 border-green-500 text-green-800 px-4 py-2 font-headline font-bold uppercase shadow-craft z-50 animate-bounce';
        toast.textContent = `✅ ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-100 border-2 border-red-500 text-red-800 px-4 py-2 font-headline font-bold uppercase shadow-craft z-50 shake';
        toast.textContent = `⚠️ ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    },

    // --- Validation Helpers ---

    validateAnalysisData(analysis) {
        if (!analysis) throw new Error('Analysis data is null or undefined');
        if (typeof analysis !== 'object') throw new Error('Analysis data must be an object');
        if (!analysis.classification) throw new Error('Missing field: classification');
        if (!analysis.rootCause) throw new Error('Missing field: rootCause');
        return true;
    },

    validateSolutionsData(solutions) {
        if (!solutions) throw new Error('Solutions data is null or undefined');
        if (!Array.isArray(solutions)) throw new Error('Solutions data must be an array');
        if (solutions.length === 0) return true; // Empty array is valid but warn-worthy maybe?

        solutions.forEach((sol, index) => {
            if (!sol.solution) throw new Error(`Solution #${index} missing 'solution' field`);
            if (typeof sol.confidence !== 'number') throw new Error(`Solution #${index} missing or invalid 'confidence'`);
        });
        return true;
    },

    // --- Display Methods ---

    displayAnalysis(analysis) {
        try {
            if (!this.elements.results) return;
            this.validateAnalysisData(analysis);

            const html = `
                <div class="mt-8 border-3 border-navy p-6 bg-white animate-fade-in">
                    <h3 class="font-headline font-bold text-navy text-xl mb-4 border-b-2 border-navy/10 pb-2">Step 1: Analysis</h3>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="font-bold text-navy/60 uppercase text-xs">Classification</span>
                            <div class="font-mono text-navy">${analysis.classification}</div>
                        </div>
                        <div>
                            <span class="font-bold text-navy/60 uppercase text-xs">Root Cause</span>
                            <div class="text-navy">${analysis.rootCause}</div>
                        </div>
                    </div>
                </div>
            `;
            this.elements.results.insertAdjacentHTML('beforeend', html);

        } catch (error) {
            console.error('Display Analysis Error:', error);
            this.showError(`Display Error: ${error.message}`);
        }
    },

    /**
     * Display personal debugging patterns
     * @param {object} patterns - User's pattern analysis
     * @param {string} currentErrorType - Current error type
     */
    displayPersonalInsights(patterns, currentErrorType) {
        if (!this.elements.results || !patterns) return;

        const patternAlert = window.PersonalInsights.generatePatternAlert(patterns, currentErrorType);

        // Build type breakdown HTML
        const typeBreakdownHtml = patterns.typeBreakdown.slice(0, 3).map(t =>
            `<span class="text-xs bg-navy/10 px-2 py-1 rounded">${t.type}: ${t.count}</span>`
        ).join(' ');

        const html = `
            <div class="mb-6 border-4 border-amber bg-amber/10 p-6 animate-fade-in">
                <div class="flex items-start gap-3 mb-4">
                    <span class="text-2xl">⚡</span>
                    <div class="flex-1">
                        <h3 class="font-headline font-bold text-navy text-lg mb-2">YOUR DEBUGGING PATTERN</h3>
                        <p class="text-sm text-navy/70 mb-3">
                            ${patterns.totalErrors} debugging session${patterns.totalErrors !== 1 ? 's' : ''} completed • 
                            ${typeBreakdownHtml}
                        </p>
                        
                        ${patterns.growthMetric ? `
                            <p class="text-sm text-green-700 font-bold mb-3">
                                ${patterns.growthMetric.message}
                            </p>
                        ` : ''}
                        
                        ${patternAlert ? `
                            <div class="bg-amber/20 border-2 border-amber/40 p-3 rounded">
                                <p class="text-sm font-bold text-amber-900">📚 Learning Pattern:</p>
                                <p class="text-sm text-amber-900">${patternAlert}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <p class="text-xs text-navy/50 italic">Theseus learns YOUR patterns - personalized debugging just for you!</p>
            </div>
        `;

        this.elements.results.innerHTML = html;
    },

    displaySolutions(solutions) {
        try {
            if (!this.elements.results) return;
            this.validateSolutionsData(solutions);

            let solutionsHtml = solutions.map((sol, index) => `
                <div class="bg-cream border-2 border-navy/20 p-4 mb-3 rounded hover:border-amber transition cursor-pointer">
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-headline font-bold text-navy">#${index + 1}</span>
                        <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-300 font-bold">${Math.round(sol.confidence * 100)}% Conf</span>
                    </div>
                    <p class="font-mono text-sm text-navy mb-2">${sol.solution}</p>
                    <div class="text-xs text-navy/50">Source: ${sol.source || 'Unknown'}</div>
                </div>
            `).join('');

            const html = `
                <div id="step4-results" class="mt-6 p-6 bg-white border-3 border-navy/10 rounded">
                    <h3 class="font-headline font-bold text-navy text-xl mb-4">Step 4: Ranked Solutions</h3>
                    ${solutionsHtml}
                    <div class="flex gap-4 mb-6">
                        <button onclick="window.app.handleHelpfulFeedback()" class="flex-1 bg-navy text-white font-headline font-bold py-2 hover:bg-navy/90 border-2 border-navy transition">
                            This Helped! (Store Principle)
                        </button>
                        <button onclick="window.app.handleTryAnother()" class="flex-1 bg-transparent border-2 border-navy text-navy font-headline font-bold py-2 hover:bg-navy/5 transition">
                            Try Another
                        </button>
                    </div>
                </div>
            `;
            this.elements.results.insertAdjacentHTML('beforeend', html);

        } catch (error) {
            console.error('Display Solutions Error:', error);
            this.showError(`Display Error: ${error.message}`);
        }
    },

    /**
   * Show step progress indicator
   */
    showStepProgress(stepNumber, message) {
        const progressDiv = document.getElementById('step-progress');
        if (!progressDiv) return;

        progressDiv.innerHTML = `
      <div class="flex items-center gap-2 text-sm text-navy/70">
        <div class="animate-spin w-4 h-4 border-2 border-amber border-t-transparent rounded-full"></div>
        <span>Step ${stepNumber}/5: ${message}</span>
      </div>
    `;
    },

    /**
     * Display past fixes found
     */
    displayPastFixes(fixes) {
        if (!this.elements.results) return;

        if (fixes.length === 0) {
            this.elements.results.insertAdjacentHTML('beforeend', `
        <div class="mt-4 p-4 bg-navy/5 border-2 border-navy/10 rounded">
          <p class="text-navy/60 text-sm">No past fixes found for this error type.</p>
        </div>
      `);
            return;
        }

        const html = `
      <div class="mt-4 border-3 border-navy/20 p-6 bg-white animate-fade-in">
        <h3 class="font-headline font-bold text-navy text-xl mb-4 border-b-2 border-navy/10 pb-2">
          Step 2: Past Fixes (${fixes.length} found)
        </h3>
        <div class="space-y-2">
          ${fixes.slice(0, 3).map(fix => `
            <div class="bg-cream p-3 rounded border border-navy/10">
              <p class="font-mono text-sm text-navy">${fix.fix.solution}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
        this.elements.results.insertAdjacentHTML('beforeend', html);
    },

    /**
     * Display extracted principle
     */
    displayPrinciple(principle) {
        if (!this.elements.results) return;

        const html = `
      <div class="mt-4 border-3 border-amber bg-amber/10 p-6 animate-fade-in">
        <h3 class="font-headline font-bold text-navy text-xl mb-4">
          Step 3: Extracted Principle
        </h3>
        <p class="font-headline text-lg text-navy mb-2">${principle.principle}</p>
        <div class="flex gap-2 text-sm">
          <span class="bg-navy/10 px-2 py-1 rounded text-navy">
            Category: ${principle.category}
          </span>
          <span class="bg-green-100 px-2 py-1 rounded text-green-800">
            Confidence: ${Math.round(principle.confidence * 100)}%
          </span>
        </div>
      </div>
    `;
        this.elements.results.insertAdjacentHTML('beforeend', html);
    },

    /**
     * Show feedback buttons
     */
    showFeedbackButtons() {
        // Buttons are now integrated into Step 4 display (displaySolutions)
        // to maintain UI consistency and visual hierarchy.
    },

    /**
     * Display déjà vu alert when similar error found
     * @param {object} similarFix - Past fix that matches
     * @param {string} currentError - Current error message
     */
    displayDejavu(similarFix, currentError) {
        if (!this.elements.results || !similarFix) return;

        // Format date
        const fixDate = similarFix.timestamp?.toDate
            ? similarFix.timestamp.toDate().toLocaleDateString()
            : 'recently';

        const html = `
            <div class="mb-6 border-4 border-green-500 bg-green-50 p-6 animate-fade-in">
                <div class="flex items-start gap-3 mb-4">
                    <span class="text-3xl">⏪</span>
                    <div class="flex-1">
                        <h3 class="font-headline font-bold text-green-900 text-xl mb-2">DÉJÀ VU ALERT!</h3>
                        <p class="text-sm text-green-800 mb-4">
                            You fixed something similar on <strong>${fixDate}</strong>:
                        </p>
                        
                        <div class="bg-white border-2 border-green-300 p-4 rounded mb-4">
                            <p class="font-mono text-sm text-navy mb-3">"${similarFix.error.message}"</p>
                            
                            ${similarFix.fix?.solution ? `
                                <div class="border-t-2 border-green-200 pt-3">
                                    <p class="text-xs text-green-700 font-bold mb-2">✅ What worked for you then:</p>
                                    <p class="text-sm text-navy">${similarFix.fix.solution}</p>
                                </div>
                            ` : ''}
                            
                            ${similarFix.principle?.principle ? `
                                <div class="border-t-2 border-green-200 pt-3 mt-3">
                                    <p class="text-xs text-green-700 font-bold mb-2">💡 Your note to self:</p>
                                    <p class="text-sm italic text-navy">"${similarFix.principle.principle}"</p>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="flex gap-3">
                            <button 
                                onclick="window.app.handleUsePastFix()"
                                class="flex-1 bg-green-600 hover:bg-green-700 text-white font-headline font-bold py-3 px-4 border-3 border-green-700 transition">
                                ✅ Use This Fix
                            </button>
                            <button 
                                onclick="window.app.handleContinueAnalysis()"
                                class="flex-1 bg-white hover:bg-gray-50 text-navy font-headline font-bold py-3 px-4 border-3 border-navy/20 transition">
                                🔍 Different Approach
                            </button>
                        </div>
                    </div>
                </div>
                
                <p class="text-xs text-green-700 italic mt-4">
                    ${Math.round(similarFix.similarity * 100)}% similar to your past error - 
                    Theseus remembers what worked for YOU!
                </p>
            </div>
        `;

        this.elements.results.innerHTML = html;
    },

    /**
     * Display the past fix solution when user clicks "Use This Fix"
     * @param {object} pastFix - The fix to display
     */
    displayPastFixSolution(pastFix) {
        if (!this.elements.results) return;

        const html = `
            <div class="border-3 border-green-500 bg-white p-6 mb-6">
                <h3 class="font-headline font-bold text-navy text-xl mb-4">
                    ✅ Using Your Past Solution
                </h3>
                
                <div class="bg-green-50 border-2 border-green-300 p-4 rounded mb-4">
                    ${pastFix.fix?.solution ? `
                        <p class="text-sm text-navy mb-3"><strong>Solution:</strong></p>
                        <p class="text-sm text-navy mb-4">${pastFix.fix.solution}</p>
                    ` : ''}
                    
                    ${pastFix.principle?.principle ? `
                        <p class="text-sm text-navy mb-3"><strong>Remember:</strong></p>
                        <p class="text-sm italic text-navy">${pastFix.principle.principle}</p>
                    ` : ''}
                </div>
                
                <p class="text-xs text-green-700">
                    This solution worked for you before. Try it again!
                </p>
            </div>
        `;

        this.elements.results.insertAdjacentHTML('beforeend', html);
    },

    /**
     * Clear results area
     */
    clearResults() {
        if (this.elements.results) {
            this.elements.results.innerHTML = '';
        }
        const progressDiv = document.getElementById('step-progress');
        if (progressDiv) {
            progressDiv.innerHTML = '';
        }
    },

    clearInput() {
        if (this.elements.errorInput) {
            this.elements.errorInput.value = '';
        }
        // Fallback if ID differs
        const input = document.getElementById('error-input');
        if (input) input.value = '';
    }
};

// Export for usage in app.js
if (typeof window !== 'undefined') {
    window.ui = UI;
    window.UI = UI; // Compat
}
if (typeof module !== 'undefined') module.exports = { UI };

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        UI.init();
    });
}
