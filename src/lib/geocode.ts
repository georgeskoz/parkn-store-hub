// Free, keyless geocoding for the homepage's live map search bar — matches
// the OpenStreetMap/Leaflet stack ListingsMap.tsx already uses, so this
// doesn't need a Google Places/Maps API key the web app doesn't otherwise
// have (see HeroMap's old Google Static Maps key, which was optional and
// only ever powered a decorative background image, never real search).
//
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// caps unauthenticated use at ~1 request/second and asks for a descriptive
// User-Agent/Referer — the debounce in HeroSection.tsx is what keeps this
// under that cap, not anything in here. This is a public good-citizen API,
// not a paid/keyed service, so don't add a key or swap providers without
// re-checking that policy.

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Biased toward Quebec/Canada (this app's actual market) via `countrycodes`
// so "Ottawa" resolves to Ontario-adjacent-to-Quebec rather than some
// same-named town elsewhere, without hard-excluding genuine cross-border
// searches like Ottawa itself (countrycodes=ca covers it; Bell Centre,
// Ottawa, and Gatineau are all `ca`).
export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    limit: "1",
    countrycodes: "ca",
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        // Nominatim's policy asks for either a Referer or a descriptive
        // User-Agent identifying the application; browsers already send a
        // real Referer with every fetch, so no header needs to be (or can
        // be, from a browser) set manually here.
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const top = data[0];
    const lat = Number(top.lat);
    const lng = Number(top.lon);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng, label: top.display_name || q };
  } catch {
    return null;
  }
}
