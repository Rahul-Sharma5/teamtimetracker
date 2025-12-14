
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG
// If using Vite, you typically use import.meta.env.VITE_FIREBASE_...

// Cast import.meta to any to fix Property 'env' does not exist on type 'ImportMeta' error
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBj_sM5wD_VH1-6Ob_gM6q6m5Y6Oe5AG-E",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "teamtime-tracker-1f0ee.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "teamtime-tracker-1f0ee",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "teamtime-tracker-1f0ee.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "943382371260",
  appId: env.VITE_FIREBASE_APP_ID || "1:943382371260:web:329600678c2e88928369b9",
  measurementId: "G-M7YMS0RVB5"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with explicit persistent cache settings
// This helps resolve 'BloomFilter error' warnings and ensures robust offline support across tabs
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
