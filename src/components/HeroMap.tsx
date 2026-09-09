import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Minus, Plus } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import {
  buildStaticMapUrl,
  bucketCoordinate,
  bucketMapSize,
  clampHeroZoom,
  projectToPixel,
  slugifyCity,
  HERO_MAP_ZOOM,
  HERO_MAP_MIN_ZOOM,
  HERO_MAP_MAX_ZOOM,
} from "@/lib/staticMap";

// Same default as the mobile app's map view (DEFAULT_REGION in
// spotsVault-VC/mobile/src/app/(tabs)/index.tsx) — Montreal, matching this
// app's Quebec market. Renders immediately on every load, guaranteed —
// never waits on the per-visitor geolocation lookup below. That lookup is a
// background upgrade only; if it's slow, fails, or returns nothing usable,
// this is what stays on screen. Same resilience lesson as the day's earlier
// incident: an external/async dependency must never be able to block or
// break the initial render.
const MONTREAL_CENTER = { latitude: 45.5017, longitude: -73.5673 };

// Real listings only, within this radius of the hero's center point — same
// 50km "nearby" radius FindASpot.tsx already uses for its own real-listing
// search (maxDistanceKm). No fabricated fallback: a center point with no
// approved/active listing this close renders zero pins, not a decorative
// placeholder that looks like real inventory to a visitor.
const HERO_LISTINGS_RADIUS_KM = 50;
const HERO_MAX_PINS = 6;

type HeroPin = { latitude: number; longitude: number; price: string; category: "parking" | "storage" };

// Vault-icon teardrop pin — ported from the mobile app's PricePin
// (mobile/src/app/(tabs)/index.tsx), same navy/vault-glyph brand mark used
// in the real app and assets/spotsvault app icone.png. Web has no
// react-native-maps Marker to anchor, so the wrapper's own width/height
// below stand in for that: the wrapper is sized to exactly the pin body
// (excluding the floating price tag, same as mobile), and the pin loop
// further down positions this wrapper's bottom-center — not its
// center — on the projected coordinate, so the visual tip lands on the
// point rather than the pin's middle.
const PIN_HEAD_SIZE = 32;
// The rotated-square teardrop technique (border-radius on 3 corners, square
// 4th, rotate -45deg) doesn't change the element's own layout box — only
// its visual pixels. A square rotated 45deg around its center puts its
// lowest visual corner HEAD/sqrt(2) below center, i.e.
// HEAD*(sqrt(2)-1)/2 below the *unrotated* box's own bottom edge.
// Reserving that as real empty space below the head is what makes the
// wrapper's true bottom edge (used for positioning below) coincide with the
// visual tip instead of sitting a few px above it.
const PIN_TIP_OVERSHOOT = Math.round((PIN_HEAD_SIZE * (Math.SQRT2 - 1)) / 2);
const PIN_TOTAL_HEIGHT = PIN_HEAD_SIZE + PIN_TIP_OVERSHOOT;
const PIN_RING_INSET = 4;
const PIN_TAG_GAP = 6;
// Rough price-tag height (fontSize 12 + vertical padding) — used only by
// the near-edge skip check below, not real layout math (the tag sizes
// itself via flex); an estimate of how much clearance a pin needs above its
// coordinate before the tag would start overlapping the header, since the
// static map image has no clipping boundary against that.
const PIN_TAG_ESTIMATED_HEIGHT = 22;
const PIN_FULL_VISUAL_HEIGHT = PIN_TOTAL_HEIGHT + PIN_TAG_GAP + PIN_TAG_ESTIMATED_HEIGHT;

// Matches mobile's NAVY/NAVY_DEEP exactly (also close to this app's own
// --primary token, hsl(204 62% 28%) ≈ #1B4F72) — hardcoded rather than
// referencing the CSS variable since the pin must match the app icon
// pixel-for-pixel, not just "look navy-ish".
const PIN_NAVY = "#1B4F72";
const PIN_NAVY_DEEP = "#123449";
// Storage's pin accent — same relationship to PIN_PURPLE as PIN_NAVY_DEEP is
// to PIN_NAVY (a darker shade of the same hue for the inner ring, not a
// different color family). Tailwind's violet-500/violet-800 pair, matching
// mobile's PricePin exactly.
const PIN_PURPLE = "#8B5CF6";
const PIN_PURPLE_DEEP = "#5B21B6";

// Category -> the pin's fill (teardrop body + price-tag accent) and its
// inner-ring shade. Parking stays navy (the existing default, unchanged);
// storage gets purple — same vault glyph and pin shape for both, only the
// color differs, matching mobile's PricePin category coloring exactly.
const PIN_CATEGORY_COLORS: Record<"parking" | "storage", { pin: string; ring: string }> = {
  parking: { pin: PIN_NAVY, ring: PIN_NAVY_DEEP },
  storage: { pin: PIN_PURPLE, ring: PIN_PURPLE_DEEP },
};

// Simplified vault/safe glyph — hinge bar, door panel, dial with connecting
// stub, and two corner crop-marks from the real app icon, redrawn thin
// enough to survive at this marker size. Identical path data to mobile's
// VaultGlyph (react-native-svg and plain SVG share the same camelCase JSX
// prop names for standard SVG attributes, so this ported near verbatim).
function VaultGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <line x1={5.5} y1={5} x2={5.5} y2={19} stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" />
      <rect x={8} y={5} width={11} height={14} rx={1.5} stroke="#FFFFFF" strokeWidth={1.8} />
      <line x1={5.5} y1={12} x2={9.5} y2={12} stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={12.5} cy={12} r={2.2} stroke="#FFFFFF" strokeWidth={1.8} />
      <path d="M15.5 7h2v2" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 15v2h-2" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Local copy of FindASpot.tsx's own haversine helper (not exported there) —
// distance in km between two lat/lng points.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Same per-listing rate priority as the mobile app's getDisplayRate (daily
// preferred; hourly/weekly/monthly as fallbacks for a listing with no daily
// tier set) — one glanceable number per pin, same as before.
function pickDisplayPrice(listing: {
  price_hourly: number | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_monthly: number | null;
}): number | null {
  if (listing.price_daily != null) return listing.price_daily;
  if (listing.price_hourly != null) return listing.price_hourly;
  if (listing.price_weekly != null) return listing.price_weekly;
  if (listing.price_monthly != null) return listing.price_monthly;
  return null;
}

// Real, live listings near the hero's center point. Mirrors FindASpot.tsx's
// own approach (fetch approved/active listings, sort by client-side
// haversine distance) rather than the separate nearby_listings Postgres RPC
// mobile/admin use for actual booking search — this hero is decorative, not
// a search flow, and this repo already has everything it needs without a
// second data source. Fails to an empty array (zero pins) on any query
// error, same as "no listings nearby" — never a fabricated fallback.
async function fetchNearbyListingPins(center: { latitude: number; longitude: number }): Promise<HeroPin[]> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("lat, lng, price_hourly, price_daily, price_weekly, price_monthly, category")
      .eq("is_approved", true)
      .eq("is_active", true);
    if (error || !data) return [];

    return data
      .map((l) => {
        const lat = Number(l.lat);
        const lng = Number(l.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const price = pickDisplayPrice(l);
        if (price == null) return null;
        // Anything not literally "storage" renders as parking — matches
        // PricePin's own two-color model (no third "unknown" pin color) and
        // mirrors how the rest of this app already treats a missing/odd
        // category value (e.g. ParkingSearch.tsx's own `|| (!cat && !typ)`
        // parking fallback).
        const category: HeroPin["category"] = l.category === "storage" ? "storage" : "parking";
        const distanceKm = haversineKm(center.latitude, center.longitude, lat, lng);
        if (distanceKm > HERO_LISTINGS_RADIUS_KM) return null;
        return { latitude: lat, longitude: lng, price: `$${Math.round(price)}`, category, distanceKm };
      })
      .filter((p): p is HeroPin & { distanceKm: number } => p !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, HERO_MAX_PINS)
      .map(({ latitude, longitude, price, category }) => ({ latitude, longitude, price, category }));
  } catch {
    return [];
  }
}

const GEO_LOOKUP_TIMEOUT_MS = 800;
const DYNAMIC_MAP_LOAD_TIMEOUT_MS = 4000;

const GOOGLE_MAPS_STATIC_KEY = import.meta.env.VITE_GOOGLE_MAPS_STATIC_KEY as string | undefined;

// Visitor's resolved city center — resolved once (see the geo-lookup effect
// below) and independent of zoom. The actual image URL for this center is
// built and preloaded separately (see the zoom/image effect), since that
// part needs to re-run every time the zoom control changes, not just once.
type GeoCenter = {
  latitude: number;
  longitude: number;
  city: string | null;
};

function PricePin({ price, category }: { price: string; category: "parking" | "storage" }) {
  const { pin: pinColor, ring: pinRingColor } = PIN_CATEGORY_COLORS[category];
  return (
    <div style={{ position: "relative", width: PIN_HEAD_SIZE, height: PIN_TOTAL_HEIGHT }}>
      {/* Price tag — floats above the pin body. Wide horizontal bleed +
          centered content, not a fixed width, since price length varies
          ($5 vs $1,200) and this must stay centered over the tip. */}
      <div
        style={{
          position: "absolute",
          left: -40,
          right: -40,
          bottom: PIN_TOTAL_HEIGHT + PIN_TAG_GAP,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          className="shadow-md"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 8,
            padding: "4px 8px",
            border: `1.5px solid ${pinColor}`,
          }}
        >
          <span style={{ color: pinColor, fontWeight: 700, fontSize: 12 }}>{price}</span>
        </div>
      </div>

      {/* Teardrop pin body — rotated-square technique, same as mobile, but
          with the rotation sign corrected (see PIN_HEAD_SIZE comment
          above): sharp corner is bottom-right, so it needs a CLOCKWISE
          45deg (rotate(45deg)) to end up pointing straight down. A CSS/RN
          rotate(-45deg) is counter-clockwise, which swings that same corner
          to point sideways (toward 3 o'clock) instead — confirmed by
          rendering this exact markup in isolation and comparing against the
          intended anchor point before changing anything. */}
      <div
        className="shadow-md"
        style={{
          width: PIN_HEAD_SIZE,
          height: PIN_HEAD_SIZE,
          borderTopLeftRadius: PIN_HEAD_SIZE / 2,
          borderTopRightRadius: PIN_HEAD_SIZE / 2,
          borderBottomLeftRadius: PIN_HEAD_SIZE / 2,
          borderBottomRightRadius: 0,
          backgroundColor: pinColor,
          // White outline so the pin separates from the map at a glance —
          // the map's own highway color (staticMap.ts's MAP_STYLE) is this
          // exact navy, so an unbordered pin was blending straight into it.
          // Storage's purple doesn't have the same collision, but the same
          // white outline keeps both categories visually consistent.
          border: "2px solid #FFFFFF",
          transform: "rotate(45deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: PIN_HEAD_SIZE - PIN_RING_INSET * 2,
            height: PIN_HEAD_SIZE - PIN_RING_INSET * 2,
            borderRadius: (PIN_HEAD_SIZE - PIN_RING_INSET * 2) / 2,
            backgroundColor: pinRingColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Cancels the outer rotate(45deg) so the glyph itself stays
            // upright — this half of the technique was already correct
            // (confirmed in the isolated repro: the glyph rendered upright
            // even while the outer teardrop pointed the wrong way).
            transform: "rotate(-45deg)",
          }}
        >
          <VaultGlyph />
        </div>
      </div>
    </div>
  );
}

// Fetches the visitor's approximate city (cheap, always-fresh lookup — see
// api/geo-location.ts) with a short timeout, guarding every field against
// being missing or the wrong type before using it. Returns null on any
// failure — timeout, network error, malformed response, missing fields —
// so the caller can silently keep showing Montreal, exactly like the
// existing "bad/missing Maps key" fallback already does. `city` is optional
// on the returned value (used only to tag the cache key below) — a request
// still proceeds on lat/lng alone if the city header was somehow missing.
async function fetchVisitorGeo(): Promise<{ lat: number; lng: number; city: string | null } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEO_LOOKUP_TIMEOUT_MS);
    const res = await fetch("/api/geo-location", { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    const lat = record.lat;
    const lng = record.lng;
    const city = record.city;
    if (typeof lat !== "number" || !Number.isFinite(lat)) return null;
    if (typeof lng !== "number" || !Number.isFinite(lng)) return null;
    return { lat, lng, city: typeof city === "string" && city.trim() ? city : null };
  } catch {
    return null;
  }
}

// Preloads the dynamic city map off-screen so the visible hero never shows
// a broken-image flash — state only updates once we know the image actually
// loaded. Resolves false (never rejects) on error or timeout.
function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(false);
    }, DYNAMIC_MAP_LOAD_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

export default function HeroMap() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [geoCenter, setGeoCenter] = useState<GeoCenter | null>(null);
  const dynamicLookupStartedRef = useRef(false);

  // Requested zoom, driven by the +/- controls. HERO_MAP_ZOOM is the
  // starting level shared with the fixed Montreal image so the two look
  // consistent before any visitor input.
  const [zoom, setZoom] = useState(HERO_MAP_ZOOM);

  // The dynamic (geo-resolved) city image is preload-gated, same principle
  // as the original geo upgrade: never swap the visible map to a new zoom
  // level until that level's image has actually finished loading, so a slow
  // or failed re-fetch (a real network round-trip per +/- tap, not a live
  // pan/zoom) never flashes a broken image — it just leaves the previous
  // zoom level on screen. dynamicMapZoom tracks which zoom the CURRENTLY
  // SHOWN dynamicMapUrl actually corresponds to (may lag `zoom` while a
  // request is in flight), so pin placement below stays aligned with
  // whatever image pixels are actually visible.
  const [dynamicMapUrl, setDynamicMapUrl] = useState<string | null>(null);
  const [dynamicMapZoom, setDynamicMapZoom] = useState<number | null>(null);
  const [zoomLoading, setZoomLoading] = useState(false);
  const zoomRequestIdRef = useRef(0);

  // Crossfade on any image change after the first paint (a zoom re-fetch,
  // almost always — see the effect below): the outgoing image is kept
  // mounted underneath at full opacity while the incoming one fades in over
  // it, so a tap reads as "here's your new view" rather than a hard pop.
  // Deliberately does NOT gate the very first image (previousMapUrl only
  // ever gets set once a prior mapImageUrl already existed) — the initial
  // paint keeps its existing "render immediately, no animation" guarantee.
  const [previousMapUrl, setPreviousMapUrl] = useState<string | null>(null);
  const lastMapImageUrlRef = useRef<string | null>(null);
  const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CROSSFADE_DURATION_MS = 300; // matches the img-crossfade Tailwind animation

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastWidth = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Only react to meaningful width changes — avoids re-requesting a new
      // static map image (a billed API call) on every pixel of a drag-resize.
      if (Math.abs(rect.width - lastWidth) < 150 && lastWidth !== 0) return;
      lastWidth = rect.width;
      setSize({ width: rect.width, height: rect.height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Resolves WHICH city to center on — runs once, after the container's
  // size is first known, and never blocks or delays the Montreal map
  // already on screen. Any failure here just leaves Montreal as the center.
  // Building/preloading the actual image for this center (and for zoom
  // changes on it) happens in the effect below, so this one doesn't need to
  // re-run every time the zoom control changes.
  useEffect(() => {
    if (!size || dynamicLookupStartedRef.current) return;
    dynamicLookupStartedRef.current = true;
    let cancelled = false;

    (async () => {
      const geo = await fetchVisitorGeo();
      if (cancelled || !geo) return;

      // Bucket lat/lng before using them — this is what makes the
      // downstream request URL, and therefore the CDN/Google cache key,
      // shared across visitors from the same city rather than one fresh
      // entry per exact per-visitor coordinate. See bucketCoordinate in
      // src/lib/staticMap.ts.
      setGeoCenter({
        latitude: bucketCoordinate(geo.lat),
        longitude: bucketCoordinate(geo.lng),
        city: geo.city,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [size]);

  // Builds and preloads the dynamic city image whenever the resolved center,
  // container size, or requested zoom changes — covering both the initial
  // geo-upgrade and every subsequent +/- tap through the same preload-then-
  // swap path. A zoomRequestId guard drops a stale response if the visitor
  // taps again before the previous request finishes, so a burst of taps
  // can't land them on an out-of-order zoom level.
  useEffect(() => {
    if (!size || !geoCenter) return;
    const { width, height } = bucketMapSize(size.width, size.height);
    const citySlug = geoCenter.city ? slugifyCity(geoCenter.city) : "";
    const url =
      `/api/hero-map?lat=${geoCenter.latitude}&lng=${geoCenter.longitude}` +
      `&w=${width}&h=${height}&zoom=${zoom}` +
      (citySlug ? `&city=${citySlug}` : "");

    const requestId = ++zoomRequestIdRef.current;
    setZoomLoading(true);
    let cancelled = false;
    preloadImage(url).then((loaded) => {
      if (cancelled || requestId !== zoomRequestIdRef.current) return;
      setZoomLoading(false);
      // On failure, deliberately leave dynamicMapUrl/dynamicMapZoom exactly
      // as they were — same "never worse than the current screen" principle
      // as the original upgrade-only logic, just now also covering a zoom
      // re-fetch that comes back broken or times out.
      if (loaded) {
        setDynamicMapUrl(url);
        setDynamicMapZoom(zoom);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [geoCenter, size?.width, size?.height, zoom]);

  const activeCenter = geoCenter ?? MONTREAL_CENTER;

  const [activePins, setActivePins] = useState<HeroPin[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchNearbyListingPins(activeCenter).then((result) => {
      if (!cancelled) setActivePins(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCenter.latitude, activeCenter.longitude]);

  const mapImageUrl =
    dynamicMapUrl ??
    (GOOGLE_MAPS_STATIC_KEY && size
      ? buildStaticMapUrl({
          latitude: MONTREAL_CENTER.latitude,
          longitude: MONTREAL_CENTER.longitude,
          zoom,
          // Fit within Google's real per-axis size limit rather than the
          // raw container size — requesting more than that on both axes
          // gets silently clamped to a distorted shape (verified directly
          // against the API), which also throws off pin placement below
          // since it changes what geographic area the image actually shows.
          ...bucketMapSize(size.width, size.height),
          apiKey: GOOGLE_MAPS_STATIC_KEY,
        })
      : null);

  // Tracks mapImageUrl changes to drive the crossfade: whenever it changes
  // to a genuinely different, non-null value AFTER an image was already
  // showing, stash the outgoing one in previousMapUrl so both can render
  // stacked for one crossfade duration. Runs for both the preload-gated
  // dynamic path and the ungated Montreal-fallback path — on the latter,
  // the "incoming" layer may still be loading when the fade starts (that
  // path isn't preloaded), which is no worse than the hard pop it replaces.
  useEffect(() => {
    const last = lastMapImageUrlRef.current;
    if (last && mapImageUrl && last !== mapImageUrl) {
      setPreviousMapUrl(last);
      if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = setTimeout(() => setPreviousMapUrl(null), CROSSFADE_DURATION_MS);
    }
    lastMapImageUrlRef.current = mapImageUrl;
  }, [mapImageUrl]);

  useEffect(
    () => () => {
      if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
    },
    [],
  );

  // The zoom level that actually matches mapImageUrl's pixels: the
  // dynamic-city path is preload-gated (see the effect above), so while a
  // requested zoom change is still in flight this stays at the OLD level
  // that's still on screen, keeping pin math aligned with what's actually
  // visible instead of jumping ahead of the image. The ungated Montreal
  // fallback has no such lag, so it can track the requested zoom directly.
  const displayZoom = dynamicMapUrl ? dynamicMapZoom! : zoom;

  const showMap = Boolean(mapImageUrl) && !mapFailed && size;

  const canZoomIn = zoom < HERO_MAP_MAX_ZOOM;
  const canZoomOut = zoom > HERO_MAP_MIN_ZOOM;
  const handleZoomIn = () => setZoom((z) => clampHeroZoom(z + 1));
  const handleZoomOut = () => setZoom((z) => clampHeroZoom(z - 1));

  // Surfaces the city name fetchVisitorGeo() already resolved (previously
  // discarded right after building the tile cache key above) — "Near
  // {city}" when geolocation actually succeeded, a static "Montreal area"
  // label for the default/fallback point otherwise, so the map always reads
  // as somewhere specific rather than an unlabeled backdrop.
  const locationLabel = geoCenter?.city
    ? t("home.hero.nearCity", { city: geoCenter.city })
    : t("home.hero.defaultAreaLabel");

  return (
    <div ref={containerRef} className="absolute inset-0">
      {showMap ? (
        <>
          {/* Outgoing image stays mounted at full opacity underneath the
              incoming one for one crossfade duration, so the swap reads as
              a deliberate transition rather than a hard cut. key={url}
              forces a remount (and therefore restarts the CSS animation)
              each time the src actually changes. */}
          {previousMapUrl ? (
            <img
              key={previousMapUrl}
              src={previousMapUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
          <img
            key={mapImageUrl}
            src={mapImageUrl!}
            alt={t("home.hero.imageAlt")}
            className={
              "absolute inset-0 w-full h-full object-cover" +
              (previousMapUrl ? " animate-img-crossfade" : "")
            }
            onError={() => setMapFailed(true)}
          />
          {/* Top-left, not bottom-left: Google's own required logo watermark
              is baked into the image at bottom-left (can't be removed or
              covered per their attribution terms), and a bottom-anchored
              label there was rendering directly on top of it — unreadable. */}
          <div className="absolute top-3 left-3 rounded-full bg-foreground/35 px-2.5 py-1 text-[11px] font-medium text-primary-foreground/90 backdrop-blur-sm">
            {locationLabel}
          </div>
          {activePins.map((pin, i) => {
            const { x, y } = projectToPixel(pin, activeCenter, displayZoom, size.width, size.height);
            // Skip pins that would land outside the visible frame (narrow
            // viewports show less of the map at a fixed zoom), or too close
            // to the top for the floating price tag above the pin to fit —
            // same margins as mobile's WebSearchMap guard, sized to this
            // pin's real footprint now that it's a full teardrop+tag rather
            // than the old small pill.
            if (
              x < PIN_HEAD_SIZE ||
              x > size.width - PIN_HEAD_SIZE ||
              y < PIN_FULL_VISUAL_HEIGHT ||
              y > size.height - 24
            ) {
              return null;
            }
            return (
              // Bottom-center anchored, not center-anchored: the pin's
              // visual tip (see PricePin/PIN_TOTAL_HEIGHT above) must land
              // exactly on the projected coordinate, not the pin's middle.
              <div
                key={i}
                className="absolute -translate-x-1/2"
                style={{ left: x, top: y - PIN_TOTAL_HEIGHT }}
              >
                <PricePin price={pin.price} category={pin.category} />
              </div>
            );
          })}
          {/* Static-image "zoom": each tap re-fetches a whole new map image
              at a different HERO_MAP_ZOOM level (see the effect above) —
              there's no live viewport here to pan/zoom continuously. Bottom
              side of the map, per the original ask — but bottom-10, not
              bottom-3: Google's required "Map data © Google" attribution
              text is baked into the image right at the bottom edge, and
              bottom-3 was overlapping it. */}
          <div className="absolute bottom-10 right-3 flex flex-col overflow-hidden rounded-full bg-foreground/35 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!canZoomIn || zoomLoading}
              aria-label={t("home.hero.zoomIn")}
              className="flex h-8 w-8 items-center justify-center text-primary-foreground/90 transition-opacity hover:bg-foreground/20 disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
            {/* Swaps in for the divider while a re-fetch is in flight — the
                only visible cue that a tap did something, since the new
                image can take a real network round-trip to arrive. */}
            {zoomLoading ? (
              <div className="flex h-3 items-center justify-center">
                <Loader2 className="h-2.5 w-2.5 animate-spin text-primary-foreground/70" />
              </div>
            ) : (
              <div className="h-px bg-primary-foreground/20" />
            )}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!canZoomOut || zoomLoading}
              aria-label={t("home.hero.zoomOut")}
              className="flex h-8 w-8 items-center justify-center text-primary-foreground/90 transition-opacity hover:bg-foreground/20 disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <img
          src={heroBg}
          alt={t("home.hero.imageAlt")}
          className="w-full h-full object-cover"
        />
      )}
      {/* Purely decorative — pointer-events-none so it never intercepts
          clicks meant for the zoom buttons/pins underneath it. Without this
          it sits on top of everything (last in DOM, same stacking context)
          and silently swallows every click in the hero. */}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30 pointer-events-none" />
    </div>
  );
}
