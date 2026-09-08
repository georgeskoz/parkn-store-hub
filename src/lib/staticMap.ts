// Google Static Maps helpers for the marketing-site hero background.
// Ported from spotsVault-VC/mobile/src/lib/staticMap.ts, which uses the same
// approach for the mobile app's own web build (react-native-maps has no web
// implementation there either). Static Maps is a plain image request — no
// JS SDK — so a bad/missing key degrades to a broken-image event we can
// catch and fall back from, instead of a console error or, worse, an
// exception during render.
//
// Markers are drawn as absolutely-positioned HTML overlays rather than via
// the Static Maps `markers=` param, so they can match the app's own
// price-pill style instead of Google's default pin.

const TILE_SIZE = 256;

// Shared zoom level so the fixed Montreal map and any dynamically-loaded
// city map (see api/hero-map.ts) look visually consistent.
export const HERO_MAP_ZOOM = 15;

// Bounds for the hero's +/- zoom controls (HeroMap.tsx). The hero is a
// static image, not a live viewport — "zoom" there means re-fetching a new
// image at a different level, so these bound how many distinct Static Maps
// requests (and CDN cache entries, one per zoom step per city/size bucket)
// that control can generate. Narrow enough to stay a decorative texture at
// either end: below 12 the styled roads/water thin out to almost nothing at
// this hero's typical crop size; above 18 it's block-level street detail,
// well past what a background image needs.
export const HERO_MAP_MIN_ZOOM = 12;
export const HERO_MAP_MAX_ZOOM = 18;

export function clampHeroZoom(zoom: number): number {
  return Math.min(HERO_MAP_MAX_ZOOM, Math.max(HERO_MAP_MIN_ZOOM, Math.round(zoom)));
}

// Google Static Maps silently clamps each axis to a max of 640 pre-scale
// (1280 post `scale=2`) — verified directly against the API, not assumed
// from docs. Requesting anything larger than that on BOTH axes (as the
// original naive width/height pass-through did) gets clamped to a distorted
// shape — for a wide hero container it comes back a 1280x1280 square, which
// object-cover then crops. That crop silently breaks the pin math too:
// projectToPixel positions pins assuming the displayed image's geographic
// framing matches the CSS container 1:1, which is only true if the image
// Google actually delivers has the same aspect ratio as that container.
const GOOGLE_STATIC_MAPS_MAX_PRE_SCALE_AXIS = 640;

// Real viewports/hero containers realistically range from tall mobile
// (~0.45) to ultra-wide desktop (~3.5) — clamping outside that keeps a
// malformed/extreme input from producing a degenerate request.
const MIN_ASPECT_RATIO = 0.4;
const MAX_ASPECT_RATIO = 4;
const ASPECT_RATIO_BUCKET_STEP = 0.1;

// Fits the container's aspect ratio into Google's real per-axis limit
// (maximizing resolution within it) and rounds the aspect ratio to a coarse
// bucket, so many visitors with similar (but not pixel-identical) viewport
// shapes request the exact same image URL. That shared URL is what lets
// Vercel's CDN cache one Google Static Maps response across all of them,
// instead of one fresh request per pageview. Must be applied on the CLIENT
// before building the request URL, not just server-side: the CDN caches by
// the incoming request URL, so two visitors sending different exact
// dimensions get different cache entries even if the server would've
// produced visually-equivalent images.
export function bucketMapSize(containerWidth: number, containerHeight: number): { width: number; height: number } {
  const safeWidth = containerWidth > 0 ? containerWidth : 1;
  const safeHeight = containerHeight > 0 ? containerHeight : 1;
  const aspect = Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, safeWidth / safeHeight));
  const bucketedAspect = Math.round(aspect / ASPECT_RATIO_BUCKET_STEP) * ASPECT_RATIO_BUCKET_STEP;

  if (bucketedAspect >= 1) {
    const width = GOOGLE_STATIC_MAPS_MAX_PRE_SCALE_AXIS;
    return { width, height: Math.round(width / bucketedAspect) };
  }
  const height = GOOGLE_STATIC_MAPS_MAX_PRE_SCALE_AXIS;
  return { width: Math.round(height * bucketedAspect), height };
}

// ~1.1km of latitude per 0.01°, less for longitude at higher latitudes —
// coarse enough that two visitors resolved to the same city collapse onto
// the same request URL (and therefore the same CDN/Google cache entry) even
// if Vercel's IP database hands back slightly different raw coordinates for
// them, but fine enough that the map still frames the right part of the
// city. Same "must bucket on the client before building the request URL"
// reasoning as bucketMapSize above: the CDN caches by incoming URL, so
// unbucketed per-visitor lat/lng would defeat cross-visitor cache sharing
// even though the visual result would've been indistinguishable.
const CITY_COORD_PRECISION = 100; // 2 decimal places

export function bucketCoordinate(value: number): number {
  return Math.round(value * CITY_COORD_PRECISION) / CITY_COORD_PRECISION;
}

// Cache-key-safe city label: lowercased, diacritics stripped, anything but
// a-z0-9 collapsed to a single hyphen. Purely a human-legible tag alongside
// the bucketed coordinates above (which do the actual cache-sharing work) —
// never parsed back, so this only needs to be stable and URL-safe, not
// reversible.
export function slugifyCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Brand-styled map: navy roads (mirrors mobile's NAVY = #1B4F72), muted
// neutral land, subdued water, POI/transit hidden — a clean "map texture"
// rather than a literal navigable map, matching the decorative intent (same
// idea as Uber's homepage hero). Road and locality (city/town) labels are
// kept, just muted to sit inside the palette instead of Google's default
// black-on-white — a map with zero text reads as an abstract graphic rather
// than a real, specific place, which was the whole point of locationLabel
// (see HeroMap.tsx) existing at all.
const MAP_STYLE: string[] = [
  "feature:poi|visibility:off",
  "feature:transit|visibility:off",
  "feature:administrative|element:geometry|visibility:off",
  "feature:all|element:labels.icon|visibility:off",
  "feature:all|element:labels.text.fill|color:0x5A7A8C",
  "feature:all|element:labels.text.stroke|color:0xEEF1F2|weight:2",
  "feature:landscape|element:geometry|color:0xEEF1F2",
  "feature:water|element:geometry|color:0xAFC9D9",
  "feature:road|element:geometry.stroke|visibility:off",
  "feature:road.highway|element:geometry.fill|color:0x1B4F72",
  "feature:road.arterial|element:geometry.fill|color:0x1B4F72",
  "feature:road.local|element:geometry.fill|color:0x5A87A6",
];

// Converts a lat/lng to "world" pixel coordinates at zoom level 0, using the
// same Web Mercator projection Google Maps uses. Multiplying by 2^zoom gives
// the pixel position at any zoom level.
function latLngToWorldPixel(latitude: number, longitude: number) {
  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const x = TILE_SIZE * (0.5 + longitude / 360);
  const y = TILE_SIZE * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI));
  return { x, y };
}

// Picks a zoom level so the given longitude span roughly fills an image of
// pixelWidth — higher zoom shows more street/block detail.
export function regionToZoom(longitudeDelta: number, pixelWidth: number): number {
  const zoom = Math.log2((pixelWidth / TILE_SIZE) * (360 / longitudeDelta));
  return Math.min(20, Math.max(2, Math.round(zoom)));
}

// Projects a lat/lng to an {x, y} pixel offset inside an image of the given
// size, centered on `center` at `zoom` — used to position marker overlays on
// top of the static map image.
export function projectToPixel(
  point: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  zoom: number,
  pixelWidth: number,
  pixelHeight: number,
) {
  const scale = 2 ** zoom;
  const centerPx = latLngToWorldPixel(center.latitude, center.longitude);
  const pointPx = latLngToWorldPixel(point.latitude, point.longitude);
  return {
    x: pixelWidth / 2 + (pointPx.x - centerPx.x) * scale,
    y: pixelHeight / 2 + (pointPx.y - centerPx.y) * scale,
  };
}

export function buildStaticMapUrl(opts: {
  latitude: number;
  longitude: number;
  zoom: number;
  width: number;
  height: number;
  apiKey: string;
}): string {
  const { latitude, longitude, zoom, width, height, apiKey } = opts;
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const styleParams = MAP_STYLE.map((s) => `style=${encodeURIComponent(s)}`).join("&");
  return (
    `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}` +
    `&zoom=${zoom}&size=${w}x${h}&scale=2&${styleParams}&key=${apiKey}`
  );
}
