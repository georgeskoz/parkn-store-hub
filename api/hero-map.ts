// Vercel Edge Function — proxies a single Google Static Maps request per
// city/size-bucket and lets Vercel's CDN cache the response by URL, so many
// visitors requesting the same city share one billed Google API call
// instead of one per pageview. The client (src/components/HeroMap.tsx) is
// responsible for rounding both lat/lng and width/height to shared buckets
// (and tagging the request with a city slug) before building this request's
// URL — that's what makes the URL (and therefore the cache key) shared
// across visitors from the same city and viewports of similar shape. This
// function re-clamps independently as defense in depth, not as the primary
// cache mechanism.
import { buildStaticMapUrl, bucketCoordinate, bucketMapSize, HERO_MAP_ZOOM } from "../src/lib/staticMap";

export const config = { runtime: "edge" };

const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const latRaw = Number(url.searchParams.get("lat"));
  const lngRaw = Number(url.searchParams.get("lng"));
  const wRaw = Number(url.searchParams.get("w"));
  const hRaw = Number(url.searchParams.get("h"));

  const validCoords =
    Number.isFinite(latRaw) && latRaw >= MIN_LAT && latRaw <= MAX_LAT &&
    Number.isFinite(lngRaw) && lngRaw >= MIN_LNG && lngRaw <= MAX_LNG;
  const validSize = Number.isFinite(wRaw) && Number.isFinite(hRaw) && wRaw > 0 && hRaw > 0;

  if (!validCoords || !validSize) {
    return new Response("Invalid parameters", { status: 400 });
  }

  // The client (src/components/HeroMap.tsx) is responsible for sending
  // already-bucketed coordinates — that's what makes the incoming request
  // URL (the CDN's actual cache key) shared across visitors from the same
  // city. Re-bucketing here is defense in depth only, same reasoning as
  // bucketMapSize below: it can't retroactively fix the cache key for THIS
  // request, but it keeps the outgoing Google call's framing consistent
  // even if a caller ever sends unbucketed coordinates.
  const lat = bucketCoordinate(latRaw);
  const lng = bucketCoordinate(lngRaw);

  const { width, height } = bucketMapSize(wRaw, hRaw);

  // Server-only var (no VITE_ prefix — never bundled client-side). Reuses
  // the same key value as the client-side VITE_GOOGLE_MAPS_STATIC_KEY for
  // now: empirically, requests with no Referer header (which is what an
  // edge-to-Google fetch sends, same as a plain curl call) are accepted by
  // that HTTP-referrer-restricted key. That's a real but non-fatal
  // dependency on Google's current referrer-restriction behavior — if it
  // ever tightens, this endpoint starts failing closed (502 below), and the
  // client's existing resilience just keeps showing the Montreal fallback.
  // Worth hardening later with a dedicated API-restricted (not
  // referrer-restricted) server key.
  const apiKey = process.env.GOOGLE_MAPS_STATIC_KEY;
  if (!apiKey) {
    return new Response("Map not configured", { status: 503 });
  }

  const googleUrl = buildStaticMapUrl({
    latitude: lat,
    longitude: lng,
    zoom: HERO_MAP_ZOOM,
    width,
    height,
    apiKey,
  });

  let googleRes: Response;
  try {
    googleRes = await fetch(googleUrl);
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (!googleRes.ok || !googleRes.body) {
    return new Response("Upstream error", { status: 502 });
  }

  return new Response(googleRes.body, {
    status: 200,
    headers: {
      "content-type": googleRes.headers.get("content-type") ?? "image/png",
      // Shared across every visitor requesting this exact city/size bucket —
      // the whole point is one Google call serving many pageviews. Street
      // layouts don't change; 30 days is safe for a decorative background.
      "cache-control": "public, s-maxage=2592000, stale-while-revalidate=86400",
    },
  });
}
