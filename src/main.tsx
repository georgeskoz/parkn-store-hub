import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const root = document.getElementById("root")!;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
  if (!SUPABASE_PUBLISHABLE_KEY) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");

  const errorMessage = `CRITICAL CONFIG ERROR: Missing ${missing.join(" and ")} environment variable${missing.length > 1 ? "s" : ""}. Please check your Vercel Project Settings.`;

  // eslint-disable-next-line no-console
  console.error(errorMessage);

  createRoot(root).render(
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      color: "#111827",
      background: "#f9fafb",
      textAlign: "center",
    }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#dc2626" }}>
        Configuration Error
      </h1>
      <p style={{ fontSize: "1rem", lineHeight: 1.6, maxWidth: "480px", margin: 0 }}>
        {errorMessage}
      </p>
    </div>
  );

  throw new Error(errorMessage);
}

createRoot(root).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
