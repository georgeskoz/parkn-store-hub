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
//
// Nominatim is strong on structured/precise addresses but weak on landmark
// nicknames -- it does plain tag-text matching against OSM data, not fuzzy
// predictive search, so "bell center" (missing the accent, wrong word
// order relative to "Bell Centre, Montreal") can come back empty even
// though the venue is well-mapped. Photon (Komoot's free, keyless,
// Elasticsearch-backed geocoder over the same OSM data) is specifically
// better at this -- fuzzy/typo-tolerant, ranks on relevance rather than
// exact tag text -- so it's used here as a second attempt, never a
// replacement for Nominatim's better address precision. Also free/keyless,
// same "public good citizen" posture as Nominatim: https://photon.komoot.io.
export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api/";

// Rough Canada bounding box (lon/lat), same rationale as Nominatim's
// countrycodes=ca below -- keeps a landmark search like "bell center" from
// resolving to a same-named place outside this app's actual market.
const CANADA_BBOX = "-141,41,-52,84";

async function geocodeViaNominatim(q: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    limit: "1",
    // Biased toward Quebec/Canada (this app's actual market) via
    // `countrycodes` so "Ottawa" resolves to Ontario-adjacent-to-Quebec
    // rather than some same-named town elsewhere, without hard-excluding
    // genuine cross-border searches like Ottawa itself (countrycodes=ca
    // covers it; Bell Centre, Ottawa, and Gatineau are all `ca`).
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

async function geocodeViaPhoton(q: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q,
    limit: "1",
    lang: "en",
    bbox: CANADA_BBOX,
  });

  try {
    const res = await fetch(`${PHOTON_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lng, lat] = coords;
    if (!isFinite(lat) || !isFinite(lng)) return null;
    const props = feature.properties || {};
    const label =
      [props.name, props.city ?? props.county, props.state, props.country].filter(Boolean).join(", ") || q;
    return { lat, lng, label };
  } catch {
    return null;
  }
}

export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const viaNominatim = await geocodeViaNominatim(q);
  if (viaNominatim) return viaNominatim;

  // Nominatim came back empty -- try Photon before giving up. This is
  // strictly a fallback (not tried first) because Nominatim's structured
  // address matching is the more precise of the two for a real street
  // address; Photon's fuzzier ranking is only worth the extra round-trip
  // when the first, more precise attempt has nothing.
  return geocodeViaPhoton(q);
}
