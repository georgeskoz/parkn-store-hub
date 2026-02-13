import { useState, useMemo, useCallback, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { parkingListings, locationTree } from "@/data/parkingListings";
import { storageListings } from "@/data/storageListings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, Navigation, Car, Warehouse, X } from "lucide-react";
import ParkingCard from "@/components/parking/ParkingCard";
import StorageListingCard from "@/components/storage/StorageListingCard";
import DbListingCard from "@/components/listing/DbListingCard";
import { supabase } from "@/integrations/supabase/client";

type Category = "all" | "parking" | "storage";

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const countries = Object.keys(locationTree);
const allProvinces = (country: string) => Object.keys(locationTree[country] || {});
const allCities = (country: string, province: string) => Object.keys(locationTree[country]?.[province] || {});

export default function FindASpot() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [country, setCountry] = useState("all");
  const [province, setProvince] = useState("all");
  const [city, setCity] = useState("all");

  const [destination, setDestination] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const maxDistanceKm = 50;

  const [comparing, setComparing] = useState<string[]>([]);
  const toggleCompare = useCallback((id: string) => {
    setComparing((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));
  }, []);

  // Database listings
  const [dbListings, setDbListings] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("listings").select("*").then(({ data }) => {
      if (data) setDbListings(data);
    });
  }, []);

  const provinces = country !== "all" ? allProvinces(country) : [];
  const citiesAvail = country !== "all" && province !== "all" ? allCities(country, province) : [];

  const handleCountry = (v: string) => { setCountry(v); setProvince("all"); setCity("all"); };
  const handleProvince = (v: string) => { setProvince(v); setCity("all"); };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); setDestination(""); },
      () => setLocating(false)
    );
  };

  const clearLocation = () => { setUserCoords(null); setDestination(""); };

  const destinationCoords = useMemo(() => {
    if (userCoords) return userCoords;
    if (!destination.trim()) return null;
    const q = destination.toLowerCase();
    const allListingLocs = [
      ...parkingListings.map((l) => ({ lat: l.location.lat, lng: l.location.lng, city: l.location.city, address: l.location.address })),
      ...storageListings.map((l) => ({ lat: l.location.lat, lng: l.location.lng, city: l.location.city, address: l.location.address })),
      ...dbListings.map((l) => ({ lat: Number(l.lat), lng: Number(l.lng), city: l.city, address: l.address })),
    ];
    const match = allListingLocs.find((l) => l.city.toLowerCase().includes(q) || l.address.toLowerCase().includes(q));
    return match ? { lat: match.lat, lng: match.lng } : null;
  }, [destination, userCoords, dbListings]);

  type UnifiedListing =
    | { kind: "parking"; data: (typeof parkingListings)[0]; distance?: number }
    | { kind: "storage"; data: (typeof storageListings)[0]; distance?: number }
    | { kind: "db"; data: any; distance?: number };

  const filtered = useMemo(() => {
    let items: UnifiedListing[] = [];

    // Static parking
    if (category !== "storage") {
      parkingListings.forEach((l) => {
        const dist = destinationCoords ? haversine(destinationCoords.lat, destinationCoords.lng, l.location.lat, l.location.lng) : undefined;
        items.push({ kind: "parking", data: l, distance: dist });
      });
    }
    // Static storage
    if (category !== "parking") {
      storageListings.forEach((l) => {
        const dist = destinationCoords ? haversine(destinationCoords.lat, destinationCoords.lng, l.location.lat, l.location.lng) : undefined;
        items.push({ kind: "storage", data: l, distance: dist });
      });
    }

    // Database listings
    dbListings.forEach((l) => {
      if (category !== "all" && l.category !== category) return;
      const dist = destinationCoords ? haversine(destinationCoords.lat, destinationCoords.lng, Number(l.lat), Number(l.lng)) : undefined;
      items.push({ kind: "db", data: l, distance: dist });
    });

    // Text search
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => {
        const d = i.data;
        return d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
      });
    }

    // Location filters
    if (country !== "all") {
      items = items.filter((i) => {
        if (i.kind === "db") return i.data.country === country;
        return i.data.location.country === country;
      });
    }
    if (province !== "all") {
      items = items.filter((i) => {
        if (i.kind === "db") return i.data.province === province;
        return i.data.location.province === province;
      });
    }
    if (city !== "all") {
      items = items.filter((i) => {
        if (i.kind === "db") return i.data.city === city;
        return i.data.location.city === city;
      });
    }

    // Distance filter
    if (destinationCoords) {
      items = items.filter((i) => i.distance !== undefined && i.distance <= maxDistanceKm);
      items.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    }

    return items;
  }, [search, category, country, province, city, destinationCoords, dbListings]);

  const activeFilters = [country !== "all" && country, province !== "all" && province, city !== "all" && city].filter(Boolean) as string[];
  const clearAll = () => { setCountry("all"); setProvince("all"); setCity("all"); setSearch(""); clearLocation(); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <section className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Find a Spot</h1>
          <p className="text-muted-foreground">Browse parking & storage spaces across Quebec</p>
        </section>

        <section className="container mx-auto px-4 mb-4">
          <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="parking" className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" />Parking</TabsTrigger>
              <TabsTrigger value="storage" className="flex items-center gap-1.5"><Warehouse className="w-3.5 h-3.5" />Storage</TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        <section className="container mx-auto px-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search listings…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={country} onValueChange={handleCountry}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Countries</SelectItem>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            {provinces.length > 0 && (
              <Select value={province} onValueChange={handleProvince}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Province" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Provinces</SelectItem>{provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {citiesAvail.length > 0 && (
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="City" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Cities</SelectItem>{citiesAvail.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center mt-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Near a destination (city or address)…"
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setUserCoords(null); }}
                className="pl-9 pr-8"
              />
              {(destination || userCoords) && (
                <button onClick={clearLocation} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleUseMyLocation} disabled={locating} className="gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              {locating ? "Locating…" : "Use my location"}
            </Button>
            {userCoords && (
              <Badge variant="secondary" className="text-xs">
                📍 Near you ({userCoords.lat.toFixed(2)}, {userCoords.lng.toFixed(2)})
              </Badge>
            )}
          </div>

          {(activeFilters.length > 0 || destinationCoords) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeFilters.map((f) => <Badge key={f} variant="secondary" className="gap-1 text-xs capitalize">{f}</Badge>)}
              {destinationCoords && !userCoords && destination && (
                <Badge variant="secondary" className="text-xs">📍 Near "{destination}"</Badge>
              )}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAll}>Clear all</Button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No spots match your filters.</p>
              <Button variant="outline" className="mt-3" onClick={clearAll}>Reset Filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => {
                if (item.kind === "db") {
                  return <DbListingCard key={`db-${item.data.id}`} listing={item.data} distance={item.distance} />;
                }
                if (item.kind === "parking") {
                  return (
                    <div key={`p-${item.data.id}`} className="relative">
                      {item.distance !== undefined && (
                        <Badge className="absolute top-2 right-2 z-10 bg-card/90 backdrop-blur-sm text-foreground border border-border text-[10px]">
                          {item.distance.toFixed(1)} km away
                        </Badge>
                      )}
                      <ParkingCard listing={item.data} pricingMode="daily" />
                    </div>
                  );
                } else {
                  return (
                    <div key={`s-${item.data.id}`} className="relative">
                      {item.distance !== undefined && (
                        <Badge className="absolute top-2 right-2 z-10 bg-card/90 backdrop-blur-sm text-foreground border border-border text-[10px]">
                          {item.distance.toFixed(1)} km away
                        </Badge>
                      )}
                      <StorageListingCard listing={item.data} duration="monthly" isComparing={comparing.includes(item.data.id)} onToggleCompare={toggleCompare} />
                    </div>
                  );
                }
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
