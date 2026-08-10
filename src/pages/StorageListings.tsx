import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DbListingCard from "@/components/listing/DbListingCard";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X, Warehouse, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import DateTimePicker, { DateTimeValue, readDateTimeFromParams } from "@/components/search/DateTimePicker";
import { filterStorageAvailable } from "@/lib/availabilityFilter";

const storageTypes = ["indoor", "outdoor", "heated", "climate-controlled"] as const;
type Duration = "daily" | "weekly" | "monthly" | "seasonal";

export default function StorageListings() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const initialQ = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [city, setCity] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [duration, setDuration] = useState<Duration>("monthly");
  const [sortBy, setSortBy] = useState<"price" | "size">("price");
  const [when, setWhen] = useState<DateTimeValue>(() => readDateTimeFromParams(searchParams, "storage"));
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);

  const runSearch = () => setSearch(searchInput);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data } = await supabase
          .from("listings")
          .select("*")
          .eq("status", "approved");
        const all = (data as any[]) || [];
        const storageOnly = all.filter((l) => {
          const cat = (l?.category || "").toString().toLowerCase();
          const typ = (l?.type || "").toString().toLowerCase();
          return cat === "storage" || typ === "storage" || (!cat && !typ);
        });
        setListings(storageOnly);
      } catch (error) {
        console.error("[StorageListings] Supabase listings query failed", error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const cities = useMemo(() => Array.from(new Set(listings.map((l) => l.city).filter(Boolean))).sort(), [listings]);

  useEffect(() => {
    let cancelled = false;
    const ids = listings.map((l) => l.id);
    if (ids.length === 0 || !when.checkin || !when.checkout) { setAvailableIds(null); return; }
    (async () => {
      const ok = await filterStorageAvailable(ids, { checkin: when.checkin!, checkout: when.checkout! });
      if (!cancelled) setAvailableIds(ok);
    })();
    return () => { cancelled = true; };
  }, [listings, when]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const results = listings.filter((l) => {
      const title = (l?.title || "").toLowerCase();
      const desc = (l?.description || "").toLowerCase();
      const cityV = (l?.city || "").toLowerCase();
      const region = (l?.region || "").toLowerCase();
      const address = (l?.address || "").toLowerCase();
      const matchesSearch = !q || title.includes(q) || desc.includes(q) || cityV.includes(q) || region.includes(q) || address.includes(q);
      const matchesCity = city === "all" || (l?.city || "").toLowerCase() === city.toLowerCase();
      const matchesType = type === "all" || (l?.type || "").toLowerCase() === type;
      const matchesAvail = !availableIds || availableIds.has(l.id);
      return matchesSearch && matchesCity && matchesType && matchesAvail;
    });
    results.sort((a, b) => {
      if (sortBy === "price") {
        const pa = Number(a?.[duration] ?? a?.[`price_${duration}`]) || Infinity;
        const pb = Number(b?.[duration] ?? b?.[`price_${duration}`]) || Infinity;
        return pa - pb;
      }
      return (Number(b?.sqft ?? b?.size_sqft) || 0) - (Number(a?.sqft ?? a?.size_sqft) || 0);
    });
    return results;
  }, [listings, search, city, type, duration, sortBy, availableIds]);

  const activeFilters = [city !== "all" && city, type !== "all" && type].filter(Boolean) as string[];
  const clearAll = () => { setCity("all"); setType("all"); setSearchInput(""); setSearch(""); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-24">
        <section className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">{t("storageListings.title")}</h1>
          <p className="text-muted-foreground">{t("storageListings.subtitle")}</p>
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
              <SelectTrigger className="w-[150px]"><SelectValue placeholder={t("search.city")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("search.allCities")}</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder={t("search.type")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("search.allTypes")}</SelectItem>
                {storageTypes.map((st) => <SelectItem key={st} value={st} className="capitalize">{t(`storageListings.storageType.${st}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={duration} onValueChange={(v) => setDuration(v as Duration)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("search.daily")}</SelectItem>
                <SelectItem value="weekly">{t("storageListings.duration.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("search.monthly")}</SelectItem>
                <SelectItem value="seasonal">{t("storageListings.duration.seasonal")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "price" | "size")}>
              <SelectTrigger className="w-[130px]">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">{t("storageListings.sortBy.price")}</SelectItem>
                <SelectItem value="size">{t("storageListings.sortBy.size")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="min-w-[220px]">
              <DateTimePicker mode="storage" value={when} onChange={setWhen} placeholder={t("storageListings.checkinCheckout")} />
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3">
              {activeFilters.map((f) => (
                <Badge key={f} variant="secondary" className="gap-1 text-xs capitalize">
                  {f}
                  <button onClick={() => { if (cities.includes(f)) setCity("all"); else setType("all"); }} aria-label={t("storageListings.clearFilter", { filter: f })}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAll}>{t("search.clearAll")}</Button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground mb-4">
            {loading ? t("common.loading") : t("storageListings.listingsFound", { count: filtered.length })}
          </p>
          {!loading && filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-xl">
              <Warehouse className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-medium">{t("search.noListingsFound")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("search.tryAdjustingFilters")}</p>
              {activeFilters.length > 0 && (
                <Button variant="outline" className="mt-4" onClick={clearAll}>{t("search.resetFilters")}</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((listing) => <DbListingCard key={listing.id} listing={listing} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
