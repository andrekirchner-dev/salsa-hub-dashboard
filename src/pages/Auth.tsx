import { useState, useEffect } from "react";
import { signInWithRedirect, getRedirectResult, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/integrations/firebase/client";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Captura o resultado do redirect quando a página recarrega após OAuth
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) console.log("Redirect auth success:", result.user.email);
      })
      .catch((err: any) => {
        // Ignora erros esperados de "sem redirect pendente"
        const ignoredCodes = ["auth/no-current-user", "auth/null-user"];
        if (err.code && !ignoredCodes.includes(err.code)) {
          console.error("Redirect result error:", err.code, err.message);
          setError(`Erro (${err.code}): ${err.message}`);
        }
      });
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Tenta popup primeiro; se falhar (popup bloqueado), usa redirect
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Popup error:", err.code, err.message);
      if (
        err.code === "auth/popup-blocked" ||
        err.code === "auth/cancelled-popup-request" ||
        err.code === "auth/internal-error"
      ) {
        // Fallback para redirect
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: any) {
          setError(`Erro (${redirectErr.code}): ${redirectErr.message}`);
          setLoading(false);
        }
      } else if (err.code !== "auth/popup-closed-by-user") {
        setError(`Erro (${err.code}): ${err.message}`);
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/20 flex items-center justify-center mb-4">
            <span className="text-3xl font-black text-primary">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">SalsaHub</h1>
          <p className="text-sm text-muted-foreground">
            Dashboard interno da equipe
          </p>
        </div>

        {/* Login card */}
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-surface-mid hover:bg-surface-high border border-surface-high rounded-2xl h-12 font-semibold text-foreground transition-colors disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-muted-foreground/40 border-t-foreground rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? "Entrando..." : "Entrar com Google"}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Acesso restrito a membros da equipe SalsaHub.
          </p>
        </div>
      </div>
    </div>
  );
}
