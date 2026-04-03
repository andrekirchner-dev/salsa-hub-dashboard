import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "@/integrations/firebase/client";

// ── Lazy pages ──────────────────────────────────────────────────────────────
const LoadingPage   = lazy(() => import("@/components/LoadingPage"));
const Auth          = lazy(() => import("@/pages/Auth"));
const SetupProfile  = lazy(() => import("@/pages/SetupProfile"));
const Layout        = lazy(() => import("@/components/layout/AppLayout").then(m => ({ default: m.AppLayout }))));
const Index         = lazy(() => import("@/pages/Index"));
const Products      = lazy(() => import("@/pages/Products"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const TaskPage      = lazy(() => import("@/pages/TaskPage"));
const Team          = lazy(() => import("@/pages/Team"));
const Library       = lazy(() => import("@/pages/Library"));
const Marketing     = lazy(() => import("@/pages/Marketing"));
const Calendar      = lazy(() => import("@/pages/Calendar"));
const NotFound      = lazy(() => import("@/pages/NotFound"));

// ── Profile state ────────────────────────────────────────────────────────────
interface ProfileState {
  complete: boolean;
  loading: boolean;
}

const App = () => {
  // undefined = initial load, null = not logged in, User = logged in
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<ProfileState>({ complete: false, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Check if profile is complete in Firestore
        const profileDoc = await getDoc(doc(db, "profiles", firebaseUser.uid));
        const data = profileDoc.data();
        const complete = !!(data?.name && data?.role && data?.cargoCode);
        setProfile({ complete, loading: false });
      } else {
        setProfile({ complete: false, loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  // Still determining auth state
  if (user === undefined || (user && profile.loading)) {
    return (
      <Suspense fallback={null}>
        <LoadingPage />
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Routes>
          {/* Public auth route */}
          <Route
            path="/auth"
            element={
              user ? <Navigate to="/" replace /> : <Auth />
            }
          />

          {/* Profile setup (authenticated but no profile) */}
          <Route
            path="/setup"
            element={
              !user ? (
                <Navigate to="/auth" replace />
              ) : profile.complete ? (
                <Navigate to="/" replace />
              ) : (
                <SetupProfile
                  user={user}
                  onComplete={() => setProfile({ complete: true, loading: false })}
                />
              )
            }
          />

          {/* Protected app routes */}
          {!user ? (
            <Route path="*" element={<Navigate to="/auth" replace />} />
          ) : !profile.complete ? (
            <Route path="*" element={<Navigate to="/setup" replace />} />
          ) : (
            <Route element={<Layout />}>
              <Route path="/"                           element={<Index />} />
              <Route path="/products"                   element={<Products />} />
              <Route path="/products/:id"               element={<ProductDetail />} />
              <Route path="/products/:id/tasks/:taskId" element={<TaskPage />} />
              <Route path="/team"                       element={<Team />} />
              <Route path="/library"                    element={<Library />} />
              <Route path="/marketing"                  element={<Marketing />} />
              <Route path="/calendar"                   element={<Calendar />} />
              <Route path="*"                           element={<NotFound />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
