import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import heroBg from "@/assets/hero-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import {
  buildStaticMapUrl,
  bucketCoordinate,
  bucketMapSize,
  projectToPixel,
  slugifyCity,
  HERO_MAP_ZOOM,
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

type HeroPin = { latitude: number; longitude: number; price: string };

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
      .select("lat, lng, price_hourly, price_daily, price_weekly, price_monthly")
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
        const distanceKm = haversineKm(center.latitude, center.longitude, lat, lng);
        if (distanceKm > HERO_LISTINGS_RADIUS_KM) return null;
        return { latitude: lat, longitude: lng, price: `$${Math.round(price)}`, distanceKm };
      })
      .filter((p): p is HeroPin & { distanceKm: number } => p !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, HERO_MAX_PINS)
      .map(({ latitude, longitude, price }) => ({ latitude, longitude, price }));
  } catch {
    return [];
  }
}

const GEO_LOOKUP_TIMEOUT_MS = 800;
const DYNAMIC_MAP_LOAD_TIMEOUT_MS = 4000;

const GOOGLE_MAPS_STATIC_KEY = import.meta.env.VITE_GOOGLE_MAPS_STATIC_KEY as string | undefined;

type DynamicMap = {
  url: string;
  center: { latitude: number; longitude: number };
};

function PricePin({ price }: { price: string }) {
  return (
    <div className="rounded-full bg-card text-foreground border border-primary px-2.5 py-1 text-xs font-semibold shadow-md">
      {price}
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
  const [dynamicMap, setDynamicMap] = useState<DynamicMap | null>(null);
  const dynamicLookupStartedRef = useRef(false);

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

  // Background upgrade only — runs once, after the container's size is
  // first known, and never blocks or delays the Montreal map already on
  // screen. Any failure at any step just leaves that Montreal map in place.
  useEffect(() => {
    if (!size || dynamicLookupStartedRef.current) return;
    dynamicLookupStartedRef.current = true;
    let cancelled = false;

    (async () => {
      const geo = await fetchVisitorGeo();
      if (cancelled || !geo) return;

      // Bucket lat/lng (and tag with a city slug) before building the
      // request URL — this is what makes the URL, and therefore the
      // CDN/Google cache key, shared across visitors from the same city
      // rather than one fresh entry per exact per-visitor coordinate. See
      // bucketCoordinate in src/lib/staticMap.ts.
      const lat = bucketCoordinate(geo.lat);
      const lng = bucketCoordinate(geo.lng);
      const { width, height } = bucketMapSize(size.width, size.height);
      const citySlug = geo.city ? slugifyCity(geo.city) : "";
      const url =
        `/api/hero-map?lat=${lat}&lng=${lng}&w=${width}&h=${height}` +
        (citySlug ? `&city=${citySlug}` : "");
      const loaded = await preloadImage(url);
      if (cancelled || !loaded) return;

      setDynamicMap({ url, center: { latitude: lat, longitude: lng } });
    })();

    return () => {
      cancelled = true;
    };
  }, [size]);

  const activeCenter = dynamicMap?.center ?? MONTREAL_CENTER;

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
    dynamicMap?.url ??
    (GOOGLE_MAPS_STATIC_KEY && size
      ? buildStaticMapUrl({
          latitude: MONTREAL_CENTER.latitude,
          longitude: MONTREAL_CENTER.longitude,
          zoom: HERO_MAP_ZOOM,
          // Fit within Google's real per-axis size limit rather than the
          // raw container size — requesting more than that on both axes
          // gets silently clamped to a distorted shape (verified directly
          // against the API), which also throws off pin placement below
          // since it changes what geographic area the image actually shows.
          ...bucketMapSize(size.width, size.height),
          apiKey: GOOGLE_MAPS_STATIC_KEY,
        })
      : null);

  const showMap = Boolean(mapImageUrl) && !mapFailed && size;

  return (
    <div ref={containerRef} className="absolute inset-0">
      {showMap ? (
        <>
          <img
            src={mapImageUrl!}
            alt={t("home.hero.imageAlt")}
            className="w-full h-full object-cover"
            onError={() => setMapFailed(true)}
          />
          {activePins.map((pin, i) => {
            const { x, y } = projectToPixel(pin, activeCenter, HERO_MAP_ZOOM, size.width, size.height);
            // Skip pins that would land outside the visible frame (narrow
            // viewports show less of the map at a fixed zoom) rather than
            // letting them float in the text/gradient area.
            if (x < 24 || x > size.width - 24 || y < 24 || y > size.height - 24) return null;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: x, top: y }}
              >
                <PricePin price={pin.price} />
              </div>
            );
          })}
        </>
      ) : (
        <img
          src={heroBg}
          alt={t("home.hero.imageAlt")}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
    </div>
  );
}
