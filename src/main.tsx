import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: "https://a16d316791f5e8466baaaf8d83a61563@o4511197207068672.ingest.us.sentry.io/4511197297246208",

  // Captura erros em produção e staging; desabilita em desenvolvimento local
  // para não poluir o painel com erros de dev
  enabled: import.meta.env.PROD,

  // Rastreamento de performance: 10% das sessões em produção
  // (suficiente para detectar lentidão sem estourar a cota grátis)
  tracesSampleRate: 0.1,

  // Replay de sessão: grava 5% das sessões normais, 100% das com erro
  // Assim você vê exatamente o que o usuário estava fazendo quando o erro aconteceu
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Oculta automaticamente campos de senha e dados sensíveis nas gravações
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],

  // Ignora erros irrelevantes que poluem o painel
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error exception captured",
    "Network request failed",
    /firebase.*permission-denied/i,
  ],
});

createRoot(document.getElementById("root")!).render(<App />);
