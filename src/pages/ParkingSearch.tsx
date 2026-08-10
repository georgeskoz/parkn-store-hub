import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, MapPin, Loader2 } from "lucide-react";
import DbListingCard from "@/components/listing/DbListingCard";
import { useSearchParams } from "react-router-dom";
import DateTimePicker, { DateTimeValue, readDateTimeFromParams } from "@/components/search/DateTimePicker";
import { filterParkingAvailable } from "@/lib/availabilityFilter";

const ListingsMap = lazy(() => import("@/components/listing/ListingsMap"));

type PricingMode = "hourly" | "daily" | "monthly";
const parkingTypes = ["outdoor", "indoor", "covered", "underground"] as const;

const hasSelectedParkingDate = (value: DateTimeValue) => Boolean(value?.date);

const buildParkingListingsDebugQuery = (location: string, hasDate: boolean) => {
  const q = location.trim();
  const filters = ["status = 'approved'"];
  const restFilters = ["status=eq.approved"];

  if (q) {
    filters.push(`city ilike '%${q}%' OR region ilike '%${q}%' OR address ilike '%${q}%'`);
    restFilters.push(`or=(city.ilike.%${q}%,region.ilike.%${q}%,address.ilike.%${q}%)`);
  }

  return {
    table: "listings",
    select: "*",
    supabaseJs: `supabase.from("listings").select("*").eq("status", "approved")${q ? `.or("city.ilike.%${q}%,region.ilike.%${q}%,address.ilike.%${q}%")` : ""}`,
    restPath: `/rest/v1/listings?select=*&${restFilters.join("&")}`,
    filters,
    availabilityFilter: hasDate ? "applied after listings query" : "skipped - no date selected",
    note: "No category filter is sent to the database; parking/storage matching is applied client-side against category/type when present.",
  };
};

export default function ParkingSearch() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const initialQ = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [city, setCity] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [pricingMode, setPricingMode] = useState<PricingMode>("daily");
  const [when, setWhen] = useState<DateTimeValue>(() => readDateTimeFromParams(searchParams, "parking"));
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);

  const runSearch = () => setSearch(searchInput);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const q = (search || "").trim();
      const hasDate = hasSelectedParkingDate(when);
      const shouldDebugOttawa = !hasDate && q.toLowerCase() === "ottawa";

      try {
        let query = supabase
          .from("listings")
          .select("*")
          .eq("status", "approved");

        if (q) {
          query = query.or(`city.ilike.%${q}%,region.ilike.%${q}%,address.ilike.%${q}%`);
        }

        if (shouldDebugOttawa) {
          console.log("[ParkingSearch] Supabase query", buildParkingListingsDebugQuery(q, hasDate));
        }

        const { data, error } = await query;

        if (shouldDebugOttawa) {
          console.log("[ParkingSearch] Raw Supabase listings results", data || []);
        }

        if (error) {
          console.error("[ParkingSearch] Supabase listings query failed", error);
          setListings([]);
          return;
        }

        const all = (data as any[]) || [];
        const parkingOnly = all.filter((l) => {
          const cat = (l?.category || "").toString().toLowerCase();
          const typ = (l?.type || "").toString().toLowerCase();
          return cat === "parking" || typ === "parking" || (!cat && !typ);
        });
        setListings(parkingOnly);
      } catch (error) {
        console.error("[ParkingSearch] Unexpected listings fetch failure", error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [search, when]);

  const cities = useMemo(() => Array.from(new Set(listings.map((l) => l.city).filter(Boolean))).sort(), [listings]);

  useEffect(() => {
    let cancelled = false;
    const ids = listings.map((l) => l.id);
    if (ids.length === 0 || !when.date) { setAvailableIds(null); return; }
    (async () => {
      const ok = await filterParkingAvailable(ids, { date: when.date!, start: when.start, end: when.end });
      if (!cancelled) setAvailableIds(ok);
    })();
    return () => { cancelled = true; };
  }, [listings, when]);

  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase();
    return listings
      .filter((l) => {
        if (q) {
          const title = (l?.title || "").toLowerCase();
          const desc = (l?.description || "").toLowerCase();
          const cityV = (l?.city || "").toLowerCase();
          const region = (l?.region || "").toLowerCase();
          const address = (l?.address || "").toLowerCase();
          if (!title.includes(q) && !desc.includes(q) && !cityV.includes(q) && !region.includes(q) && !address.includes(q)) return false;
        }
        if (city !== "all" && (l?.city || "").toLowerCase() !== city.toLowerCase()) return false;
        if (type !== "all" && (l?.type || "").toLowerCase() !== type) return false;
        if (availableIds && !availableIds.has(l.id)) return false;
        return true;
      })
      .sort((a, b) => {
        const pa = Number(a?.[pricingMode] ?? a?.[`price_${pricingMode}`]) || Infinity;
        const pb = Number(b?.[pricingMode] ?? b?.[`price_${pricingMode}`]) || Infinity;
        return pa - pb;
      });
  }, [listings, search, city, type, pricingMode, availableIds]);

  const activeFilters = [city !== "all" && city, type !== "all" && type].filter(Boolean) as string[];
  const clearAll = () => { setCity("all"); setType("all"); setSearchInput(""); setSearch(""); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <section className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">{t("search.findParkingTitle")}</h1>
          <p className="text-muted-foreground">{t("search.searchVerifiedParking")}</p>
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
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder={t("search.type")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("search.allTypes")}</SelectItem>
                {parkingTypes.map((pt) => <SelectItem key={pt} value={pt} className="capitalize">{t(`search.parkingType.${pt}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={pricingMode} onValueChange={(v) => setPricingMode(v as PricingMode)}>
              <SelectTrigger className="w-[120px]"><Clock className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">{t("search.hourly")}</SelectItem>
                <SelectItem value="daily">{t("search.daily")}</SelectItem>
                <SelectItem value="monthly">{t("search.monthly")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="min-w-[220px]">
              <DateTimePicker mode="parking" value={when} onChange={setWhen} />
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeFilters.map((f) => <Badge key={f} variant="secondary" className="gap-1 text-xs capitalize">{f}</Badge>)}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAll}>{t("search.clearAll")}</Button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-sm text-muted-foreground mb-4">
                {loading ? t("common.loading") : t("search.spotsFound", { count: filtered.length })}
              </p>
              {!loading && filtered.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-xl">
                  <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-foreground font-medium">{t("search.noListingsFound")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("search.tryAdjustingFilters")}</p>
                  {activeFilters.length > 0 && (
                    <Button variant="outline" className="mt-4" onClick={clearAll}>{t("search.resetFilters")}</Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filtered.map((listing) => <DbListingCard key={listing.id} listing={listing} />)}
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
