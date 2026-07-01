import { useState, useMemo, useEffect } from "react";
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

export default function FindASpot() {
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
  const maxDistanceKm = 50;
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
        const { data } = await supabase.from("listings").select("*").eq("status", "approved");
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
    if (q !== null) setSearch(q);
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

  const clearLocation = () => { setUserCoords(null); setDestination(""); };

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
      items = items.filter((l) => l.distance !== undefined && l.distance <= maxDistanceKm);
      items.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    }
    if (availableIds) items = items.filter((l) => availableIds.has(l.id));
    return items;
  }, [listings, search, category, city, destinationCoords, availableIds]);

  const activeFilters = [city !== "all" && city].filter(Boolean) as string[];
  const clearAll = () => { setCity("all"); setSearch(""); clearLocation(); };

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
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
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
                placeholder="Near a destination (city or address)…"
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setUserCoords(null); }}
                className="pl-9 pr-8"
              />
              {(destination || userCoords) && (
                <button onClick={clearLocation} aria-label="Clear location" className="absolute right-3 top-1/2 -translate-y-1/2">
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
            {loading ? "Loading…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} found`}
          </p>

          {!loading && filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-xl">
              <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-medium">No listings found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or check back soon.</p>
              <Button variant="outline" className="mt-4" onClick={clearAll}>Reset Filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((l) => <DbListingCard key={l.id} listing={l} distance={l.distance} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
