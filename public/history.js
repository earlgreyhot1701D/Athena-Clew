/**
 * history.js
 * Handles fetching and rendering of past debugging sessions.
 */

window.HistoryView = {
    async init(sessionId, projectId) {
        console.log('✅ HistoryView initialized');
        // Initial render if we have data
        if (sessionId && projectId) {
            // We don't auto-load here to save reads, app.js handles load on tab switch
        }
    },

    async render(sessionId, projectId) {
        const container = document.getElementById('history-list');
        const emptyState = document.getElementById('history-empty');

        if (!container || !emptyState) return;

        // Clear current content
        container.innerHTML = '<div class="text-center py-8 text-navy/50 animate-pulse">Loading history...</div>';
        emptyState.classList.add('hidden');

        if (!sessionId || !projectId) {
            container.innerHTML = '<div class="text-center py-8 text-red-500">Please select a project to view history.</div>';
            return;
        }

        try {
            const fixes = await window.FirestoreOps.getAllFixesForProject(sessionId, projectId);

            if (fixes.length === 0) {
                container.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }

            container.innerHTML = fixes.map(fix => this.renderFixCard(fix)).join('');

        } catch (error) {
            console.error('History render failed:', error);
            container.innerHTML = `<div class="text-center py-8 text-red-500">Failed to load history: ${error.message}</div>`;
        }
    },

    renderFixCard(fix) {
        const timestamp = fix.timestamp?.toDate ? fix.timestamp.toDate() : new Date(fix.timestamp || Date.now());
        const dateStr = timestamp.toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const timeStr = timestamp.toLocaleTimeString(undefined, {
            hour: '2-digit', minute: '2-digit'
        });

        // Truncate error message
        const rawError = fix.error?.message || 'Unknown Error';
        const errorMsg = rawError.length > 80 ? rawError.substring(0, 80) + '...' : rawError;

        // Determine type badge color
        const type = fix.analysis?.classification || 'Unknown';
        let badgeClass = 'bg-navy/10 text-navy';
        if (type.includes('Syntax')) badgeClass = 'bg-red-100 text-red-800';
        else if (type.includes('Logic')) badgeClass = 'bg-amber-100 text-amber-900';
        else if (type.includes('Dependency')) badgeClass = 'bg-blue-100 text-blue-900';

        return `
            <div class="bg-white border-3 border-navy/10 p-6 rounded shadow-craft hover:border-amber/50 transition">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-xs font-bold uppercase tracking-wider ${badgeClass} px-2 py-1 rounded">
                        ${type}
                    </span>
                    <span class="text-xs text-navy/40 font-mono">
                        ${dateStr} • ${timeStr}
                    </span>
                </div>
                
                <h4 class="font-mono text-sm text-red-600 mb-4 bg-red-50 p-2 rounded border border-red-100 break-all">
                    ${errorMsg}
                </h4>

                <div class="space-y-3">
                    ${fix.fix?.solution ? `
                        <div>
                            <span class="text-xs font-bold text-navy uppercase block mb-1">Solution</span>
                            <p class="text-sm text-navy/80 leading-relaxed font-mono bg-navy/5 p-2 rounded">
                                ${fix.fix.solution}
                            </p>
                        </div>
                    ` : ''}

                    ${fix.principle?.principle ? `
                        <div>
                            <span class="text-xs font-bold text-amber uppercase block mb-1">Learned Principle</span>
                            <p class="text-sm text-navy/70 italic">
                                "${fix.principle.principle}"
                            </p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
};
