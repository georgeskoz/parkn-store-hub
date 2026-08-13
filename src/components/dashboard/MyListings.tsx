import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Trash2, Edit, Eye, Loader2, MapPin, DollarSign, CalendarClock, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AvailabilityEditor from "@/components/listing/AvailabilityEditor";
import { getIntlLocale } from "@/lib/dateLocale";

interface DbListing {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  city: string;
  province: string;
  availability: string;
  features: string[];
  price_hourly: number | null;
  price_daily: number | null;
  price_monthly: number | null;
  price_weekly: number | null;
  seasonal: number | null;
  spots: number | null;
  sqft: number | null;
  created_at: string;
  // The `status` text column ("pending"/"approved") isn't reliably kept in
  // sync with `is_approved` (seen diverge in production) — `is_approved` is
  // what listing visibility RLS actually gates on, so it's the source of
  // truth for whether a listing is really live.
  is_approved: boolean;
}

const availColor: Record<string, string> = {
  available: "bg-primary/10 text-primary border-primary/20",
  limited: "bg-accent/10 text-accent-foreground border-accent/20",
  waitlist: "bg-destructive/10 text-destructive border-destructive/20",
  full: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function MyListings({ payoutsConnected = true }: { payoutsConnected?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<DbListing[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchListings();
  }, [user?.id]);

  const fetchListings = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings((data || []) as DbListing[]);

      // One query for every listing's booking count, not one per card —
      // grouped client-side since it's just a handful of rows per host.
      const { data: bookings } = await (supabase as any)
        .from("bookings")
        .select("listing_id, status")
        .eq("host_id", user.id);
      const counts: Record<string, number> = {};
      (bookings || []).forEach((b: { listing_id: string; status: string }) => {
        if (b.status === "cancelled") return;
        counts[b.listing_id] = (counts[b.listing_id] || 0) + 1;
      });
      setBookingCounts(counts);
    } catch (err) {
      console.error("Error fetching listings:", err);
      toast({
        title: t("common.error"),
        description: t("myListings.failedToLoad"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id)
        .eq("user_id", user?.id);

      if (error) throw error;

      setListings(listings.filter(l => l.id !== id));
      setDeleteConfirm(null);
      toast({
        title: t("myListings.listingDeleted"),
        description: t("myListings.listingDeletedDescription"),
      });
    } catch (err) {
      console.error("Error deleting listing:", err);
      toast({
        title: t("common.error"),
        description: t("myListings.failedToDelete"),
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const getPrice = (listing: DbListing): { price: number | null; label: string } => {
    if (listing.price_monthly) return { price: listing.price_monthly, label: t("listingDetail.perMonth") };
    if (listing.price_weekly) return { price: listing.price_weekly, label: t("listingCard.perWeek") };
    if (listing.price_daily) return { price: listing.price_daily, label: t("listingDetail.perDay") };
    if (listing.price_hourly) return { price: listing.price_hourly, label: t("listingDetail.perHour") };
    return { price: null, label: "" };
  };

  const formatListedDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString(getIntlLocale(), { year: "numeric", month: "short", day: "numeric" });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("myListings.myListings")}</CardTitle>
          <CardDescription>{t("myListings.yourSpaces")}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (listings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("myListings.myListings")}</CardTitle>
          <CardDescription>{t("myListings.yourSpaces")}</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">{t("myListings.noListingsYet")}</p>
          <Button asChild>
            <Link to="/list">{t("myListings.createFirstListing")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("myListings.myListings")}</CardTitle>
            <CardDescription>{t("myListings.manageYourSpaces")}</CardDescription>
          </div>
          <Badge variant="outline">{t("myListings.activeCount", { count: listings.length })}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {listings.map((listing) => {
            const { price, label } = getPrice(listing);
            return (
              <div
                key={listing.id}
                className="rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{listing.city}, {listing.province}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("myListings.listedOn", { date: formatListedDate(listing.created_at) })}
                          {bookingCounts[listing.id] > 0 &&
                            ` · ${t("myListings.bookingCount", { count: bookingCounts[listing.id] })}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize shrink-0">{listing.category}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge
                        className={`text-xs border ${
                          listing.is_approved
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-accent/10 text-accent-foreground border-accent/20"
                        }`}
                      >
                        {listing.is_approved ? t("myListings.statusActive") : t("myListings.statusPendingReview")}
                      </Badge>
                      <Badge
                        className={`text-xs border ${availColor[listing.availability] || availColor.available}`}
                      >
                        {listing.availability === "available" ? t("listingCard.available") : t(`listingCard.availability.${listing.availability}`, { defaultValue: listing.availability || "" })}
                      </Badge>
                      {listing.type && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {listing.type}
                        </Badge>
                      )}
                      {price && (
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {price}{label}
                        </Badge>
                      )}
                      {!payoutsConnected && (
                        <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-700">
                          {t("myListings.payoutsNotSetUp")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/listing/${listing.id}`} title={t("myListings.viewListing")}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/listing/${listing.id}/edit`} title={t("myListings.editListing")}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(listing.id)}
                      disabled={deleting === listing.id}
                      title={t("myListings.deleteListing")}
                    >
                      {deleting === listing.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between px-4 py-2 border-t border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group">
                      <span className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" /> {t("listingWizard.availability")}
                      </span>
                      <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 pt-2 border-t border-border bg-muted/20">
                    <AvailabilityEditor listingId={listing.id} />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      </CardContent>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("myListings.deleteListingTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("myListings.deleteListingConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteListing(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
