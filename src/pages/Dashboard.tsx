import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Warehouse, LogOut, User, Plus, ArrowLeftRight, MessageSquare, LayoutDashboard, Star } from "lucide-react";
import { Link } from "react-router-dom";
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

type ViewMode = "provider" | "seeker";

const Dashboard = () => {
  const { user, profile, roles, signOut, addRole } = useAuth();
  const { toast } = useToast();
  const { total: unreadTotal } = useUnreadMessages();
  const [viewMode, setViewMode] = useState<ViewMode>(
    roles.includes("provider") ? "provider" : "seeker"
  );

  const handleAddRole = async (role: "provider" | "seeker") => {
    await addRole(role);
    setViewMode(role);
    toast({
      title: `${role === "provider" ? "Provider" : "Seeker"} role activated`,
      description: `You can now ${role === "provider" ? "list spaces" : "search and book spaces"}.`,
    });
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
                Switch to {viewMode === "provider" ? "Seeker" : "Provider"}
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {profile?.display_name || user?.email}
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {roles.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Spotsvault!</h1>
            <p className="text-muted-foreground mb-8">How would you like to use Spotsvault? You can always add the other role later.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer card-shadow hover:card-shadow-hover transition-shadow border-2 hover:border-primary"
                onClick={() => handleAddRole("seeker")}
              >
                <CardHeader className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Car className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle>I'm looking for spaces</CardTitle>
                  <CardDescription>Find and book parking spots or storage near you</CardDescription>
                </CardHeader>
              </Card>
              <Card
                className="cursor-pointer card-shadow hover:card-shadow-hover transition-shadow border-2 hover:border-accent"
                onClick={() => handleAddRole("provider")}
              >
                <CardHeader className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-2">
                    <Warehouse className="w-7 h-7 text-accent" />
                  </div>
                  <CardTitle>I have spaces to list</CardTitle>
                  <CardDescription>Rent out your parking spots or storage spaces</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {roles.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <h1 className="text-3xl font-bold text-foreground">
                {viewMode === "provider" ? "Provider Dashboard" : "Seeker Dashboard"}
              </h1>
              <Badge variant={viewMode === "provider" ? "default" : "secondary"}>
                {viewMode === "provider" ? "Provider" : "Seeker"}
              </Badge>
            </div>

            {!hasRole(viewMode === "provider" ? "seeker" : "provider") && (
              <Card className="mb-6 border-dashed">
                <CardContent className="flex items-center justify-between py-4">
                  <p className="text-sm text-muted-foreground">
                    Want to also {viewMode === "provider" ? "search and book spaces" : "list your spaces"}?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddRole(viewMode === "provider" ? "seeker" : "provider")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add {viewMode === "provider" ? "Seeker" : "Provider"} Role
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">
                  <LayoutDashboard className="w-4 h-4 mr-1" /> Overview
                </TabsTrigger>
                <TabsTrigger value="messages" className="relative">
                  <MessageSquare className="w-4 h-4 mr-1" /> Messages
                  {unreadTotal > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1 text-[10px]">{unreadTotal}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  <Star className="w-4 h-4 mr-1" /> Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
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
            <p className="text-sm text-muted-foreground">Select a conversation to view messages.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

const ProviderView = ({ profile, userId }: { profile: any; userId?: string }) => {
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
            <CardTitle className="text-lg">Create Listing</CardTitle>
            <CardDescription>Add a new space to your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link to="/list">
                <Plus className="w-4 h-4 mr-2" /> New Listing
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
            <CardTitle className="text-lg">Active Bookings</CardTitle>
            <CardDescription>Current reservations on your spots</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{activeBookings}</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Revenue</CardTitle>
            <CardDescription>Total earnings this month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">${revenue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>
      {userId && <ProviderActiveBookings userId={userId} />}
      {userId && <ProviderCancelledBookings userId={userId} />}
      <MyListings />
    </div>
  );
};

const SeekerView = ({ userId }: { userId?: string }) => {
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
            <CardTitle className="text-lg">Parking Bookings</CardTitle>
            <CardDescription>Upcoming & active parking reservations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{parkingCount}</p>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/find?category=parking"><Car className="w-4 h-4 mr-1" /> Find Parking</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Storage Contracts</CardTitle>
            <CardDescription>Long-term storage rentals</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{storageCount}</p>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/find?category=storage"><Warehouse className="w-4 h-4 mr-1" /> Find Storage</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Spent</CardTitle>
            <CardDescription>Total spent this month</CardDescription>
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
