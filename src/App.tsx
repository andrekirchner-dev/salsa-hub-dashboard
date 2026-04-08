import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "@/integrations/firebase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";

// ── Lazy pages ────────────────────────────────────────────────────────────────
const LoadingPage   = lazy(() => import("@/components/LoadingPage"));
const Auth          = lazy(() => import("@/pages/Auth"));
const SetupProfile  = lazy(() => import("@/pages/SetupProfile"));
const Index         = lazy(() => import("@/pages/Index"));
const Products      = lazy(() => import("@/pages/Products"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const TaskPage      = lazy(() => import("@/pages/TaskPage"));
const Team          = lazy(() => import("@/pages/Team"));
const Library       = lazy(() => import("@/pages/Library"));
const Marketing     = lazy(() => import("@/pages/Marketing"));
const Calendar      = lazy(() => import("@/pages/Calendar"));
const Chat          = lazy(() => import("@/pages/Chat"));
const Contacts      = lazy(() => import("@/pages/Contacts"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Profile       = lazy(() => import("@/pages/Profile"));
const AdminPanel          = lazy(() => import("@/pages/AdminPanel"));
const TasksManagementPage = lazy(() => import("@/pages/TasksManagementPage"));
const NotFound            = lazy(() => import("@/pages/NotFound"));

import { AppLayout } from "@/components/layout/AppLayout";

// ── Profile state ─────────────────────────────────────────────────────────────
interface ProfileState {
  complete: boolean;
  loading: boolean;
}

const queryClient = new QueryClient();

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
        const complete = !!(data?.name && data?.role);
        setProfile({ complete, loading: false });

        // Backfill username for existing users who don't have one yet
        if (complete && data?.name && !data?.username) {
          const username = data.name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._]/g, "");
          try {
            await updateDoc(doc(db, "profiles", firebaseUser.uid), { username });
          } catch { /* non-critical, ignore */ }
        }

        // ── Check for pending invites by email ───────────────────────────────
        if (complete && firebaseUser.email) {
          try {
            const invitesSnap = await getDocs(
              query(
                collection(db, "invites"),
                where("inviteeEmail", "==", firebaseUser.email.toLowerCase()),
                where("status", "==", "pending"),
              )
            );
            if (!invitesSnap.empty) {
              const invite = invitesSnap.docs[0].data();
              toast({
                title: "Convite de equipe recebido! 🎉",
                description: `${invite.inviterName} te adicionou à equipe "${invite.teamName}" como ${invite.role}. Acesse Equipe para ver.`,
              });
              // Auto-write notification
              await addDoc(collection(db, "users", firebaseUser.uid, "notifications"), {
                type: "team",
                title: "Convite de equipe recebido!",
                description: `${invite.inviterName} te convidou para a equipe "${invite.teamName}" como ${invite.role}.`,
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          } catch {
            // Silently fail — invites are optional
          }
        }
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              {/* Public auth route */}
              <Route
                path="/auth"
                element={user ? <Navigate to="/" replace /> : <Auth />}
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
                <Route element={<AppLayout />}>
                  <Route path="/"                           element={<Index />} />
                  <Route path="/products"                   element={<Products />} />
                  <Route path="/products/:id"               element={<ProductDetail />} />
                  <Route path="/products/:id/tasks/:taskId" element={<TaskPage />} />
                  <Route path="/team"                       element={<Team />} />
                  <Route path="/library"                    element={<Library />} />
                  <Route path="/marketing"                  element={<Marketing />} />
                  <Route path="/calendar"                   element={<Calendar />} />
                  <Route path="/chat"                       element={<Chat />} />
                  <Route path="/contacts"                   element={<Contacts />} />
                  <Route path="/notifications"              element={<Notifications />} />
                  <Route path="/profile"                    element={<Profile />} />
                  <Route path="/tasks"                       element={<TasksManagementPage />} />
                  <Route path="/admin"                      element={<AdminPanel />} />
                  <Route path="*"                           element={<NotFound />} />
                </Route>
              )}
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
