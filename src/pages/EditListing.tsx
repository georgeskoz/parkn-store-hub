import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { INITIAL_FORM, type ListingFormData } from "@/components/listing/ListingFormTypes";
import StepTypeCategory from "@/components/listing/StepTypeCategory";
import StepLocation from "@/components/listing/StepLocation";
import StepDetails from "@/components/listing/StepDetails";
import StepPhotos from "@/components/listing/StepPhotos";
import StepPricing from "@/components/listing/StepPricing";
import StepExtras from "@/components/listing/StepExtras";
import AvailabilityEditor from "@/components/listing/AvailabilityEditor";

export default function EditListing() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<ListingFormData>({ ...INITIAL_FORM });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

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

  useEffect(() => {
    if (!id || !user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: l, error } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!l) {
          toast({ title: t("listingDetail.listingNotFound"), variant: "destructive" });
          navigate("/dashboard");
          return;
        }
        if ((l as any).user_id !== user.id && (l as any).host_id !== user.id) {
          setNotAllowed(true);
          return;
        }

        // Optional: load availability slots / rental terms
        const [slotsRes, termsRes] = await Promise.all([
          (supabase as any).from("listing_availability_slots").select("*").eq("listing_id", id),
          (supabase as any).from("listing_rental_terms").select("*").eq("listing_id", id).maybeSingle(),
        ]);

        const slots = (slotsRes.data || []).map((s: any) => ({
          dayOfWeek: s.day_of_week,
          startTime: (s.start_time || "").slice(0, 5),
          endTime: (s.end_time || "").slice(0, 5),
        }));
        const terms = termsRes.data;

        const photos = Array.isArray((l as any).photos)
          ? (l as any).photos.map((p: any) => ({ url: p.url, path: p.path ?? "", name: p.name ?? "" }))
          : [];

        setForm({
          ...INITIAL_FORM,
          category: (l as any).category ?? "",
          type: (l as any).type ?? "",
          title: (l as any).title ?? "",
          description: (l as any).description ?? "",
          address: (l as any).address ?? "",
          unit: (l as any).unit ?? "",
          postalCode: (l as any).postal_code ?? "",
          city: (l as any).city ?? "",
          province: (l as any).province ?? "",
          country: (l as any).country ?? "",
          region: (l as any).region ?? "",
          lat: (l as any).lat ?? null,
          lng: (l as any).lng ?? null,
          features: (l as any).amenities ?? [],
          availability: (l as any).availability ?? "available",
          spots: (l as any).spots?.toString() ?? "1",
          hourly: (l as any).price_hourly?.toString() ?? "",
          daily: (l as any).price_daily?.toString() ?? "",
          weekly: (l as any).price_weekly?.toString() ?? "",
          monthly: (l as any).price_monthly?.toString() ?? "",
          availabilitySlots: slots,
          sqft: (l as any).size_sqft?.toString() ?? "",
          minMonths: terms?.min_months?.toString() ?? "1",
          rentalStartDate: terms?.start_date ?? "",
          seasonalRental: terms?.seasonal ?? false,
          seasonStartMonth: terms?.season_start_month?.toString() ?? "11",
          seasonEndMonth: terms?.season_end_month?.toString() ?? "4",
          nearbyLandmarks: (l as any).nearby_venues ?? [],
          photos,
          disclaimerAccepted: true,
        });
      } catch (err: any) {
        toast({ title: t("listingWizard.failedToLoadListing"), description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user?.id]);

  const handleSave = async () => {
    if (!id || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({
          category: form.category,
          type: form.type,
          title: form.title,
          description: form.description,
          address: form.address,
          postal_code: form.postalCode || null,
          city: form.city,
          province: form.province,
          country: form.country,
          lat: form.lat ?? 0,
          lng: form.lng ?? 0,
          amenities: form.features,
          size_sqft: form.sqft ? parseInt(form.sqft) : null,
          price_hourly: form.category === "parking" && form.hourly ? parseFloat(form.hourly) : null,
          price_daily: form.category === "parking" && form.daily ? parseFloat(form.daily) : null,
          price_weekly: form.category === "parking" && form.weekly ? parseFloat(form.weekly) : null,
          price_monthly: form.monthly ? parseFloat(form.monthly) : null,
          nearby_venues: form.nearbyLandmarks,
          photos: form.photos.map((p) => ({ url: p.url, path: p.path })),
          host_id: user.id,
          is_approved: false,
          status: "pending",
          ai_moderation: null,
        } as any)
        .eq("id", id)
        .or(`user_id.eq.${user.id},host_id.eq.${user.id}`);
      if (error) throw error;

      // Replace availability slots
      if (form.category === "parking") {
        await (supabase as any).from("listing_availability_slots").delete().eq("listing_id", id);
        if (form.availabilitySlots.length > 0) {
          await (supabase as any).from("listing_availability_slots").insert(
            form.availabilitySlots.map((s) => ({
              listing_id: id,
              day_of_week: s.dayOfWeek,
              start_time: s.startTime,
              end_time: s.endTime,
            }))
          );
        }
      }

      // Upsert rental terms
      if (form.category === "storage") {
        await (supabase as any).from("listing_rental_terms").delete().eq("listing_id", id);
        await (supabase as any).from("listing_rental_terms").insert({
          listing_id: id,
          min_months: parseInt(form.minMonths) || 1,
          start_date: form.rentalStartDate || null,
          seasonal: form.seasonalRental,
          season_start_month: form.seasonalRental ? parseInt(form.seasonStartMonth) : null,
          season_end_month: form.seasonalRental ? parseInt(form.seasonEndMonth) : null,
        });
      }

      // Re-run AI moderation (non-blocking)
      try {
        await supabase.functions.invoke("moderate-listing", {
          body: {
            listing_id: id,
            title: form.title,
            description: form.description ?? "",
            photos: form.photos?.map((p) => p.url) ?? [],
          },
        });
      } catch (err) {
        console.error("AI moderation error:", err);
      }

      toast({
        title: t("listingWizard.listingUpdated"),
        description: t("listingWizard.listingUpdatedDescription"),
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: t("listingWizard.errorSavingListing"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("listingWizard.signInRequired")}</h1>
          <Button onClick={() => navigate("/auth")}>{t("auth.signIn")}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (notAllowed) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 max-w-2xl text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("listingWizard.notAuthorized")}</h1>
          <p className="text-muted-foreground mb-4">{t("listingWizard.canOnlyEditOwnListings")}</p>
          <Button asChild><Link to="/dashboard">{t("listingWizard.backToDashboard")}</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> {t("listingWizard.backToDashboard")}</Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground mb-1">{t("listingWizard.editListing")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("listingWizard.editListingHintPrefix")} <strong>{t("listingWizard.pending")}</strong> {t("listingWizard.editListingHintSuffix")}
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card><CardHeader><CardTitle>{t("listingWizard.categoryLabel")}</CardTitle></CardHeader>
              <CardContent><StepTypeCategory form={form} update={update} /></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>{t("listingWizard.steps.location")}</CardTitle></CardHeader>
              <CardContent><StepLocation form={form} update={update} /></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>{t("listingWizard.detailsAndFeatures")}</CardTitle></CardHeader>
              <CardContent><StepDetails form={form} update={update} toggleFeature={toggleFeature} /></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>{t("listingWizard.steps.photos")}</CardTitle></CardHeader>
              <CardContent><StepPhotos form={form} update={update} /></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>{t("listingWizard.pricingAndAvailability")}</CardTitle></CardHeader>
              <CardContent><StepPricing form={form} update={update} /></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("listingWizard.availabilitySchedule")}</CardTitle>
                <p className="text-xs text-muted-foreground pt-1">
                  {t("listingWizard.availabilityScheduleEditHint")}
                </p>
              </CardHeader>
              <CardContent>
                {id && <AvailabilityEditor listingId={id} />}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>{t("listingWizard.steps.extras")}</CardTitle></CardHeader>
              <CardContent>
                <StepExtras form={form} update={update} toggleLandmark={toggleLandmark} addCustomLandmark={addCustomLandmark} />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 sticky bottom-4">
              <Button variant="outline" asChild><Link to="/dashboard">{t("common.cancel")}</Link></Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {saving ? t("listingWizard.saving") : t("listingWizard.saveChanges")}
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
