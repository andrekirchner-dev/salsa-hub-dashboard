import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKYXYOaU0O9osz_ZgcAnDUpjmWbICwlF8",
  authDomain: "salsa-hub-dashboard-db6b6.firebaseapp.com",
  projectId: "salsa-hub-dashboard-db6b6",
  storageBucket: "salsa-hub-dashboard-db6b6.firebasestorage.app",
  messagingSenderId: "1011069420224",
  appId: "1:1011069420224:web:ce5be3eb3355826f23e325",
};

export const firebaseConfigured = true;

// Prevent re-initialization during HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection every time (security best practice)
googleProvider.setCustomParameters({ prompt: "select_account" });

// Offline persistence (optional — improves UX on slow connections)
if (typeof window !== "undefined" && firebaseConfigured) {
  enableIndexedDbPersistence(db).catch(() => {
    // Persistence may fail in private browsing mode — that's OK
  });
}

export default app;
