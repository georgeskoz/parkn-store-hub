// Vercel Edge Function — cheap, per-visitor geo lookup (same headers as
// api/geo-language.ts), used by the hero map to find the visitor's city.
// Deliberately separate from api/hero-map.ts: this one is always
// no-store/fast, the actual image fetch+cache happens in a second request
// only if this one resolves to something usable.
export const config = { runtime: "edge" };

function parseCoord(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export default function handler(request: Request): Response {
  const rawCity = request.headers.get("x-vercel-ip-city");
  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers.get("x-vercel-ip-country-region");
  const lat = parseCoord(request.headers.get("x-vercel-ip-latitude"));
  const lng = parseCoord(request.headers.get("x-vercel-ip-longitude"));

  // The city header comes URL-encoded (e.g. "Qu%C3%A9bec") — decode
  // defensively rather than trust it's well-formed.
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = null;
    }
  }

  const usable = Boolean(city && country && lat !== null && lng !== null);

  return new Response(
    JSON.stringify(usable ? { city, country, region, lat, lng } : { city: null }),
    {
      headers: {
        "content-type": "application/json",
        // Per-visitor result — never cache across visitors/edges.
        "cache-control": "private, max-age=0, no-store",
      },
    },
  );
}
