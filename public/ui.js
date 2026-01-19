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
        resultsArea: null,
        analyticsResults: null
    },

    state: {
        isLoading: false
    },

    init() {
        this.elements.errorInput = document.getElementById('error-input');
        this.elements.getHelpBtn = document.getElementById('get-help-btn');
        this.elements.results = document.getElementById('results');
        this.elements.demoForm = document.getElementById('theseus-demo');
        this.elements.analyticsResults = document.getElementById('analytics-results');
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
     * Display déjà vu alert with supportive, educational tone
     * @param {object} similarFix - Past fix that matches
     * @param {string} currentError - Current error message
     */
    displayDejavu(similarFix, currentError) {
        if (!this.elements.results || !similarFix) return;

        // Format date
        const fixDate = similarFix.timestamp?.toDate
            ? similarFix.timestamp.toDate().toLocaleDateString()
            : 'recently';

        // Cross-project messaging
        const projectContext = similarFix.isCrossProject
            ? `in your "${similarFix.fromProjectName}" project`
            : 'in this project';

        const crossProjectInsight = similarFix.isCrossProject && similarFix.totalSimilarAcrossProjects > 1
            ? `<div class="bg-blue-50 border-2 border-blue-300 p-3 rounded mt-3">
                 <p class="text-xs text-blue-700 font-bold mb-1">🎯 Cross-Project Learning:</p>
                 <p class="text-sm text-blue-800">
                    You've worked through this challenge in ${similarFix.totalSimilarAcrossProjects} different projects.
                    You're building transferable expertise!
                 </p>
               </div>`
            : '';

        const html = `
            <div class="mb-6 border-4 border-purple-500 bg-purple-50 p-6 animate-fade-in shadow-craft">
                <div class="flex items-start gap-3 mb-4">
                    <span class="text-3xl">🔮</span>
                    <div class="flex-1">
                        <h3 class="font-headline font-bold text-purple-900 text-xl mb-2">✨ DÉJÀ VU!</h3>
                        <p class="text-sm text-purple-900 mb-4">
                            You worked through this ${projectContext} on <strong>${fixDate}</strong>:
                        </p>
                        
                        <div class="bg-white border-2 border-purple-300 p-4 rounded mb-4">
                            <p class="font-mono text-sm text-navy mb-3">"${similarFix.error.message}"</p>
                            
                            ${similarFix.fix?.solution ? `
                                <div class="border-t-2 border-purple-200 pt-3">
                                    <p class="text-xs text-purple-700 font-bold mb-2">✅ What worked:</p>
                                    <p class="text-sm text-navy">${similarFix.fix.solution}</p>
                                </div>
                            ` : ''}
                            
                            ${similarFix.principle?.principle ? `
                                <div class="border-t-2 border-purple-200 pt-3 mt-3">
                                    <p class="text-xs text-purple-700 font-bold mb-2">💡 What you learned:</p>
                                    <p class="text-sm italic text-navy">"${similarFix.principle.principle}"</p>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${crossProjectInsight}
                        
                        <div class="flex gap-3 mt-4">
                            <button 
                                id="btn-apply-fix"
                                class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-headline font-bold py-3 px-4 border-3 border-purple-700 transition shadow-sm">
                                ✅ Apply This Solution
                            </button>
                            <button 
                                id="btn-try-another"
                                class="flex-1 bg-white hover:bg-gray-50 text-navy font-headline font-bold py-3 px-4 border-3 border-navy/20 transition">
                                🔍 Try a Different Approach
                            </button>
                        </div>
                    </div>
                </div>
                
                <p class="text-xs text-purple-800 italic mt-4">
                    ${Math.round(similarFix.similarity * 100)}% similar - 
                    Theseus remembers your solutions and helps you apply them again!
                </p>
            </div>
        `;

        this.elements.results.innerHTML = html;

        // Attach event listeners via JS (More robust than inline onclick)
        const applyBtn = document.getElementById('btn-apply-fix');
        console.log('🔍 Trace: Looking for apply button:', applyBtn);

        if (applyBtn) {
            applyBtn.onclick = () => {
                console.log('🔘 BUTTON CLICKED (via Listener)');
                if (window.app && window.app.handleUsePastFix) {
                    window.app.handleUsePastFix();
                } else {
                    console.error('❌ window.app.handleUsePastFix not found');
                }
            };
        } else {
            console.error('❌ Trace: Apply button NOT found in DOM!');
        }

        const tryBtn = document.getElementById('btn-try-another');
        if (tryBtn) {
            tryBtn.onclick = () => {
                if (window.app && window.app.handleContinueAnalysis) {
                    window.app.handleContinueAnalysis();
                }
            };
        }
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
    },

    /**
     * Display analytics stats cards
     * @param {object} stats - Aggregate statistics
     */
    displayAnalyticsStats(stats) {
        // Target analytics container if available for new layout, else fallback
        const container = this.elements.analyticsResults || this.elements.results;
        if (!container) return;

        if (!stats) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-navy/60 text-lg mb-4">No debugging data yet</p>
                    <p class="text-sm text-navy/50">Start debugging to see your analytics!</p>
                </div>
            `;
            return;
        }

        const html = `
            <div class="mb-8">
                <h2 class="font-headline font-bold text-navy text-2xl mb-6 uppercase">
                    📊 Your Learning Journey
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <!-- Stat Card 1: Sessions -->
                    <div class="bg-white border-3 border-navy/20 p-6 shadow-craft">
                        <div class="text-4xl font-headline font-black text-amber mb-2">
                            ${stats.totalSessions}
                        </div>
                        <div class="text-sm text-navy/70 uppercase font-headline">
                            Debugging Sessions Completed
                        </div>
                    </div>
                    
                    <!-- Stat Card 2: Principles -->
                    <div class="bg-white border-3 border-navy/20 p-6 shadow-craft">
                        <div class="text-4xl font-headline font-black text-green-600 mb-2">
                            ${stats.totalPrinciples}
                        </div>
                        <div class="text-sm text-navy/70 uppercase font-headline">
                            Principles Learned
                        </div>
                    </div>
                    
                    <!-- Stat Card 3: Success Rate -->
                    <div class="bg-white border-3 border-navy/20 p-6 shadow-craft">
                        <div class="text-4xl font-headline font-black text-blue-600 mb-2">
                            ${stats.successRate}%
                        </div>
                        <div class="text-sm text-navy/70 uppercase font-headline">
                            Solution Success Rate
                        </div>
                    </div>
                </div>
                
                <div class="bg-green-50 border-2 border-green-300 p-4 rounded mb-8">
                    <p class="text-sm text-green-800">
                        <span class="font-bold">🎯 Growth Insight:</span> 
                        You've completed ${stats.totalSessions} debugging sessions across 
                        ${stats.totalProjects} project${stats.totalProjects !== 1 ? 's' : ''}.
                        You're building real expertise!
                    </p>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Display error type breakdown with CSS bars
     * @param {Array} breakdown - Error types with percentages
     */
    displayErrorBreakdown(breakdown) {
        const container = this.elements.analyticsResults || this.elements.results;
        if (!container || !breakdown || breakdown.length === 0) {
            return;
        }

        // Color mapping for error types
        const colorMap = {
            'dependency': 'bg-red-500',
            'async': 'bg-blue-500',
            'logic': 'bg-yellow-500',
            'syntax': 'bg-purple-500',
            'unknown': 'bg-gray-500'
        };

        const barsHtml = breakdown.map(item => {
            const color = colorMap[item.type] || 'bg-gray-500';

            return `
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-headline font-bold text-navy uppercase">
                            ${item.type}
                        </span>
                        <span class="text-xs text-navy/60">
                            ${item.count} session${item.count !== 1 ? 's' : ''} (${item.percentage}%)
                        </span>
                    </div>
                    <div class="w-full bg-navy/10 h-6 rounded overflow-hidden">
                        <div class="${color} h-full transition-all duration-500" 
                             style="width: ${item.percentage}%">
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const html = `
            <div class="border-3 border-navy/20 bg-white p-6 mb-8">
                <h3 class="font-headline font-bold text-navy text-xl mb-4 uppercase">
                    Practice Areas
                </h3>
                <p class="text-sm text-navy/60 mb-6">
                    Your debugging practice breakdown by challenge type
                </p>
                ${barsHtml}
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    },

    /**
     * Display cross-project statistics
     * @param {Array} projectStats - Per-project data
     */
    displayCrossProjectStats(projectStats) {
        const container = this.elements.analyticsResults || this.elements.results;
        if (!container || !projectStats || projectStats.length === 0) {
            return;
        }

        const projectsHtml = projectStats.map(proj => `
            <div class="bg-navy/5 border-2 border-navy/10 p-4 rounded mb-3">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-headline font-bold text-navy">
                        ${proj.projectName}
                    </h4>
                    <span class="text-xs bg-amber/20 text-amber-900 px-2 py-1 rounded border border-amber-300">
                        ${proj.sessionCount} sessions
                    </span>
                </div>
                <p class="text-sm text-navy/60">
                    Primary focus: <span class="font-bold">${proj.topErrorType}</span> 
                    (${proj.topErrorPercentage}%)
                </p>
            </div>
        `).join('');

        const html = `
            <div class="border-3 border-navy/20 bg-white p-6 mb-8">
                <h3 class="font-headline font-bold text-navy text-xl mb-4 uppercase">
                    Cross-Project Learning
                </h3>
                <p class="text-sm text-navy/60 mb-6">
                    You're applying lessons across ${projectStats.length} project${projectStats.length !== 1 ? 's' : ''}
                </p>
                ${projectsHtml}
                
                ${projectStats.length > 1 ? `
                    <div class="bg-blue-50 border-2 border-blue-300 p-4 rounded mt-4">
                        <p class="text-sm text-blue-800">
                            <span class="font-bold">💡 Transferable Skills:</span>
                            You're building expertise that applies across different projects.
                            This is real learning in action!
                        </p>
                    </div>
                ` : ''}
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    },

    /**
     * Display knowledge base table
     * @param {Array} knowledge - Principles with metrics
     */
    displayKnowledgeBase(knowledge) {
        const container = this.elements.analyticsResults || this.elements.results;
        if (!container || !knowledge || knowledge.length === 0) {
            return;
        }

        // Top 10 by success rate
        const topKnowledge = knowledge.slice(0, 10);

        const rowsHtml = topKnowledge.map(item => `
            <tr class="border-b border-navy/10 hover:bg-navy/5">
                <td class="py-3 px-4 text-sm text-navy">
                    ${item.principle}
                </td>
                <td class="py-3 px-4 text-center">
                    <span class="inline-block px-2 py-1 rounded text-xs font-bold
                        ${item.successRate >= 80 ? 'bg-green-100 text-green-800' :
                item.successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'}">
                        ${item.successRate}%
                    </span>
                </td>
                <td class="py-3 px-4 text-center text-sm text-navy/60">
                    ${item.appliedCount}
                </td>
                <td class="py-3 px-4 text-xs text-navy/50">
                    ${item.fromProject}
                </td>
            </tr>
        `).join('');

        const html = `
            <div class="border-3 border-navy/20 bg-white p-6 mb-8">
                <h3 class="font-headline font-bold text-navy text-xl mb-4 uppercase">
                    Your Knowledge Base
                </h3>
                <p class="text-sm text-navy/60 mb-6">
                    Top ${topKnowledge.length} principles by success rate
                </p>
                
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b-2 border-navy/20 bg-navy/5">
                                <th class="py-2 px-4 text-left text-xs font-headline font-bold text-navy uppercase">
                                    Principle
                                </th>
                                <th class="py-2 px-4 text-center text-xs font-headline font-bold text-navy uppercase">
                                    Success
                                </th>
                                <th class="py-2 px-4 text-center text-xs font-headline font-bold text-navy uppercase">
                                    Uses
                                </th>
                                <th class="py-2 px-4 text-left text-xs font-headline font-bold text-navy uppercase">
                                    Project
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    },
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
