import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const rawFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(rawFirebaseConfig).every(Boolean);

const firebaseConfig = {
  apiKey: rawFirebaseConfig.apiKey ?? "preview-api-key",
  authDomain: rawFirebaseConfig.authDomain ?? "preview.firebaseapp.com",
  projectId: rawFirebaseConfig.projectId ?? "preview-project",
  storageBucket: rawFirebaseConfig.storageBucket ?? "preview.appspot.com",
  messagingSenderId: rawFirebaseConfig.messagingSenderId ?? "000000000000",
  appId: rawFirebaseConfig.appId ?? "1:000000000000:web:preview",
};

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
