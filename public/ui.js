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
            this.elements.results.innerHTML = html;

        } catch (error) {
            console.error('Display Analysis Error:', error);
            this.showError(`Display Error: ${error.message}`);
        }
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
              <span class="text-xs text-navy/50">
                Success rate: ${Math.round((fix.successRate || 0.5) * 100)}%
              </span>
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
