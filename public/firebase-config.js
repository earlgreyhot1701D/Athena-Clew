/**
 * firebase-config.js
 * Single source of truth for Firebase initialization.
 */

const firebaseConfig = {
    apiKey: "AIzaSyB68nT63I2UZgmPcPfGyUpm1I9l_GQlB7Y",
    authDomain: "athena-clew.firebaseapp.com",
    projectId: "athena-clew",
    storageBucket: "athena-clew.firebasestorage.app",
    messagingSenderId: "675122416902",
    appId: "1:675122416902:web:a63859345ed0a355732287",
    measurementId: "G-YBVJ39KPY4"
};

// Expose for Modular SDK usage
window.REPO_CONFIG = firebaseConfig;

// Initialize Firebase
// Note: We expect 'firebase' to be available from the CDN imports in index.html
firebase.initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
const db = firebase.firestore();
// ⚠️ PERSISTENCE DISABLED TO FIX HANGING WRITES
// db.enablePersistence()... 
// We are forcing a clean, online-only state to resolve the timeouts.

// Force network online immediately
db.enableNetwork()
    .then(() => console.log('🌐 Firestore network enabled (Online-Only Mode)'))
    .catch(err => console.error('❌ Network enable failed:', err));

// Add connection state listener for debugging
// Connection health check removed to avoid permission errors
// db.collection('_health_check')...

// Export globally
window.db = db;
window.firebase = firebase;

console.log('✅ Firebase initialized');
