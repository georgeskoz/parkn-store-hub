import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Search, MapPin, X, List, Zap } from "lucide-react";
import HeroLiveMap, { HeroMapListing } from "@/components/HeroLiveMap";
import { supabase } from "@/integrations/supabase/client";
import { ANON_SAFE_LISTING_COLUMNS } from "@/lib/listingsAnonColumns";
import { geocodePlace } from "@/lib/geocode";

// Matches the mobile app's DEFAULT_REGION ((tabs)/index.tsx) and the old
// HeroMap's MONTREAL_CENTER -- shown until the visitor searches something
// specific, same fallback rationale as before: renders immediately,
// never blocked on geolocation or a search that hasn't happened yet.
const MONTREAL_CENTER = { lat: 45.5017, lng: -73.5673 };

// Coarse presets for the chip row; the slider covers the same range
// continuously. Mirrors mobile's AUTO_EXPAND_RADII_KM shape (small ->
// large) but as a full range here since the web slider makes free-form
// selection cheap, where mobile's slider lives inside a secondary filter
// sheet.
const RADIUS_PRESETS_KM = [1, 3, 10, 25, 50];
const AUTO_EXPAND_RADII_KM = [1, 3, 10, 25, 50];
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;

interface RawListing {
  id: string;
  title: string | null;
  city: string | null;
  category: string | null;
  type: string | null;
  lat: number | string | null;
  lng: number | string | null;
  price_hourly: number | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_monthly: number | null;
  event_pricing_enabled: boolean | null;
}

interface NearbyListing extends HeroMapListing {
  title: string;
  city: string | null;
  distanceKm: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pickPrice(l: RawListing, isParking: boolean): { price: number | null; label: string } {
  const order: Array<{ price: number | null; label: string }> = isParking
    ? [
        { price: l.price_hourly, label: "listingCard.perHour" },
        { price: l.price_daily, label: "listingCard.perDay" },
        { price: l.price_weekly, label: "listingCard.perWeek" },
        { price: l.price_monthly, label: "listingCard.perMonth" },
      ]
    : [
        { price: l.price_monthly, label: "listingCard.perMonth" },
        { price: l.price_weekly, label: "listingCard.perWeek" },
        { price: l.price_daily, label: "listingCard.perDay" },
        { price: l.price_hourly, label: "listingCard.perHour" },
      ];
  for (const entry of order) {
    if (entry.price != null) return entry;
  }
  return { price: null, label: "" };
}

const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [searchedPlace, setSearchedPlace] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [radiusKm, setRadiusKm] = useState<number>(RADIUS_PRESETS_KM[2]);
  const [radiusManuallySet, setRadiusManuallySet] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rawListings, setRawListings] = useState<RawListing[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Same anon-safe column set FindASpot.tsx/ParkingSearch.tsx use --
      // see that file for why a bare select("*") fails outright for a
      // signed-out visitor. This page only reads a handful of those
      // columns (below), but the select itself must request exactly this
      // shared list so it stays correct if that grant list ever changes.
      const { data, error } = await supabase
        .from("listings")
        .select(ANON_SAFE_LISTING_COLUMNS)
        .eq("status", "approved");
      if (cancelled) return;
      if (error) {
        console.error("[HeroSection] Failed to load listings", error);
        setRawListings([]);
        return;
      }
      setRawListings((data as RawListing[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const center = searchedPlace ?? MONTREAL_CENTER;

  // Every listing with its distance from the current center, nearest
  // first -- computed once per center/listings change so both the radius
  // filter and the auto-expand fallback below can reuse it without
  // re-running haversine per candidate radius.
  const withDistance = useMemo(() => {
    return rawListings
      .map((l) => {
        const lat = Number(l.lat);
        const lng = Number(l.lng);
        if (!isFinite(lat) || !isFinite(lng)) return null;
        const category: "parking" | "storage" =
          (l.category || l.type || "").toLowerCase() === "storage" ? "storage" : "parking";
        const { price, label } = pickPrice(l, category === "parking");
        return {
          id: l.id,
          title: l.title || "",
          city: l.city,
          lat,
          lng,
          price,
          priceLabel: label,
          category,
          eventPricing: !!l.event_pricing_enabled,
          distanceKm: haversineKm(center.lat, center.lng, lat, lng),
        } as NearbyListing;
      })
      .filter((l): l is NearbyListing => l !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [rawListings, center.lat, center.lng]);

  // Auto-expand (mirrors mobile's 1km -> 3km -> ... escalation): only
  // kicks in when the user hasn't manually chosen a radius. Picks the
  // smallest preset that yields at least one result, or the largest
  // preset if none do.
  const effectiveRadiusKm = useMemo(() => {
    if (radiusManuallySet) return radiusKm;
    for (const km of AUTO_EXPAND_RADII_KM) {
      if (withDistance.some((l) => l.distanceKm <= km)) return km;
    }
    return AUTO_EXPAND_RADII_KM[AUTO_EXPAND_RADII_KM.length - 1];
  }, [withDistance, radiusManuallySet, radiusKm]);

  useEffect(() => {
    if (!radiusManuallySet) setRadiusKm(effectiveRadiusKm);
  }, [effectiveRadiusKm, radiusManuallySet]);

  const nearby = useMemo(
    () => withDistance.filter((l) => l.distanceKm <= effectiveRadiusKm),
    [withDistance, effectiveRadiusKm],
  );

  const selectedListing = nearby.find((l) => l.id === selectedId) ?? null;

  function resetRadius() {
    setRadiusManuallySet(false);
    setRadiusKm(RADIUS_PRESETS_KM[2]);
  }

  async function runSearch(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setSearchedPlace(null);
      setSearchError(null);
      resetRadius();
      return;
    }
    setSearching(true);
    setSearchError(null);
    const result = await geocodePlace(trimmed);
    setSearching(false);
    if (!result) {
      setSearchError(t("search.locationNotFound"));
      return;
    }
    setSelectedId(null);
    resetRadius();
    setSearchedPlace(result);
  }

  // Debounced live update while typing (matches the mobile app's
  // search-as-you-type re-centering) -- 600ms keeps this comfortably
  // under Nominatim's ~1 req/sec usage-policy ceiling even on a fast
  // typer, since each keystroke restarts the timer rather than queuing a
  // request per keystroke.
  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 600);
  }

  function onSubmit() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  }

  function clearSearch() {
    setQuery("");
    setSearchedPlace(null);
    setSearchError(null);
    setSelectedId(null);
    resetRadius();
  }

  const mapListings: HeroMapListing[] = nearby.map((l) => ({
    id: l.id,
    lat: l.lat,
    lng: l.lng,
    price: l.price,
    priceLabel: l.priceLabel,
    category: l.category,
    eventPricing: l.eventPricing,
  }));

  return (
    <section className="relative min-h-[90vh] flex items-end overflow-hidden">
      <HeroLiveMap
        center={center}
        radiusKm={effectiveRadiusKm}
        listings={mapListings}
        selectedId={selectedId}
        onMarkerClick={setSelectedId}
        onBackgroundClick={() => setSelectedId(null)}
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Readability gradient over the map, same visual role the old
          static hero-bg image's overlay played. Pointer-events-none so
          map interaction underneath still works everywhere except the
          actual UI chrome below. */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none z-[1]" />

      <div className="container mx-auto px-4 relative z-10 pb-10 pt-32">
        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl font-bold text-foreground leading-tight text-balance drop-shadow-sm"
          >
            {t("home.hero.titleLine1")}{" "}
            <span className="text-accent">{t("home.hero.titleAccent")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-3 text-base text-foreground/80 max-w-lg"
          >
            {t("home.hero.subtitle")}
          </motion.p>
        </div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-6 max-w-3xl"
        >
          <div className="bg-card rounded-xl p-2 card-shadow flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder={t("search.searchThisLocation")}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                className="bg-transparent w-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query && (
                <button onClick={clearSearch} aria-label={t("search.clearLocation")}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button className="px-8" onClick={onSubmit} disabled={searching}>
              <Search className="w-4 h-4 mr-2" />
              {searching ? t("search.searching") : t("search.search")}
            </Button>
          </div>
          {searchError && <p className="text-sm text-destructive mt-2 px-1">{searchError}</p>}

          {/* Distance control -- preset chips + slider, kept in sync,
              same pairing as mobile's chip-row + filter-sheet slider. */}
          <div className="bg-card/95 backdrop-blur-sm rounded-xl p-3 card-shadow mt-2 flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t("search.radiusLabel")}: {t("search.radiusLabelKm", { km: effectiveRadiusKm })}
              {!radiusManuallySet && <span className="ml-1 text-[10px] opacity-70">(auto)</span>}
            </span>
            <div className="flex gap-1.5">
              {RADIUS_PRESETS_KM.map((km) => (
                <button
                  key={km}
                  onClick={() => {
                    setRadiusManuallySet(true);
                    setRadiusKm(km);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    radiusManuallySet && radiusKm === km
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {t("search.radiusLabelKm", { km })}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[140px]">
              <Slider
                min={MIN_RADIUS_KM}
                max={MAX_RADIUS_KM}
                step={1}
                value={[effectiveRadiusKm]}
                onValueChange={([km]) => {
                  setRadiusManuallySet(true);
                  setRadiusKm(km);
                }}
                aria-label={t("search.radiusLabel")}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 whitespace-nowrap"
              onClick={() => navigate(`/find${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`)}
            >
              <List className="w-3.5 h-3.5" />
              {t("search.viewAllListings")}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Inline preview panel -- tapping a pin never navigates on its
          own; this floating card is the same role as the mobile app's
          bottom-sheet preview, and only the button inside it navigates. */}
      {selectedListing && (
        <div className="absolute bottom-6 right-6 z-20 w-72 bg-card rounded-xl card-shadow p-4 hidden sm:block">
          <button
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedId(null)}
            aria-label={t("search.clearLocation")}
          >
            <X className="w-4 h-4" />
          </button>
          <p className="font-semibold text-foreground text-sm pr-4 line-clamp-1">
            {selectedListing.title || t("listingCard.untitledListing")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedListing.city ? `${selectedListing.city} · ` : ""}
            {t("listingCard.distanceKm", { distance: selectedListing.distanceKm.toFixed(1) })}
          </p>
          <div className="flex items-center justify-between mt-3">
            <div>
              {selectedListing.price != null ? (
                <>
                  <span className="text-lg font-bold text-foreground">${selectedListing.price}</span>
                  <span className="text-xs text-muted-foreground ml-1">{t(selectedListing.priceLabel)}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{t("listingCard.contactForPricing")}</span>
              )}
            </div>
            <Button size="sm" className="text-xs h-8" onClick={() => navigate(`/listing/${selectedListing.id}`)}>
              {t("listingCard.view")}
            </Button>
          </div>
          {selectedListing.eventPricing && (
            <div className="flex items-center gap-1 mt-2 text-[11px] text-accent-foreground bg-accent/10 rounded-full px-2 py-0.5 w-fit">
              <Zap className="w-3 h-3" /> {t("search.eventPricing")}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default HeroSection;
