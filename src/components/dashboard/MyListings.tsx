import { useState, useEffect } from "react";
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
}

const availColor: Record<string, string> = {
  available: "bg-primary/10 text-primary border-primary/20",
  limited: "bg-accent/10 text-accent-foreground border-accent/20",
  waitlist: "bg-destructive/10 text-destructive border-destructive/20",
  full: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function MyListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<DbListing[]>([]);
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
    } catch (err) {
      console.error("Error fetching listings:", err);
      toast({
        title: "Error",
        description: "Failed to load your listings",
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
        title: "Listing deleted",
        description: "Your listing has been removed from the marketplace.",
      });
    } catch (err) {
      console.error("Error deleting listing:", err);
      toast({
        title: "Error",
        description: "Failed to delete listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const getPrice = (listing: DbListing): { price: number | null; label: string } => {
    if (listing.price_monthly) return { price: listing.price_monthly, label: "/month" };
    if (listing.price_weekly) return { price: listing.price_weekly, label: "/week" };
    if (listing.price_daily) return { price: listing.price_daily, label: "/day" };
    if (listing.price_hourly) return { price: listing.price_hourly, label: "/hour" };
    return { price: null, label: "" };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Listings</CardTitle>
          <CardDescription>Your parking spots and storage spaces</CardDescription>
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
          <CardTitle>My Listings</CardTitle>
          <CardDescription>Your parking spots and storage spaces</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">You haven't created any listings yet.</p>
          <Button asChild>
            <Link to="/list">Create Your First Listing</Link>
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
            <CardTitle>My Listings</CardTitle>
            <CardDescription>Manage your parking spots and storage spaces</CardDescription>
          </div>
          <Badge variant="outline">{listings.length} active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {listings.map((listing) => {
            const { price, label } = getPrice(listing);
            return (
              <div
                key={listing.id}
                className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{listing.city}, {listing.province}</span>
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize shrink-0">{listing.category}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge
                      className={`text-xs border ${availColor[listing.availability] || availColor.available}`}
                    >
                      {(listing.availability?.charAt(0)?.toUpperCase() ?? "") + (listing.availability?.slice(1) ?? "")}
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
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/listing/${listing.id}`} title="View listing">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/listing/${listing.id}/edit`} title="Edit listing">
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm(listing.id)}
                    disabled={deleting === listing.id}
                    title="Delete listing"
                  >
                    {deleting === listing.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone. It will be removed from the marketplace immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteListing(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
