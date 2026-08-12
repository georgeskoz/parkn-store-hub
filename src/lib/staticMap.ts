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

// Brand-styled map: navy roads (mirrors mobile's NAVY = #1B4F72), muted
// neutral land, subdued water, and all labels/POI/transit hidden — a clean
// "map texture" rather than a literal navigable map, matching the decorative
// intent (same idea as Uber's homepage hero).
const MAP_STYLE: string[] = [
  "feature:all|element:labels|visibility:off",
  "feature:poi|visibility:off",
  "feature:transit|visibility:off",
  "feature:administrative|element:geometry|visibility:off",
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
