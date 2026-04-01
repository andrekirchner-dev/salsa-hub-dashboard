import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/" },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150" />
            <img src="/parsley.png" alt="SalsaHub" className="relative w-full h-full object-contain drop-shadow-[0_0_20px_rgba(145,247,142,0.5)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{fontFamily:"Manrope, sans-serif"}}>
            <span className="text-foreground">Salsa</span><span className="text-primary">Hub</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 tracking-wide">Dashboard Interno</p>
        </div>
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-6 space-y-5">
          <p className="text-center text-sm text-muted-foreground">Acesse com sua conta Google para entrar no dashboard da equipe</p>
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-sm text-red-400 text-center">{error}</div>}
          <button onClick={handleGoogleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-4 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60 shadow-sm">
            {loading ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/> : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{loading ? "Entrando..." : "Entrar com Google"}</span>
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground px-4">Apenas contas autorizadas pela equipe SalsaHub podem acessar este dashboard.</p>
      </div>
    </div>
  );
}
