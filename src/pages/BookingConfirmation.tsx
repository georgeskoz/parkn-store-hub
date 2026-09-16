import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, MapPin, Calendar, ArrowLeft, CreditCard, Loader2, Zap, SearchX } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import BookingIntakeDetails from "@/components/booking/BookingIntakeDetails";
import { getDateFnsLocale } from "@/lib/dateLocale";

type IntakePayload =
  | {
      kind: "parking";
      vehicle_plate: string;
      vehicle_type: string;
      vehicle_make: string;
      vehicle_colour: string;
      drivers_license: string;
      license_province_state: string;
    }
  | {
      kind: "storage";
      storage_items: Record<string, number>;
      storage_notes: string;
      storage_size: string;
      dropoff_date: string;
      dropoff_time: string;
    }
  | { kind: "none" };

type TaxLineItem = { name: string; rate: number; amount: number };

interface BookingState {
  listingType: string;
  listingId: string;
  title: string;
  address: string;
  startDate: string;
  endDate: string;
  rate: string;
  unitPrice: number;
  units: number;
  subtotal: number;
  platformFee?: number;
  taxLineItems: TaxLineItem[];
  total: number;
  intake?: IntakePayload;
  allowInstallments?: boolean;
}

type InstallmentFrequency = "weekly" | "monthly";

// Must match the literal string thrown by create-booking-payment's
// double-booking guard -- matched exactly (not by substring) so unrelated
// errors never get mislabeled as an availability conflict.
const SLOT_UNAVAILABLE_MESSAGE =
  "This time slot was just booked by someone else. Please pick another time.";

interface SurgePreview {
  multiplier: number;
  label: string | null;
  subtotal: number;
  platformFee: number;
  taxLineItems: TaxLineItem[];
  total: number;
}

export default function BookingConfirmation() {
  const { t } = useTranslation();
  const { state } = useLocation() as { state: BookingState | null };
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  const [surge, setSurge] = useState<SurgePreview | null>(null);
  // null = pay in full. Only offered when the listing opts in
  // (state.allowInstallments) -- the actual eligible frequencies (weekly
  // needs >=2 weeks of booking, monthly >=2 months) are computed below
  // once `state` is available, same N = ceil(duration/period) rule the
  // create-booking-payment edge function uses server-side.
  const [installmentFrequency, setInstallmentFrequency] = useState<InstallmentFrequency | null>(null);
  // Same platform_settings lookup ListingDetail.tsx uses -- keeps the fee
  // shown/charged here consistent with the estimate the renter already saw.
  // Falls back to 10% if the row is missing so this never renders $0 fee.
  const [commissionRate, setCommissionRate] = useState<number>(0.1);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "commission_rate")
        .maybeSingle();
      if (error || !data) return;
      const pct = parseFloat(data.value as string);
      if (Number.isFinite(pct)) setCommissionRate(pct / 100);
    })();
  }, []);

  useEffect(() => {
    if (!state) return;
    (async () => {
      try {
        const { data: listing } = await supabase
          .from("listings")
          .select("city, category, country, province")
          .eq("id", state.listingId)
          .maybeSingle();
        if (!listing) return;
        const nowIso = new Date().toISOString();
        const { data: rules } = await supabase
          .from("surge_pricing")
          .select("label, surge_multiplier, start_at, end_at, category")
          .eq("city", listing.city)
          .eq("is_active", true)
          .or(`category.eq.${listing.category},category.eq.all`)
          .lte("start_at", nowIso)
          .gte("end_at", nowIso);
        let best = { multiplier: 1, label: null as string | null };
        for (const r of rules || []) {
          if (Number(r.surge_multiplier) > best.multiplier) {
            best = { multiplier: Number(r.surge_multiplier), label: r.label };
          }
        }
        if (best.multiplier > 1) {
          const subtotal = +(state.subtotal * best.multiplier).toFixed(2);
          const platformFee = +(subtotal * commissionRate).toFixed(2);
          const feeInclusiveSubtotal = +(subtotal + platformFee).toFixed(2);
          const { data: tax, error: taxError } = await supabase.functions.invoke("preview-booking-tax", {
            body: { country: listing.country, province: listing.province, subtotal: feeInclusiveSubtotal },
          });
          const taxLineItems: TaxLineItem[] = !taxError && Array.isArray(tax?.lineItems) ? tax.lineItems : [];
          const taxTotal = !taxError && typeof tax?.taxTotal === "number" ? tax.taxTotal : 0;
          const total = +(feeInclusiveSubtotal + taxTotal).toFixed(2);
          setSurge({ multiplier: best.multiplier, label: best.label, subtotal, platformFee, taxLineItems, total });
        }
      } catch (err) {
        console.warn("Surge lookup skipped:", err);
      }
    })();
  }, [state, commissionRate]);

  if (!state) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl text-center">
          <SearchX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t("bookingIntake.noBookingInProgress")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("bookingConfirmation.pickASpotFirst")}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button asChild><Link to="/find">{t("search.findASpotTitle")}</Link></Button>
            <Button variant="outline" asChild><Link to="/dashboard">{t("nav.dashboard")}</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }


  const start = new Date(state.startDate);
  const end = new Date(state.endDate);
  const displayTotal = surge ? surge.total : state.total;
  const displaySubtotal = surge ? surge.subtotal : state.subtotal;
  const displayTaxLineItems = surge ? surge.taxLineItems : state.taxLineItems;
  // state.platformFee comes from ListingDetail.tsx's estimate; fall back to
  // recomputing it for older nav states that predate that field.
  const displayPlatformFee = surge
    ? surge.platformFee
    : state.platformFee ?? +(state.subtotal * commissionRate).toFixed(2);

  // Client-side preview only -- the authoritative split (which also has to
  // divide the fee and tax, not just the total) happens server-side in
  // create-booking-payment. This just tells the renter roughly what N is
  // and what the first payment will be, using the same N = ceil(duration /
  // period) rule, collapsed to "not offered" (not "pay 1 installment") when
  // a period doesn't fit at least twice into the booking.
  const durationDays = Math.max(1, (end.getTime() - start.getTime()) / (24 * 3600 * 1000));
  const weeklyCount = Math.ceil(durationDays / 7);
  const monthlyCount = Math.ceil(durationDays / 30);
  const installmentOptions: { frequency: InstallmentFrequency; count: number }[] = [
    ...(weeklyCount >= 2 ? [{ frequency: "weekly" as const, count: weeklyCount }] : []),
    ...(monthlyCount >= 2 ? [{ frequency: "monthly" as const, count: monthlyCount }] : []),
  ];
  const canOfferInstallments = !!state.allowInstallments && installmentOptions.length > 0;
  const selectedInstallment = installmentOptions.find((o) => o.frequency === installmentFrequency) ?? null;
  const firstPaymentAmount = selectedInstallment
    ? +(displayTotal / selectedInstallment.count).toFixed(2)
    : displayTotal;

  const handlePay = async () => {
    if (!user) {
      toast({ title: t("bookingConfirmation.pleaseSignIn"), description: t("bookingConfirmation.mustBeLoggedIn"), variant: "destructive" });
      return;
    }
    setPaying(true);
    try {
      const body = {
        ...state,
        installments: canOfferInstallments && selectedInstallment ? { frequency: selectedInstallment.frequency } : null,
      };
      const { data, error } = await supabase.functions.invoke("create-booking-payment", { body });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(t("bookingConfirmation.noCheckoutUrl"));
    } catch (err: any) {
      console.error(err);
      // functions.invoke() only surfaces a generic "non-2xx status code"
      // message on error -- the real body (the { error } JSON our edge
      // functions actually return) lives on error.context and has to be
      // read separately.
      let serverMessage: string | undefined;
      if (err instanceof FunctionsHttpError) {
        try {
          const body = await err.context.json();
          serverMessage = body?.error;
        } catch {
          // response body wasn't JSON -- fall through to the generic message
        }
      } else {
        serverMessage = err?.message;
      }

      if (serverMessage === SLOT_UNAVAILABLE_MESSAGE) {
        toast({
          title: t("bookingConfirmation.slotUnavailableTitle"),
          description: t("bookingConfirmation.slotUnavailableDescription"),
          variant: "destructive",
        });
      } else {
        toast({ title: t("bookingConfirmation.paymentError"), description: serverMessage || t("bookingConfirmation.couldNotStartPayment"), variant: "destructive" });
      }
    } finally {
      setPaying(false);
    }
  };

  // Host payout = total minus the fee the renter is charged (the fee no
  // longer comes out of the host's cut -- see create-booking-payment).
  const providerPayout = +(displayTotal - displayPlatformFee).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl">
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t("bookingConfirmation.confirmYourBooking")}</h1>
          <p className="text-muted-foreground mt-1">{t("bookingConfirmation.reviewDetailsSubtitle")}</p>
        </div>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{state.title}</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {state.address}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("bookingConfirmation.checkIn")}</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {format(start, "MMM d, yyyy", { locale: getDateFnsLocale() })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("bookingConfirmation.checkOut")}</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {format(end, "MMM d, yyyy", { locale: getDateFnsLocale() })}
                </p>
              </div>
            </div>

            {surge && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                  <Zap className="w-4 h-4" /> {t("bookingConfirmation.eventSurgePricing", { multiplier: surge.multiplier })}
                </div>
                {surge.label && (
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">{surge.label}</p>
                )}
                <div className="flex items-center gap-2 text-xs mt-2">
                  <span className="line-through text-muted-foreground">${state.total.toFixed(2)}</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">${surge.total.toFixed(2)}</span>
                  <Badge variant="outline" className="ml-auto">+${(surge.total - state.total).toFixed(2)}</Badge>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground capitalize">{t(`listingDetail.rateLabel.${state.rate}`, { defaultValue: state.rate })} × {state.units}</span>
                <span>${displaySubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>{t("bookingConfirmation.platformFee")} ({Math.round(commissionRate * 100)}%)</span>
                <span>${displayPlatformFee.toFixed(2)}</span>
              </div>
              {displayTaxLineItems.map((item) => (
                <div key={item.name} className="flex justify-between text-muted-foreground text-xs">
                  <span>{item.name}</span><span>${item.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                <span>{t("listingDetail.total")}</span><span>${displayTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>{t("bookingConfirmation.providerPayout")}</span><span>${providerPayout.toFixed(2)}</span></div>
            </div>

            {canOfferInstallments && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("bookingConfirmation.howToPay")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={installmentFrequency === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInstallmentFrequency(null)}
                  >
                    {t("bookingConfirmation.payInFull")}
                  </Button>
                  {installmentOptions.map((opt) => (
                    <Button
                      key={opt.frequency}
                      type="button"
                      variant={installmentFrequency === opt.frequency ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInstallmentFrequency(opt.frequency)}
                    >
                      {t(`bookingConfirmation.installmentOption.${opt.frequency}`, { count: opt.count })}
                    </Button>
                  ))}
                </div>
                {selectedInstallment && (
                  <p className="text-xs text-muted-foreground">
                    {t("bookingConfirmation.installmentSummary", {
                      count: selectedInstallment.count,
                      amount: firstPaymentAmount.toFixed(2),
                      frequency: t(`bookingConfirmation.frequencyAdverb.${selectedInstallment.frequency}`),
                    })}
                  </p>
                )}
              </div>
            )}

            {state.intake && state.intake.kind !== "none" && (
              <BookingIntakeDetails
                booking={{
                  category: state.listingType,
                  ...(state.intake as any),
                }}
              />
            )}


            <Button className="w-full" size="lg" onClick={handlePay} disabled={paying}>
              {paying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("bookingConfirmation.processing")}</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> {t("bookingConfirmation.payAmount", { amount: firstPaymentAmount.toFixed(2) })}</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> {t("nav.dashboard")}</Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link to={`/${state.listingType}`}>{t("bookingConfirmation.browseMore")}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
