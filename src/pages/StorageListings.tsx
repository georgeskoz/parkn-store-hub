import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StorageListingCard from "@/components/storage/StorageListingCard";
import ComparisonBar from "@/components/storage/ComparisonBar";
import ComparisonModal from "@/components/storage/ComparisonModal";
import { storageListings, storageTypes, durationOptions, cities, DurationOption } from "@/data/storageListings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X } from "lucide-react";

export default function StorageListings() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [duration, setDuration] = useState<DurationOption>("monthly");
  const [sortBy, setSortBy] = useState<"price" | "rating" | "size">("price");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const filtered = useMemo(() => {
    let results = storageListings.filter(l => {
      const matchesSearch = !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase());
      const matchesCity = city === "all" || l.location.city === city;
      const matchesType = type === "all" || l.type === type;
      return matchesSearch && matchesCity && matchesType;
    });

    results.sort((a, b) => {
      if (sortBy === "price") return a.pricing[duration] - b.pricing[duration];
      if (sortBy === "rating") return b.rating - a.rating;
      return b.sqft - a.sqft;
    });

    return results;
  }, [search, city, type, duration, sortBy]);

  const toggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const compareItems = storageListings.filter(l => compareIds.includes(l.id));
  const activeFilters = [city !== "all" && city, type !== "all" && type].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-24">
        {/* Header */}
        <section className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Find Storage</h1>
          <p className="text-muted-foreground">Compare and book secure storage spaces across Quebec</p>
        </section>

        {/* Filters */}
        <section className="container mx-auto px-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search listings…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {storageTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={duration} onValueChange={v => setDuration(v as DurationOption)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {durationOptions.map(d => (
                  <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={v => setSortBy(v as "price" | "rating" | "size")}>
              <SelectTrigger className="w-[130px]">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3">
              {activeFilters.map(f => (
                <Badge key={f} variant="secondary" className="gap-1 text-xs capitalize">
                  {f}
                  <button onClick={() => { if (cities.includes(f)) setCity("all"); else setType("all"); }} aria-label={`Clear ${f} filter`}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => { setCity("all"); setType("all"); setSearch(""); }}>
                Clear all
              </Button>
            </div>
          )}
        </section>

        {/* Results */}
        <section className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} listing{filtered.length !== 1 ? "s" : ""} found</p>
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No listings match your filters.</p>
              <Button variant="outline" className="mt-3" onClick={() => { setCity("all"); setType("all"); setSearch(""); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(listing => (
                <StorageListingCard
                  key={listing.id}
                  listing={listing}
                  duration={duration}
                  isComparing={compareIds.includes(listing.id)}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <ComparisonBar
        items={compareItems}
        duration={duration}
        onRemove={id => setCompareIds(prev => prev.filter(x => x !== id))}
        onCompare={() => setShowComparison(true)}
      />

      <ComparisonModal
        items={compareItems}
        duration={duration}
        open={showComparison}
        onClose={() => setShowComparison(false)}
      />

      <Footer />
    </div>
  );
}
