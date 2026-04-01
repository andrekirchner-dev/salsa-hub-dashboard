import { useState, useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import LoadingPage from "@/components/LoadingPage";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Chat = lazy(() => import("./pages/Chat"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const Team = lazy(() => import("./pages/Team"));
const Library = lazy(() => import("./pages/Library"));
const TaskPage = lazy(() => import("./pages/TaskPage"));
const Auth = lazy(() => import("./pages/Auth"));
const SetupProfile = lazy(() => import("./pages/SetupProfile"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 300000, retry: 1, refetchOnWindowFocus: false } },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex gap-1.5">
        {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{animationDelay:i*150+"ms"}}/>)}
      </div>
    </div>
  );
}

function AppRouter({ user }: { user: User | null }) {
  const [ps, setPs] = useState({ loading: true, complete: false });
  useEffect(() => {
    if (!user) { setPs({ loading: false, complete: false }); return; }
    supabase.from("profiles").select("name,phone,cargo_code").eq("id",user.id).maybeSingle()
      .then(({ data }) => setPs({ loading: false, complete: !!(data?.name&&data?.phone&&data?.cargo_code) }));
  }, [user]);
  if (!user) return (<BrowserRouter><Suspense fallback={<PageLoader/>}><Routes><Route path="/auth" element={<Auth/>}/><Route path="*" element={<Navigate to="/auth" replace/>}/></Routes></Suspense></BrowserRouter>);
  if (ps.loading) return <PageLoader/>;
  if (!ps.complete) return (<BrowserRouter><Suspense fallback={<PageLoader/>}><Routes><Route path="/setup" element={<SetupProfile user={user} onComplete={()=>setPs({loading:false,complete:true})}/>}/><Route path="*" element={<Navigate to="/setup" replace/>}/></Routes></Suspense></BrowserRouter>);
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader/>}>
        <Routes>
          <Route path="/admin" element={<AdminPanel/>}/>
          <Route path="/auth" element={<Navigate to="/" replace/>}/>
          <Route element={<AppLayout/>}>
            <Route path="/" element={<Index/>}/>
            <Route path="/products" element={<Products/>}/>
            <Route path="/products/:id" element={<ProductDetail/>}/>
            <Route path="/products/:id/tasks/:taskId" element={<TaskPage/>}/>
            <Route path="/marketing" element={<Marketing/>}/>
            <Route path="/calendar" element={<Calendar/>}/>
            <Route path="/contacts" element={<Contacts/>}/>
            <Route path="/chat" element={<Chat/>}/>
            <Route path="/notifications" element={<Notifications/>}/>
            <Route path="/profile" element={<Profile/>}/>
            <Route path="/team" element={<Team/>}/>
            <Route path="/library" element={<Library/>}/>
          </Route>
          <Route path="*" element={<NotFound/>}/>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const App = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User|null|undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user??null));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user??null));
    return ()=>subscription.unsubscribe();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster/><Sonner/>
        {loading||user===undefined?<LoadingPage onDone={()=>setLoading(false)}/>:<AppRouter user={user}/>}
      </TooltipProvider>
    </QueryClientProvider>
  );
};
export default App;
