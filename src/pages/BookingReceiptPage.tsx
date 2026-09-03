import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Loader2, SearchX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookingReceipt } from "@/components/booking/BookingReceipt";
import type { ReceiptData, TaxLineItem } from "@/lib/pdf/types";

// The generated Database types (src/integrations/supabase/types.ts) are
// stale for bookings -- still typed with the pre-migration column names
// (provider_id/seeker_id/payment_intent_id, no tax_amount/tax_breakdown/
// platform_fee at all), same pre-existing gap already worked around by
// hand-written row types elsewhere in this codebase (SeekerBookingsList.tsx,
// ProviderActiveBookings.tsx, Dashboard.tsx) rather than by fixing the
// generated file itself. host_id/renter_id/tax_amount/tax_breakdown/
// platform_fee are real, live, queryable columns (confirmed directly
// against the database) -- this type documents the real shape queried
// below and is cast through `unknown` since the generated column union
// doesn't overlap with it.
type BookingRow = {
  id: string;
  status: string;
  category: string | null;
  start_date: string;
  end_date: string;
  total_amount: number;
  tax_amount: number | null;
  tax_breakdown: TaxLineItem[] | null;
  platform_fee: number | null;
  payout_amount: number | null;
  renter_id: string | null;
  host_id: string | null;
  listings: {
    title: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
};

export default function BookingReceiptPage() {
  const { t } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const justPaid = searchParams.get("justPaid") === "1";

  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);

      const { data: rawBooking, error } = await supabase
        .from("bookings")
        .select(
          "id,status,category,start_date,end_date,total_amount,tax_amount,tax_breakdown,platform_fee,payout_amount,renter_id,host_id,listings(title,address,city,province,postal_code,country)",
        )
        .eq("id", bookingId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !rawBooking) {
        console.error("BookingReceiptPage load failed:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const booking = rawBooking as unknown as BookingRow;

      const peopleIds = [booking.renter_id, booking.host_id].filter(Boolean) as string[];
      const { data: people } = peopleIds.length
        ? await supabase.from("profiles_public").select("id, display_name").in("id", peopleIds)
        : { data: [] as { id: string; display_name: string | null }[] };

      if (cancelled) return;

      const nameById = new Map((people || []).map((p) => [p.id, p.display_name]));
      const listing = booking.listings;
      const address = listing?.address
        ? [listing.address, listing.city, listing.province, listing.postal_code, listing.country].filter(Boolean).join(", ")
        : listing?.city ?? null;

      const taxLineItems = (Array.isArray(booking.tax_breakdown) ? booking.tax_breakdown : []) as TaxLineItem[];
      const taxTotal = Number(booking.tax_amount ?? 0);
      const total = Number(booking.total_amount ?? 0);
      const subtotal = +(total - taxTotal).toFixed(2);

      setData({
        bookingId: booking.id,
        category: booking.category,
        status: booking.status,
        listingTitle: listing?.title ?? t("booking.booking"),
        listingAddress: address,
        startDate: booking.start_date,
        endDate: booking.end_date,
        renterName: (booking.renter_id && nameById.get(booking.renter_id)) || t("booking.na"),
        hostName: (booking.host_id && nameById.get(booking.host_id)) || t("booking.na"),
        subtotal,
        taxLineItems,
        taxTotal,
        total,
        platformFee: booking.platform_fee != null ? Number(booking.platform_fee) : null,
        hostPayout: booking.payout_amount != null ? Number(booking.payout_amount) : null,
        issuedAt: new Date().toISOString(),
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl text-center">
          <SearchX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t("receipt.notFound")}</h1>
          <p className="text-muted-foreground mt-2">{t("receipt.notFoundDescription")}</p>
          <Button className="mt-6" asChild>
            <Link to="/dashboard">{t("nav.dashboard")}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl">
        {justPaid && (
          <div className="text-center mb-8 print:hidden">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-1">{t("bookingSuccess.paymentSuccessful")}</h1>
            <p className="text-muted-foreground">{t("bookingSuccess.confirmationMessage")}</p>
          </div>
        )}

        <BookingReceipt data={data} />

        <div className="flex gap-3 mt-6 print:hidden">
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" /> {t("nav.dashboard")}
            </Link>
          </Button>
          <Button className="flex-1" asChild>
            <Link to="/">{t("bookingSuccess.backToHome")}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
