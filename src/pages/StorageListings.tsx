import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DbListingCard from "@/components/listing/DbListingCard";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X, Warehouse } from "lucide-react";

const storageTypes = ["indoor", "outdoor", "heated", "climate-controlled"] as const;
type Duration = "daily" | "weekly" | "monthly" | "seasonal";

export default function StorageListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [duration, setDuration] = useState<Duration>("monthly");
  const [sortBy, setSortBy] = useState<"price" | "size">("price");

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data } = await supabase
          .from("listings")
          .select("*")
          .eq("status", "approved")
          .or("category.eq.storage,type.eq.storage");
        const all = (data as any[]) || [];
        const storageOnly = all.filter((l) => {
          const cat = (l?.category || "").toString().toLowerCase();
          const typ = (l?.type || "").toString().toLowerCase();
          return cat === "storage" || typ === "storage";
        });
        setListings(storageOnly);
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
    const results = listings.filter((l) => {
      const title = (l?.title || "").toLowerCase();
      const desc = (l?.description || "").toLowerCase();
      const matchesSearch = !q || title.includes(q) || desc.includes(q);
      const matchesCity = city === "all" || l.city === city;
      const matchesType = type === "all" || (l?.type || "").toLowerCase() === type;
      return matchesSearch && matchesCity && matchesType;
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
  }, [listings, search, city, type, duration, sortBy]);

  const activeFilters = [city !== "all" && city, type !== "all" && type].filter(Boolean) as string[];
  const clearAll = () => { setCity("all"); setType("all"); setSearch(""); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-24">
        <section className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Find Storage</h1>
          <p className="text-muted-foreground">Browse verified storage spaces across Quebec</p>
        </section>

        <section className="container mx-auto px-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search listings…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {storageTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={duration} onValueChange={(v) => setDuration(v as Duration)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "price" | "size")}>
              <SelectTrigger className="w-[130px]">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3">
              {activeFilters.map((f) => (
                <Badge key={f} variant="secondary" className="gap-1 text-xs capitalize">
                  {f}
                  <button onClick={() => { if (cities.includes(f)) setCity("all"); else setType("all"); }} aria-label={`Clear ${f} filter`}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAll}>Clear all</Button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground mb-4">
            {loading ? "Loading…" : `${filtered.length} listing${filtered.length !== 1 ? "s" : ""} found`}
          </p>
          {!loading && filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-xl">
              <Warehouse className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-medium">No listings found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or check back soon.</p>
              {activeFilters.length > 0 && (
                <Button variant="outline" className="mt-4" onClick={clearAll}>Reset Filters</Button>
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
