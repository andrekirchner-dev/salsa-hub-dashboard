import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ─── NOTA DE SEGURANÇA ────────────────────────────────────────────────────────
// O Firebase config (apiKey, projectId...) é PUBLIC BY DESIGN e pode aparecer
// no DevTools (F12). Isso é esperado e seguro — o apiKey do Firebase apenas
// identifica o projeto, NÃO concede acesso aos dados.
//
// A segurança real vem das Firestore Security Rules (firestore.rules) e das
// Firebase Storage Rules (storage.rules).
// Referência: https://firebase.google.com/docs/projects/api-keys
//
// ⚠️  NUNCA coloque em VITE_: service account JSON, tokens de admin,
//     chaves de API de terceiros (Stripe secret, SendGrid, etc.)
//     → Esses segredos devem ficar em Firebase Functions (server-side).
// ─────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Prevent re-initialization during HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection every time (best practice de segurança)
googleProvider.setCustomParameters({ prompt: "select_account" });

// Offline persistence — melhora UX em conexões lentas
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch(() => {
    // Falha esperada em modo privado do browser — sem problema
  });
}

export default app;
