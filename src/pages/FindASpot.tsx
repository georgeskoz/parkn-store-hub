import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, Navigation, Car, Warehouse, X, Loader2 } from "lucide-react";
import DbListingCard from "@/components/listing/DbListingCard";
import { useSearchParams } from "react-router-dom";
import DateTimePicker, { DateTimeValue, readDateTimeFromParams } from "@/components/search/DateTimePicker";
import { filterParkingAvailable, filterStorageAvailable } from "@/lib/availabilityFilter";
import { ANON_SAFE_LISTING_COLUMNS } from "@/lib/listingsAnonColumns";

// Same split map+list view ParkingSearch.tsx (/parking) already has --
// FindASpot (/find) is what the landing page's unified search bar actually
// navigates to (see HeroSection.tsx's handleSearch), so it was the one
// results page missing the map. Lazy + Suspense, matching ParkingSearch,
// since leaflet/leaflet.markercluster are a real bundle-size cost not worth
// paying on every page that doesn't render a map.
const ListingsMap = lazy(() => import("@/components/listing/ListingsMap"));

type Category = "all" | "parking" | "storage";

// null = "No limit" — the default. A user searching near a destination they
// don't live in (planning a trip to a landmark, a different city entirely)
// should see every matching result by default, not be silently capped to a
// small radius. 100 is the top fixed step ("100km+" — city-to-city
// distances like Ottawa->Montreal are ~200km, well past it, which is
// exactly what "No limit" covers) rather than an unbounded free-form input.
const RADIUS_OPTIONS_KM: (number | null)[] = [null, 0.3, 1, 2, 5, 10, 25, 50, 100];

function formatRadiusLabel(km: number | null, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (km == null) return t("search.radiusNoLimit");
  if (km < 1) return t("search.radiusLabelM", { m: Math.round(km * 1000) });
  if (km >= 100) return t("search.radiusLabelKmPlus", { km });
  return t("search.radiusLabelKm", { km });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FindASpot() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const runSearch = () => setSearch(searchInput);
  const [category, setCategory] = useState<Category>("all");
  const [city, setCity] = useState("all");
  const [destination, setDestination] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  // User-controlled search radius, in km. null = "No limit" (the default) —
  // see RADIUS_OPTIONS_KM above. Previously this was a hardcoded
  // maxDistanceKm = 50 applied unconditionally whenever a destination was
  // set, which silently returned zero results for any legitimate
  // longer-distance search (e.g. Ottawa -> Montreal, ~200km) with no error
  // or "try widening" messaging — confirmed live, not assumed.
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const pickerMode: "parking" | "storage" = category === "storage" ? "storage" : "parking";
  const [when, setWhen] = useState<DateTimeValue>(() => ({
    ...readDateTimeFromParams(searchParams, "parking"),
    ...readDateTimeFromParams(searchParams, "storage"),
  }));
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        // Scoped to exactly what anon can read (ANON_SAFE_LISTING_COLUMNS)
        // — a bare .select("*") fails outright for a signed-out visitor
        // with "permission denied for table listings", since Postgres
        // checks column privileges for every column at once, not just the
        // ones actually used. Confirmed live: this was silently breaking
        // anonymous browsing on this exact page.
        const { data, error } = await supabase.from("listings").select(ANON_SAFE_LISTING_COLUMNS).eq("status", "approved");
        if (error) {
          console.error("[FindASpot] Supabase listings query failed", error);
          setListings([]);
          return;
        }
        setListings(data || []);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) { setSearchInput(q); setSearch(q); }
  }, [searchParams]);

  const cities = useMemo(() => Array.from(new Set(listings.map((l) => l.city).filter(Boolean))).sort(), [listings]);

  // Recompute available-listing set when date/time or listings change
  useEffect(() => {
    let cancelled = false;
    const ids = listings.map((l) => l.id);
    if (ids.length === 0) { setAvailableIds(null); return; }
    const run = async () => {
      if (pickerMode === "parking" && when.date) {
        const ok = await filterParkingAvailable(ids, { date: when.date, start: when.start, end: when.end });
        if (!cancelled) setAvailableIds(ok);
      } else if (pickerMode === "storage" && when.checkin && when.checkout) {
        const ok = await filterStorageAvailable(ids, { checkin: when.checkin, checkout: when.checkout });
        if (!cancelled) setAvailableIds(ok);
      } else {
        setAvailableIds(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [listings, when, pickerMode]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); setDestination(""); },
      () => setLocating(false)
    );
  };

  const clearLocation = () => { setUserCoords(null); setDestination(""); setRadiusKm(null); };

  const destinationCoords = useMemo(() => {
    if (userCoords) return userCoords;
    if (!(destination || "").trim()) return null;
    const q = (destination || "").toLowerCase();
    const match = listings.find((l) => (l?.city || "").toLowerCase().includes(q) || (l?.address || "").toLowerCase().includes(q));
    return match ? { lat: Number(match.lat), lng: Number(match.lng) } : null;
  }, [destination, userCoords, listings]);

  const filtered = useMemo(() => {
    let items = listings.map((l) => ({
      ...l,
      distance: destinationCoords
        ? haversine(destinationCoords.lat, destinationCoords.lng, Number(l.lat), Number(l.lng))
        : undefined,
    }));

    if (category !== "all") {
      items = items.filter((l) => {
        const cat = (l?.category || "").toLowerCase();
        const typ = (l?.type || "").toLowerCase();
        if (category === "parking") return cat === "parking" || typ === "parking";
        if (category === "storage") return cat === "storage" || typ === "storage";
        return true;
      });
    }
    if (city !== "all") items = items.filter((l) => l.city === city);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((l) =>
        (l?.title || "").toLowerCase().includes(q) ||
        (l?.description || "").toLowerCase().includes(q) ||
        (l?.city || "").toLowerCase().includes(q) ||
        (l?.region || "").toLowerCase().includes(q) ||
        (l?.address || "").toLowerCase().includes(q)
      );
    }
    if (destinationCoords) {
      // radiusKm === null -> no cutoff at all, every matching result shows.
      items = items.filter((l) => l.distance !== undefined && (radiusKm == null || l.distance <= radiusKm));
      items.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    }
    if (availableIds) items = items.filter((l) => availableIds.has(l.id));
    return items;
  }, [listings, search, category, city, destinationCoords, radiusKm, availableIds]);

  const activeFilters = [city !== "all" && city].filter(Boolean) as string[];
  const clearAll = () => { setCity("all"); setSearchInput(""); setSearch(""); clearLocation(); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <section className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">{t("search.findASpotTitle")}</h1>
          <p className="text-muted-foreground">{t("search.browseAcrossQuebec")}</p>
        </section>

        <section className="container mx-auto px-4 mb-4">
          <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
            <TabsList>
              <TabsTrigger value="all">{t("search.all")}</TabsTrigger>
              <TabsTrigger value="parking" className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" />{t("search.parking")}</TabsTrigger>
              <TabsTrigger value="storage" className="flex items-center gap-1.5"><Warehouse className="w-3.5 h-3.5" />{t("search.storage")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        <section className="container mx-auto px-4 mb-4">
          <div className="flex gap-2 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={t("search.searchByCityOrAddress")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
                className="w-full border border-input bg-background rounded-lg pl-9 pr-4 py-2 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={runSearch}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-2 h-11 rounded-lg font-medium whitespace-nowrap inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? t("search.searching") : t("search.search")}
            </button>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("search.city")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("search.allCities")}</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="min-w-[220px]">
              <DateTimePicker mode={pickerMode} value={when} onChange={setWhen} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center mt-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("search.nearDestination")}
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setUserCoords(null); }}
                className="pl-9 pr-8"
              />
              {(destination || userCoords) && (
                <button onClick={clearLocation} aria-label={t("search.clearLocation")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleUseMyLocation} disabled={locating} className="gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              {locating ? t("search.locating") : t("search.useMyLocation")}
            </Button>
            {userCoords && (
              <Badge variant="secondary" className="text-xs">
                {t("search.nearYou", { lat: userCoords.lat.toFixed(2), lng: userCoords.lng.toFixed(2) })}
              </Badge>
            )}
          </div>

          {/* Only meaningful once there's a destination to measure from.
              "No limit" (radiusKm === null) is the first chip and the
              default — see RADIUS_OPTIONS_KM above. */}
          {destinationCoords && (
            <div className="flex flex-wrap gap-2 items-center mt-3">
              <span className="text-xs text-muted-foreground mr-1">{t("search.radiusLabel")}:</span>
              {RADIUS_OPTIONS_KM.map((km) => {
                const active = radiusKm === km;
                return (
                  <button
                    key={km ?? "none"}
                    type="button"
                    onClick={() => setRadiusKm(km)}
                    aria-pressed={active}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {formatRadiusLabel(km, t)}
                  </button>
                );
              })}
            </div>
          )}

          {(activeFilters.length > 0 || destinationCoords) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeFilters.map((f) => <Badge key={f} variant="secondary" className="gap-1 text-xs capitalize">{f}</Badge>)}
              {destinationCoords && !userCoords && destination && (
                <Badge variant="secondary" className="text-xs">{t("search.nearQuoted", { destination })}</Badge>
              )}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAll}>{t("search.clearAll")}</Button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-sm text-muted-foreground mb-4">
                {loading ? t("common.loading") : t("search.resultsFound", { count: filtered.length })}
              </p>

              {!loading && filtered.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-xl">
                  <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-foreground font-medium">{t("search.noListingsFound")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("search.tryAdjustingFilters")}</p>
                  <Button variant="outline" className="mt-4" onClick={clearAll}>{t("search.resetFilters")}</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filtered.map((l) => <DbListingCard key={l.id} listing={l} distance={l.distance} />)}
                </div>
              )}
            </div>
            <div className="hidden lg:block">
              <div className="sticky top-24 h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-border">
                <Suspense fallback={<div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">{t("search.loadingMap")}</div>}>
                  <ListingsMap listings={filtered} />
                </Suspense>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
