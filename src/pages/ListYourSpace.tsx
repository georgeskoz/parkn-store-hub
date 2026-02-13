import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { STEPS, INITIAL_FORM, type ListingFormData } from "@/components/listing/ListingFormTypes";
import StepTypeCategory from "@/components/listing/StepTypeCategory";
import StepLocation from "@/components/listing/StepLocation";
import StepDetails from "@/components/listing/StepDetails";
import StepPhotos from "@/components/listing/StepPhotos";
import StepPricing from "@/components/listing/StepPricing";
import StepExtras from "@/components/listing/StepExtras";
import StepReview from "@/components/listing/StepReview";

export default function ListYourSpace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingFormData>({ ...INITIAL_FORM });
  const [submitting, setSubmitting] = useState(false);

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

  const canNext = () => {
    if (step === 0) return !!form.category && !!form.type;
    if (step === 1) return !!form.title && !!form.address && !!form.city && !!form.province && !!form.country;
    if (step === 2) return !!form.description;
    if (step === 3) return true; // photos optional
    if (step === 4) return form.category === "parking" ? !!form.daily : !!form.monthly;
    if (step === 5) return true;
    if (step === 6) return form.disclaimerAccepted;
    return true;
  };

  const handleSubmit = async () => {
    if (!form.disclaimerAccepted || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        category: form.category,
        type: form.type,
        title: form.title,
        description: form.description,
        address: form.address,
        unit: form.unit || null,
        postal_code: form.postalCode || null,
        city: form.city,
        province: form.province,
        country: form.country,
        region: form.region || null,
        lat: form.lat ?? 0,
        lng: form.lng ?? 0,
        features: form.features,
        availability: form.availability,
        spots: form.category === "parking" ? parseInt(form.spots) || 1 : null,
        size: form.size || null,
        sqft: form.sqft ? parseInt(form.sqft) : null,
        hourly: form.hourly ? parseFloat(form.hourly) : null,
        daily: form.daily ? parseFloat(form.daily) : null,
        monthly: form.monthly ? parseFloat(form.monthly) : null,
        weekly: form.weekly ? parseFloat(form.weekly) : null,
        seasonal: form.seasonal ? parseFloat(form.seasonal) : null,
        cancellation: form.cancellation || null,
        student_discount: form.studentDiscount,
        student_discount_percent: form.studentDiscount ? parseInt(form.studentDiscountPercent) : null,
        student_universities: form.studentUniversities || null,
        nearby_landmarks: form.nearbyLandmarks,
        photos: form.photos.map((p) => ({ url: p.url, path: p.path })),
        disclaimer_accepted: form.disclaimerAccepted,
      });

      if (error) throw error;

      toast({ title: "Listing created!", description: "Your space is now live on the marketplace." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error creating listing", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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
            {step === 0 && <StepTypeCategory form={form} update={update} />}
            {step === 1 && <StepLocation form={form} update={update} />}
            {step === 2 && <StepDetails form={form} update={update} toggleFeature={toggleFeature} />}
            {step === 3 && <StepPhotos form={form} update={update} />}
            {step === 4 && <StepPricing form={form} update={update} />}
            {step === 5 && <StepExtras form={form} update={update} toggleLandmark={toggleLandmark} addCustomLandmark={addCustomLandmark} />}
            {step === 6 && <StepReview form={form} update={update} />}

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
                <Button onClick={handleSubmit} disabled={!form.disclaimerAccepted || submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  {submitting ? "Submitting…" : "Submit Listing"}
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
