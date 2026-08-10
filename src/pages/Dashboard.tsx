import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LanguageToggle from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Warehouse, LogOut, User, Plus, ArrowLeftRight, MessageSquare, LayoutDashboard, Star, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import MyListings from "@/components/dashboard/MyListings";
import StripeConnectCard from "@/components/dashboard/StripeConnectCard";
import ConversationsList from "@/components/messaging/ConversationsList";
import ConversationPanel from "@/components/messaging/ConversationPanel";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import SeekerReviewsPanel from "@/components/reviews/SeekerReviewsPanel";
import ProviderReviewsPanel from "@/components/reviews/ProviderReviewsPanel";
import SeekerBookingsList from "@/components/dashboard/SeekerBookingsList";
import ProviderCancelledBookings from "@/components/dashboard/ProviderCancelledBookings";
import ProviderActiveBookings from "@/components/dashboard/ProviderActiveBookings";
import ReviewPromptBanner from "@/components/reviews/ReviewPromptBanner";

type ViewMode = "provider" | "seeker";

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, profile, roles, signOut, addRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { total: unreadTotal } = useUnreadMessages();
  const [viewMode, setViewMode] = useState<ViewMode>(
    roles.includes("provider") ? "provider" : "seeker"
  );
  const [savingRole, setSavingRole] = useState<"provider" | "seeker" | null>(null);

  const handleAddRole = async (role: "provider" | "seeker") => {
    if (savingRole) return;
    setSavingRole(role);
    try {
      await addRole(role);
      setViewMode(role);
      toast({
        title: role === "provider" ? t("dashboard.providerRoleActivated") : t("dashboard.seekerRoleActivated"),
        description: role === "provider" ? t("dashboard.canNowListSpaces") : t("dashboard.canNowSearchAndBook"),
      });
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      console.error("Failed to set role:", e);
      toast({
        title: t("dashboard.couldNotSetRole"),
        description: e?.message || t("dashboard.pleaseTryAgain"),
        variant: "destructive",
      });
    } finally {
      setSavingRole(null);
    }
  };

  const hasRole = (role: "provider" | "seeker") => roles.includes(role);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <div className="w-7 h-7 rounded-lg hero-gradient flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            Spotsvault
          </Link>

          <div className="flex items-center gap-3">
            {roles.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "provider" ? "seeker" : "provider")}
              >
                <ArrowLeftRight className="w-4 h-4 mr-1" />
                {viewMode === "provider" ? t("dashboard.switchToSeeker") : t("dashboard.switchToProvider")}
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {profile?.display_name || user?.email}
            </div>
            <LanguageToggle />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {roles.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">{t("dashboard.welcomeToSpotsvault")}</h1>
            <p className="text-muted-foreground mb-8">{t("dashboard.howWouldYouLikeToUse")}</p>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                type="button"
                disabled={savingRole !== null}
                onClick={() => handleAddRole("seeker")}
                className="text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Card className="cursor-pointer card-shadow hover:card-shadow-hover transition-shadow border-2 hover:border-primary">
                  <CardHeader className="text-center">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      {savingRole === "seeker" ? (
                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                      ) : (
                        <Car className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <CardTitle>{t("dashboard.imLookingForSpaces")}</CardTitle>
                    <CardDescription>{t("dashboard.findAndBookDescription")}</CardDescription>
                  </CardHeader>
                </Card>
              </button>
              <button
                type="button"
                disabled={savingRole !== null}
                onClick={() => handleAddRole("provider")}
                className="text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Card className="cursor-pointer card-shadow hover:card-shadow-hover transition-shadow border-2 hover:border-accent">
                  <CardHeader className="text-center">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-2">
                      {savingRole === "provider" ? (
                        <Loader2 className="w-7 h-7 text-accent animate-spin" />
                      ) : (
                        <Warehouse className="w-7 h-7 text-accent" />
                      )}
                    </div>
                    <CardTitle>{t("dashboard.iHaveSpacesToList")}</CardTitle>
                    <CardDescription>{t("dashboard.rentOutDescription")}</CardDescription>
                  </CardHeader>
                </Card>
              </button>
            </div>
          </div>
        )}

        {roles.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <h1 className="text-3xl font-bold text-foreground">
                {viewMode === "provider" ? t("dashboard.providerDashboard") : t("dashboard.seekerDashboard")}
              </h1>
              <Badge variant={viewMode === "provider" ? "default" : "secondary"}>
                {viewMode === "provider" ? t("dashboard.provider") : t("dashboard.seeker")}
              </Badge>
            </div>

            {!hasRole(viewMode === "provider" ? "seeker" : "provider") && (
              <Card className="mb-6 border-dashed">
                <CardContent className="flex items-center justify-between py-4">
                  <p className="text-sm text-muted-foreground">
                    {viewMode === "provider" ? t("dashboard.wantToAlsoSearch") : t("dashboard.wantToAlsoList")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddRole(viewMode === "provider" ? "seeker" : "provider")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {viewMode === "provider" ? t("dashboard.addSeekerRole") : t("dashboard.addProviderRole")}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">
                  <LayoutDashboard className="w-4 h-4 mr-1" /> {t("dashboard.overview")}
                </TabsTrigger>
                <TabsTrigger value="messages" className="relative">
                  <MessageSquare className="w-4 h-4 mr-1" /> {t("nav.messages")}
                  {unreadTotal > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1 text-[10px]">{unreadTotal}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  <Star className="w-4 h-4 mr-1" /> {t("listingDetail.reviews")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <ReviewPromptBanner userId={user?.id} role={viewMode === "provider" ? "provider" : "seeker"} />
                {viewMode === "provider" ? <ProviderView profile={profile} userId={user?.id} /> : <SeekerView userId={user?.id} />}
              </TabsContent>

              <TabsContent value="messages" className="mt-6">
                <MessagesTab />
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {viewMode === "provider" ? <ProviderReviewsPanel /> : <SeekerReviewsPanel />}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

const MessagesTab = () => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-6">
      <div>
        <ConversationsList
          activeId={activeId}
          onSelectConversation={(id) => setActiveId(id)}
        />
      </div>
      <div>
        {activeId ? (
          <ConversationPanel
            conversationId={activeId}
            onClose={() => setActiveId(null)}
          />
        ) : (
          <Card className="card-shadow h-[500px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("dashboard.selectConversation")}</p>
          </Card>
        )}
      </div>
    </div>
  );
};

const ProviderView = ({ profile, userId }: { profile: any; userId?: string }) => {
  const { t } = useTranslation();
  const [activeBookings, setActiveBookings] = useState(0);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("status,total_amount,commission_amount,created_at")
        .eq("provider_id", userId);
      const list = data || [];
      setActiveBookings(list.filter((b) => ["confirmed", "active", "pending"].includes(b.status)).length);
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const rev = list
        .filter((b) => new Date(b.created_at) >= startOfMonth && ["confirmed", "active", "completed"].includes(b.status))
        .reduce((sum, b) => sum + (Number(b.total_amount) - Number(b.commission_amount || 0)), 0);
      setRevenue(rev);
    })();
  }, [userId]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.createListing")}</CardTitle>
            <CardDescription>{t("dashboard.addNewSpaceDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link to="/list">
                <Plus className="w-4 h-4 mr-2" /> {t("dashboard.newListing")}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <StripeConnectCard
          stripeAccountId={profile?.stripe_account_id}
          onboardingComplete={profile?.stripe_onboarding_complete}
        />
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.activeBookings")}</CardTitle>
            <CardDescription>{t("dashboard.activeBookingsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{activeBookings}</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.revenue")}</CardTitle>
            <CardDescription>{t("dashboard.revenueDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">${revenue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>
      {userId && <ProviderActiveBookings userId={userId} />}
      {userId && <ProviderCancelledBookings userId={userId} />}
      <MyListings payoutsConnected={!!profile?.stripe_onboarding_complete} />
    </div>
  );
};

const SeekerView = ({ userId }: { userId?: string }) => {
  const { t } = useTranslation();
  const [parkingCount, setParkingCount] = useState(0);
  const [storageCount, setStorageCount] = useState(0);
  const [spent, setSpent] = useState(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("category,total_amount,status,created_at")
        .eq("seeker_id", userId);
      const list = data || [];
      const active = list.filter((b) => ["confirmed", "active", "pending"].includes(b.status));
      setParkingCount(active.filter((b) => b.category === "parking").length);
      setStorageCount(active.filter((b) => b.category === "storage").length);
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const sp = list
        .filter((b) => new Date(b.created_at) >= startOfMonth && ["confirmed", "active", "completed"].includes(b.status))
        .reduce((sum, b) => sum + Number(b.total_amount), 0);
      setSpent(sp);
    })();
  }, [userId]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.parkingBookings")}</CardTitle>
            <CardDescription>{t("dashboard.parkingBookingsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{parkingCount}</p>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/find?category=parking"><Car className="w-4 h-4 mr-1" /> {t("nav.findParking")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.storageContracts")}</CardTitle>
            <CardDescription>{t("dashboard.storageContractsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{storageCount}</p>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/find?category=storage"><Warehouse className="w-4 h-4 mr-1" /> {t("nav.findStorage")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.spent")}</CardTitle>
            <CardDescription>{t("dashboard.spentDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">${spent.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>
      {userId && <SeekerBookingsList userId={userId} />}
    </div>
  );
};

export default Dashboard;
