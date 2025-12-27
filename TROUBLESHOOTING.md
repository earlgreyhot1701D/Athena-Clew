# Critical Fixes & Troubleshooting Guide

**Project:** Athena Clew Platform
**Date:** December 2025
**Context:** Firebase Web SDK v12.6.0 + Gemini 3 Flash Preview

This document records critical solutions for integrating Firebase Genkit/AI Logic with the new Gemini 3 models on the web.

## 1. Gemini 3 "Deep Thinking" Configuration

**Issue:** Enforcing the "thinking" budget for the Gemini 3 Hackathon.
**Symptom:** `400 Bad Request` or "Unknown argument 'thinking'" errors when using `budget_tokens`.

**Solution:**
The Firebase AI Logic Web SDK requires a specific nested structure for `thinkingConfig`. Note the camelCase property names:

```javascript
const model = getGenerativeModel(ai, {
    model: 'gemini-3-flash-preview',
    generationConfig: {
        thinkingConfig: {
            thinkingBudget: 5000, // ✅ Correct (NOT 'budget_tokens')
            includeThoughts: true // ✅ Correct (NOT 'include_thoughts')
        },
        temperature: 0.3,
        // ...
    }
});
```

## 2. Firestore Writes Hanging Indefinitely

**Issue:** `setDoc` or `addDoc` promises never resolve or reject.
**Symptom:** Application freezes on "Saving..." step, UI never updates.
**Cause:** `db.enablePersistence()` can corrupt the IndexedDB cache or cause locking issues in local development environments (especially with hot reloads or multiple tabs).

**Solution:**
Disable persistence and force "Online-Only" mode during development:

```javascript
const db = getFirestore(app);

// ❌ REMOVE THIS:
// db.enablePersistence();

// ✅ ADD THIS (Force Connectivity):
// Force network connection immediately to bypass local cache
import { enableNetwork } from "firebase/firestore";
enableNetwork(db).then(() => console.log('Network enabled'));
```

## 3. Firebase AI Initialization (403 Forbidden / API Key Empty)

**Issue:** Using `VertexAIBackend` fails with permission errors or "API Key empty" errors.
**Cause:** `VertexAIBackend` targets the enterprise Vertex AI API, which requires a Blaze (Pay-as-you-go) plan and specific IAM permissions. The Gemini Developer API (Free Tier) requires a different backend.

**Solution:** Use `GoogleAIBackend` to target the **Gemini Developer API**.

**Key Code:**
```javascript
// Import from the new firebase-ai.js (Modular SDK)
import { getAI, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-ai.js";

const ai = getAI(app, {
    backend: new GoogleAIBackend() // ✅ Critical for Free Tier / Developer API
});
```

## 4. SDK Version Mismatch & Import Paths

**Issue:** Conflicts between "Modular" SDKs (`firebase-ai.js`) and "Compat" SDKs (`firebase-app-compat.js`), or using deprecated AI SDKs.
**Solution:** 
1. Ensure ALL imports use the exact same version tag (e.g., `12.6.0`).
2. Use the correct `import` source for the new AI Logic SDK.

**Correct Import:**
`import ... from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-ai.js'`

**Incorrect/Deprecated:**
`firebase-vertexai-preview.js` (Do NOT use this for Gemini 3)
