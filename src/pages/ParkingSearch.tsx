import { useState, useMemo, lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { parkingListings, locationTree, parkingTypes } from "@/data/parkingListings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Clock } from "lucide-react";
import ParkingCard from "@/components/parking/ParkingCard";

const ParkingMap = lazy(() => import("@/components/parking/ParkingMap"));

type PricingMode = "hourly" | "daily" | "monthly";

export default function ParkingSearch() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [province, setProvince] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [pricingMode, setPricingMode] = useState<PricingMode>("daily");

  const countries = Object.keys(locationTree);
  const provinces = country !== "all" ? Object.keys(locationTree[country] || {}) : [];
  const citiesAvail = country !== "all" && province !== "all" ? Object.keys(locationTree[country]?.[province] || {}) : [];
  const regionsAvail = country !== "all" && province !== "all" && city !== "all" ? (locationTree[country]?.[province]?.[city] || []) : [];

  const handleCountry = (v: string) => { setCountry(v); setProvince("all"); setCity("all"); setRegion("all"); };
  const handleProvince = (v: string) => { setProvince(v); setCity("all"); setRegion("all"); };
  const handleCity = (v: string) => { setCity(v); setRegion("all"); };

  const filtered = useMemo(() => {
    return parkingListings
      .filter(l => {
        if (search && !l.title.toLowerCase().includes(search.toLowerCase()) && !l.description.toLowerCase().includes(search.toLowerCase())) return false;
        if (country !== "all" && l.location.country !== country) return false;
        if (province !== "all" && l.location.province !== province) return false;
        if (city !== "all" && l.location.city !== city) return false;
        if (region !== "all" && l.location.region !== region) return false;
        if (type !== "all" && l.type !== type) return false;
        return true;
      })
      .sort((a, b) => a.pricing[pricingMode] - b.pricing[pricingMode]);
  }, [search, country, province, city, region, type, pricingMode]);

  const activeFilters = [country !== "all" && country, province !== "all" && province, city !== "all" && city, region !== "all" && region, type !== "all" && type].filter(Boolean) as string[];

  const clearAll = () => { setCountry("all"); setProvince("all"); setCity("all"); setRegion("all"); setType("all"); setSearch(""); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <section className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Find Parking</h1>
          <p className="text-muted-foreground">Search parking spots with cascading location filters</p>
        </section>

        <section className="container mx-auto px-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search parking…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={country} onValueChange={handleCountry}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            {provinces.length > 0 && (
              <Select value={province} onValueChange={handleProvince}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Province" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem>{provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {citiesAvail.length > 0 && (
              <Select value={city} onValueChange={handleCity}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Cities</SelectItem>{citiesAvail.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {regionsAvail.length > 0 && (
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Region" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Regions</SelectItem>{regionsAvail.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Types</SelectItem>{parkingTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={pricingMode} onValueChange={v => setPricingMode(v as PricingMode)}>
              <SelectTrigger className="w-[120px]"><Clock className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
            </Select>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeFilters.map(f => <Badge key={f} variant="secondary" className="gap-1 text-xs capitalize">{f}</Badge>)}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAll}>Clear all</Button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-sm text-muted-foreground mb-4">{filtered.length} spot{filtered.length !== 1 ? "s" : ""} found</p>
              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No parking spots match your filters.</p>
                  <Button variant="outline" className="mt-3" onClick={clearAll}>Reset Filters</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filtered.map(listing => <ParkingCard key={listing.id} listing={listing} pricingMode={pricingMode} />)}
                </div>
              )}
            </div>
            <div className="hidden lg:block">
              <div className="sticky top-24 h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-border">
                <Suspense fallback={<div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">Loading map…</div>}>
                  <ParkingMap listings={filtered} pricingMode={pricingMode} />
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
