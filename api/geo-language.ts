// Vercel Edge Function — framework-agnostic, works for this plain Vite SPA
// the same way it would for any project (no Next.js dependency). Reads the
// geo headers Vercel already injects for free on every request; no
// third-party IP-geolocation API or key involved.
//
// Called once client-side on first visit (see src/i18n/index.ts) when no
// language has been explicitly chosen yet. Quebec specifically defaults to
// French; everywhere else (including the rest of Canada) defaults to
// English — a manual language pick always takes priority over this.
export const config = { runtime: "edge" };

const QUEBEC_REGION = "QC";

export default function handler(request: Request): Response {
  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers.get("x-vercel-ip-country-region");
  const language = country === "CA" && region === QUEBEC_REGION ? "fr" : "en";

  return new Response(JSON.stringify({ language }), {
    headers: {
      "content-type": "application/json",
      // Per-visitor geo result — never cache across visitors/edges.
      "cache-control": "private, max-age=0, no-store",
    },
  });
}
