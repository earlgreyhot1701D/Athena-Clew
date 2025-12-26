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
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistence not supported');
        }
    });

// Force network online after persistence attempt
// (Prevents getting stuck in offline mode)
setTimeout(() => {
    db.enableNetwork()
        .then(() => console.log('🌐 Firestore network force-enabled'))
        .catch(err => {
            console.warn('⚠️ Network enable failed:', err);
            // Fallback: create new instance
            window.db = firebase.firestore();
            console.log('🔄 Created fresh Firestore instance');
        });
}, 1000);

// Add connection state listener for debugging
db.collection('_health_check').doc('ping').onSnapshot(
    () => console.log('✅ Firestore connection active'),
    (err) => console.error('❌ Firestore connection error:', err)
);

// Export globally
window.db = db;
window.firebase = firebase;

console.log('✅ Firebase initialized');
