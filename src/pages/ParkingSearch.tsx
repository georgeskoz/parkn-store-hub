import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, MapPin } from "lucide-react";
import DbListingCard from "@/components/listing/DbListingCard";
import { useSearchParams } from "react-router-dom";
import DateTimePicker, { DateTimeValue, readDateTimeFromParams } from "@/components/search/DateTimePicker";
import { filterParkingAvailable } from "@/lib/availabilityFilter";

const ListingsMap = lazy(() => import("@/components/listing/ListingsMap"));

type PricingMode = "hourly" | "daily" | "monthly";
const parkingTypes = ["outdoor", "indoor", "covered", "underground"] as const;

export default function ParkingSearch() {
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [city, setCity] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [pricingMode, setPricingMode] = useState<PricingMode>("daily");
  const [when, setWhen] = useState<DateTimeValue>(() => readDateTimeFromParams(searchParams, "parking"));
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data } = await supabase
          .from("listings")
          .select("*")
          .eq("status", "approved")
          .or("category.eq.parking,type.eq.parking");
        const all = (data as any[]) || [];
        const parkingOnly = all.filter((l) => {
          const cat = (l?.category || "").toString().toLowerCase();
          const typ = (l?.type || "").toString().toLowerCase();
          return cat === "parking" || typ === "parking";
        });
        setListings(parkingOnly);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const cities = useMemo(() => Array.from(new Set(listings.map((l) => l.city).filter(Boolean))).sort(), [listings]);

  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase();
    return listings
      .filter((l) => {
        if (q) {
          const title = (l?.title || "").toLowerCase();
          const desc = (l?.description || "").toLowerCase();
          if (!title.includes(q) && !desc.includes(q)) return false;
        }
        if (city !== "all" && l.city !== city) return false;
        if (type !== "all" && (l?.type || "").toLowerCase() !== type) return false;
        return true;
      })
      .sort((a, b) => {
        const pa = Number(a?.[pricingMode] ?? a?.[`price_${pricingMode}`]) || Infinity;
        const pb = Number(b?.[pricingMode] ?? b?.[`price_${pricingMode}`]) || Infinity;
        return pa - pb;
      });
  }, [listings, search, city, type, pricingMode]);

  const activeFilters = [city !== "all" && city, type !== "all" && type].filter(Boolean) as string[];
  const clearAll = () => { setCity("all"); setType("all"); setSearch(""); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <section className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Find Parking</h1>
          <p className="text-muted-foreground">Search verified parking spots across Quebec</p>
        </section>

        <section className="container mx-auto px-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search parking…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {parkingTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={pricingMode} onValueChange={(v) => setPricingMode(v as PricingMode)}>
              <SelectTrigger className="w-[120px]"><Clock className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeFilters.map((f) => <Badge key={f} variant="secondary" className="gap-1 text-xs capitalize">{f}</Badge>)}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAll}>Clear all</Button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-sm text-muted-foreground mb-4">
                {loading ? "Loading…" : `${filtered.length} spot${filtered.length !== 1 ? "s" : ""} found`}
              </p>
              {!loading && filtered.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-xl">
                  <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-foreground font-medium">No listings found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or check back soon.</p>
                  {activeFilters.length > 0 && (
                    <Button variant="outline" className="mt-4" onClick={clearAll}>Reset Filters</Button>
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
                <Suspense fallback={<div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">Loading map…</div>}>
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
