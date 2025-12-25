/**
 * session.js
 * Handles session generation, persistence, and validation.
 */

const SESSION_KEY = 'athena_session_id';
const SESSION_DURATION_DAYS = 30;

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = {
        getOrCreateSession,
        isSessionValid,
        SESSION_KEY
    };
}

/**
 * Retrieves the existing session ID or creates a new one.
 * Syncs with Firestore.
 * @returns {Promise<string>} The session ID.
 */
async function getOrCreateSession() {
    let sessionId = localStorage.getItem(SESSION_KEY);

    if (!sessionId) {
        sessionId = generateUUID();
        localStorage.setItem(SESSION_KEY, sessionId);
        await syncSessionToFirestore(sessionId, true);
    } else {
        // Update last active
        await syncSessionToFirestore(sessionId, false);
    }

    return sessionId;
}

/**
 * Checks if a session is valid (exists in Firestore).
 * @param {string} sessionId 
 * @returns {Promise<boolean>}
 */
async function isSessionValid(sessionId) {
    if (!sessionId) return false;

    // In a real app with Firebase SDK:
    // const docRef = db.collection('sessions').doc(sessionId);
    // const doc = await docRef.get();
    // return doc.exists;

    // For now, we assume if we have it, it's valid or we re-create.
    // In production we would allow checking against DB.
    // Because we are using "Vanilla JS" and might not have `db` global in tests,
    // we perform a check.

    if (typeof window !== 'undefined' && window.db) {
        try {
            const doc = await window.db.collection('sessions').doc(sessionId).get();
            return doc.exists;
        } catch (e) {
            console.error("Firestore check failed", e);
            return false;
        }
    }

    return true; // Fallback for offline/local
}

/**
 * Syncs session data to Firestore.
 * @param {string} sessionId 
 * @param {boolean} isNew 
 */
async function syncSessionToFirestore(sessionId, isNew) {
    if (typeof window === 'undefined' || !window.db) {
        console.warn('Firestore not initialized, skipping sync.');
        return;
    }

    const timestamp = new Date(); // Firebase will use serverTimestamp technically
    try {
        const sessionRef = window.db.collection('sessions').doc(sessionId);
        if (isNew) {
            await sessionRef.set({
                createdAt: timestamp,
                lastActive: timestamp,
                deviceFingerprint: navigator.userAgent
            });
        } else {
            await sessionRef.update({
                lastActive: timestamp
            });
        }
    } catch (error) {
        console.error("Failed to sync session to Firestore:", error);
    }
}

function generateUUID() {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
