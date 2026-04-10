import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Sentry: faz upload dos source maps após cada build de produção.
    // Isso permite que o painel do Sentry mostre o código TypeScript original
    // em vez do bundle minificado — facilita muito o debug.
    // O plugin só ativa em produção (quando SENTRY_AUTH_TOKEN estiver definido).
    mode === "production" && sentryVitePlugin({
      org: "salsahub",
      project: "javascript-react",
      // Auth token configurado via variável de ambiente (não commitado no repo)
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ].filter(Boolean),
  build: {
    // Source maps necessários para o Sentry mapear erros ao código original
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
