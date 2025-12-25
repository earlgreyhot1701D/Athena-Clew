/**
 * ui.js
 * Handles DOM manipulation and user feedback.
 */

const UI = {
    elements: {
        errorInput: null,
        getHelpBtn: null,
        results: null,
        demoForm: null,
        resultsArea: null // Added for container
    },

    init() {
        this.elements.errorInput = document.getElementById('error-input');
        this.elements.getHelpBtn = document.getElementById('get-help-btn');
        this.elements.results = document.getElementById('results'); // Need to add this to HTML
        this.elements.demoForm = document.getElementById('theseus-demo');

        // Create results container if it doesn't exist (it wasn't in the mockup explicitly but logic needs it)
        // The mockup has <div id="results"></div> in 06_ARCHITECTURE.md but not in the USER_REQUEST mockup.
        // I will add it to index.html and reference it here.
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
        // Simple toast implementation
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

    displayAnalysis(analysis) {
        if (!this.elements.results) return;

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
    },

    displaySolutions(solutions) {
        if (!this.elements.results) return;

        let solutionsHtml = solutions.map((sol, index) => `
            <div class="bg-cream border-2 border-navy/20 p-4 mb-3 rounded hover:border-amber transition cursor-pointer">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-headline font-bold text-navy">#${index + 1}</span>
                    <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-300 font-bold">${Math.round(sol.confidence * 100)}% Conf</span>
                </div>
                <p class="font-mono text-sm text-navy mb-2">${sol.solution}</p>
                <div class="text-xs text-navy/50">Source: ${sol.source}</div>
            </div>
        `).join('');

        const html = `
            <div class="mt-4 border-3 border-amber bg-amber/5 p-6 animate-fade-in">
                <h3 class="font-headline font-bold text-navy text-xl mb-4">Step 4: Ranked Solutions</h3>
                ${solutionsHtml}
                <div class="mt-4 flex gap-2">
                    <button class="flex-1 bg-navy text-white font-headline font-bold py-2 hover:bg-navy/90 border-2 border-navy">
                        This Helped! (Store Principle)
                    </button>
                    <button class="flex-1 bg-transparent border-2 border-navy text-navy font-headline font-bold py-2 hover:bg-navy/5">
                        Try Another
                    </button>
                </div>
            </div>
        `;
        this.elements.results.insertAdjacentHTML('beforeend', html);
    },

    clearInput() {
        if (this.elements.errorInput) this.elements.errorInput.value = '';
    }
};

// Export for usage in app.js
window.ui = UI;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
