import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Car, Warehouse, MapPin, DollarSign, ListChecks, ChevronRight, ChevronLeft, Check, Landmark, GraduationCap, CalendarCheck, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const STEPS = ["Type", "Location", "Details", "Pricing", "Extras", "Review"];

const PARKING_FEATURES = ["EV Charging", "24/7 Access", "Security Camera", "CCTV", "Heated", "Covered", "Well-lit", "Near Metro", "Wheelchair Accessible", "Gated", "Attendant On-Site"];
const STORAGE_FEATURES = ["24/7 Access", "Heated", "Climate Controlled", "Security Camera", "CCTV", "Loading Dock", "Drive-in Access", "Insurance Available", "Elevator Access", "Fire Suppression", "Gated", "Ground Floor"];

const AVAILABILITY_OPTIONS = ["available", "limited", "waitlist", "full"] as const;

const COMMON_LANDMARKS = [
  "University", "Hospital", "Airport", "Train Station", "Metro Station", "Bus Terminal",
  "Shopping Mall", "Stadium", "Convention Centre", "Tourist Attraction", "Downtown Core",
  "Industrial Park", "Government Building", "Court House",
];

export default function ListYourSpace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    category: "" as "" | "parking" | "storage",
    type: "",
    title: "",
    description: "",
    address: "",
    city: "",
    province: "",
    country: "",
    region: "",
    features: [] as string[],
    availability: "available" as string,
    // Parking
    spots: "1",
    hourly: "",
    daily: "",
    monthly: "",
    // Storage
    size: "",
    sqft: "",
    weekly: "",
    seasonal: "",
    cancellation: "moderate",
    // Extras
    studentDiscount: false,
    studentDiscountPercent: "10",
    studentUniversities: "" ,
    nearbyLandmarks: [] as string[],
    customLandmark: "",
  });

  const update = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));
  const toggleFeature = (f: string) =>
    setForm((p) => ({ ...p, features: p.features.includes(f) ? p.features.filter((x) => x !== f) : [...p.features, f] }));
  const toggleLandmark = (l: string) =>
    setForm((p) => ({ ...p, nearbyLandmarks: p.nearbyLandmarks.includes(l) ? p.nearbyLandmarks.filter((x) => x !== l) : [...p.nearbyLandmarks, l] }));
  const addCustomLandmark = () => {
    const l = form.customLandmark.trim();
    if (l && !form.nearbyLandmarks.includes(l)) {
      setForm((p) => ({ ...p, nearbyLandmarks: [...p.nearbyLandmarks, l], customLandmark: "" }));
    }
  };

  const featureOptions = form.category === "parking" ? PARKING_FEATURES : STORAGE_FEATURES;

  const canNext = () => {
    if (step === 0) return !!form.category && !!form.type;
    if (step === 1) return !!form.title && !!form.address && !!form.city && !!form.province && !!form.country;
    if (step === 2) return !!form.description;
    if (step === 3) return form.category === "parking" ? !!form.daily : !!form.monthly;
    return true;
  };

  const handleSubmit = () => {
    toast({ title: "Listing created!", description: "Your space has been submitted for review." });
    navigate("/dashboard");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign in required</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in to list a space.</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-1">List Your Space</h1>
        <p className="text-muted-foreground mb-8">Create a new parking or storage listing in a few steps.</p>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Card className="card-shadow">
          <CardContent className="p-6">
            {/* Step 0: Category + Type */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">What are you listing?</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {(["parking", "storage"] as const).map((cat) => (
                      <div
                        key={cat}
                        onClick={() => update("category", cat)}
                        className={`p-6 rounded-lg border-2 cursor-pointer transition-all text-center ${form.category === cat ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      >
                        {cat === "parking" ? <Car className="w-8 h-8 mx-auto mb-2 text-primary" /> : <Warehouse className="w-8 h-8 mx-auto mb-2 text-primary" />}
                        <p className="font-medium capitalize text-foreground">{cat}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {form.category && (
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => update("type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {form.category === "parking"
                          ? ["outdoor", "indoor", "covered", "underground"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)
                          : ["indoor", "outdoor", "heated", "climate-controlled"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Location */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary mb-2"><MapPin className="w-5 h-5" /><span className="font-semibold text-foreground">Location & Title</span></div>
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Downtown Heated Garage" /></div>
                <div><Label>Street Address</Label><Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Rue Example" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Montreal" /></div>
                  <div><Label>Region / Neighbourhood</Label><Input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Downtown" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Province / State</Label><Input value={form.province} onChange={(e) => update("province", e.target.value)} placeholder="Quebec" /></div>
                  <div><Label>Country</Label><Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="Canada" /></div>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary mb-2"><ListChecks className="w-5 h-5" /><span className="font-semibold text-foreground">Details & Features</span></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="Describe your space — access instructions, restrictions, dimensions…" /></div>
                {form.category === "parking" && (
                  <div><Label>Available Spots</Label><Input type="number" min="1" value={form.spots} onChange={(e) => update("spots", e.target.value)} /></div>
                )}
                {form.category === "storage" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Size (e.g. 10x20)</Label><Input value={form.size} onChange={(e) => update("size", e.target.value)} /></div>
                    <div><Label>Sqft</Label><Input type="number" value={form.sqft} onChange={(e) => update("sqft", e.target.value)} /></div>
                  </div>
                )}
                <div>
                  <Label>Features & Amenities</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {featureOptions.map((f) => (
                      <Badge key={f} variant={form.features.includes(f) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleFeature(f)}>{f}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Availability</Label>
                  <Select value={form.availability} onValueChange={(v) => update("availability", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Pricing */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary mb-2"><DollarSign className="w-5 h-5" /><span className="font-semibold text-foreground">Pricing</span></div>
                {form.category === "parking" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Hourly ($)</Label><Input type="number" value={form.hourly} onChange={(e) => update("hourly", e.target.value)} /></div>
                    <div><Label>Daily ($)</Label><Input type="number" value={form.daily} onChange={(e) => update("daily", e.target.value)} /></div>
                    <div><Label>Monthly ($)</Label><Input type="number" value={form.monthly} onChange={(e) => update("monthly", e.target.value)} /></div>
                  </div>
                )}
                {form.category === "storage" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Daily ($)</Label><Input type="number" value={form.daily} onChange={(e) => update("daily", e.target.value)} /></div>
                      <div><Label>Weekly ($)</Label><Input type="number" value={form.weekly} onChange={(e) => update("weekly", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Monthly ($)</Label><Input type="number" value={form.monthly} onChange={(e) => update("monthly", e.target.value)} /></div>
                      <div><Label>Seasonal / 4-mo ($)</Label><Input type="number" value={form.seasonal} onChange={(e) => update("seasonal", e.target.value)} /></div>
                    </div>
                    <div>
                      <Label>Cancellation Policy</Label>
                      <Select value={form.cancellation} onValueChange={(v) => update("cancellation", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flexible">Flexible</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="strict">Strict</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <p className="text-xs text-muted-foreground">Prices in CAD. Quebec taxes (GST 5% + QST 9.975%) will be added at checkout.</p>
              </div>
            )}

            {/* Step 4: Extras — Student Discounts & Nearby Landmarks */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Student Discount */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary mb-1"><GraduationCap className="w-5 h-5" /><span className="font-semibold text-foreground">Student Discount</span></div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.studentDiscount} onCheckedChange={(v) => update("studentDiscount", v)} />
                    <Label>Offer a student discount</Label>
                  </div>
                  {form.studentDiscount && (
                    <div className="space-y-3 pl-1 border-l-2 border-primary/20 ml-2">
                      <div className="pl-3">
                        <Label>Discount (%)</Label>
                        <Input type="number" min="1" max="50" value={form.studentDiscountPercent} onChange={(e) => update("studentDiscountPercent", e.target.value)} className="max-w-[120px]" />
                      </div>
                      <div className="pl-3">
                        <Label>Applicable universities (optional)</Label>
                        <Input value={form.studentUniversities} onChange={(e) => update("studentUniversities", e.target.value)} placeholder="e.g. McGill, UdeM, Concordia — leave blank for all" />
                        <p className="text-xs text-muted-foreground mt-1">Comma-separated. Leave empty to apply to all students.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nearby Landmarks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary mb-1"><Landmark className="w-5 h-5" /><span className="font-semibold text-foreground">Nearby Landmarks & Destinations</span></div>
                  <p className="text-sm text-muted-foreground">Help seekers find your space by tagging nearby destinations.</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_LANDMARKS.map((l) => (
                      <Badge key={l} variant={form.nearbyLandmarks.includes(l) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleLandmark(l)}>{l}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={form.customLandmark}
                      onChange={(e) => update("customLandmark", e.target.value)}
                      placeholder="Add a custom landmark…"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomLandmark())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addCustomLandmark} disabled={!form.customLandmark.trim()}>Add</Button>
                  </div>
                  {form.nearbyLandmarks.filter((l) => !COMMON_LANDMARKS.includes(l)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.nearbyLandmarks.filter((l) => !COMMON_LANDMARKS.includes(l)).map((l) => (
                        <Badge key={l} variant="default" className="gap-1">
                          {l}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => toggleLandmark(l)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Review Your Listing</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Category:</span> <span className="capitalize text-foreground">{form.category}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="capitalize text-foreground">{form.type}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Title:</span> <span className="text-foreground">{form.title}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{form.address}, {form.city}, {form.province}, {form.country}</span></div>
                  <div><span className="text-muted-foreground">Availability:</span> <span className="capitalize text-foreground">{form.availability}</span></div>
                  {form.region && <div><span className="text-muted-foreground">Region:</span> <span className="text-foreground">{form.region}</span></div>}
                  <div className="col-span-2"><span className="text-muted-foreground">Description:</span> <span className="text-foreground line-clamp-2">{form.description}</span></div>
                </div>

                {/* Features */}
                {form.features.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Features:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {form.features.map((f) => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
                    </div>
                  </div>
                )}

                {/* Pricing */}
                <div>
                  <span className="text-sm text-muted-foreground">Pricing:</span>
                  <div className="flex gap-3 text-sm mt-1">
                    {form.category === "parking" ? (
                      <>
                        {form.hourly && <span>${form.hourly}/hr</span>}
                        {form.daily && <span>${form.daily}/day</span>}
                        {form.monthly && <span>${form.monthly}/mo</span>}
                      </>
                    ) : (
                      <>
                        {form.daily && <span>${form.daily}/day</span>}
                        {form.weekly && <span>${form.weekly}/wk</span>}
                        {form.monthly && <span>${form.monthly}/mo</span>}
                        {form.seasonal && <span>${form.seasonal}/season</span>}
                      </>
                    )}
                  </div>
                </div>

                {/* Student Discount */}
                {form.studentDiscount && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Student Discount:</span>{" "}
                    <span className="text-foreground">{form.studentDiscountPercent}% off</span>
                    {form.studentUniversities && <span className="text-muted-foreground"> — {form.studentUniversities}</span>}
                  </div>
                )}

                {/* Landmarks */}
                {form.nearbyLandmarks.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Nearby Landmarks:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {form.nearbyLandmarks.map((l) => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  <Check className="w-4 h-4 mr-1" /> Submit Listing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
