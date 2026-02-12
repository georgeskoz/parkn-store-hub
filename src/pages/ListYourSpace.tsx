import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Car, Warehouse, MapPin, DollarSign, ListChecks, ChevronRight, ChevronLeft, Check } from "lucide-react";

const STEPS = ["Type", "Location", "Details", "Pricing", "Review"];

const PARKING_FEATURES = ["EV Charging", "24/7 Access", "Security Camera", "Heated", "Covered", "Well-lit", "Near Metro", "Wheelchair Accessible"];
const STORAGE_FEATURES = ["24/7 Access", "Heated", "Climate Controlled", "Security Camera", "Loading Dock", "Drive-in Access", "Insurance Available", "Elevator Access"];

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
    province: "Quebec",
    country: "Canada",
    region: "",
    features: [] as string[],
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
  });

  const update = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));
  const toggleFeature = (f: string) =>
    setForm((p) => ({ ...p, features: p.features.includes(f) ? p.features.filter((x) => x !== f) : [...p.features, f] }));

  const featureOptions = form.category === "parking" ? PARKING_FEATURES : STORAGE_FEATURES;

  const canNext = () => {
    if (step === 0) return !!form.category && !!form.type;
    if (step === 1) return !!form.title && !!form.address && !!form.city;
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
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
                  <div><Label>Region/Neighbourhood</Label><Input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Downtown" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Province</Label><Input value={form.province} disabled /></div>
                  <div><Label>Country</Label><Input value={form.country} disabled /></div>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary mb-2"><ListChecks className="w-5 h-5" /><span className="font-semibold text-foreground">Details & Features</span></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="Describe your space…" /></div>
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
                  <Label>Features</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {featureOptions.map((f) => (
                      <Badge key={f} variant={form.features.includes(f) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleFeature(f)}>{f}</Badge>
                    ))}
                  </div>
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

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Review Your Listing</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Category:</span> <span className="capitalize text-foreground">{form.category}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="capitalize text-foreground">{form.type}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Title:</span> <span className="text-foreground">{form.title}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{form.address}, {form.city}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Description:</span> <span className="text-foreground line-clamp-2">{form.description}</span></div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.features.map((f) => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
                </div>
                <div className="flex gap-3 text-sm">
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
