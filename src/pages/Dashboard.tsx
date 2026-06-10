import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Warehouse, LogOut, User, Plus, ArrowLeftRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import MyListings from "@/components/dashboard/MyListings";
import StripeConnectCard from "@/components/dashboard/StripeConnectCard";

type ViewMode = "provider" | "seeker";

const Dashboard = () => {
  const { user, profile, roles, signOut, addRole } = useAuth();
  const { toast } = useToast();
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
      {/* Top Bar */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <div className="w-7 h-7 rounded-lg hero-gradient flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            SpotVault
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
        {/* Role Selection / Onboarding */}
        {roles.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to SpotVault!</h1>
            <p className="text-muted-foreground mb-8">How would you like to use SpotVault? You can always add the other role later.</p>
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

        {/* Dashboard Content */}
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

            {/* Add missing role CTA */}
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

            {viewMode === "provider" ? <ProviderView /> : <SeekerView />}
          </div>
        )}
      </main>
    </div>
  );
};

const ProviderView = () => (
  <div className="space-y-6">
    <div className="grid md:grid-cols-3 gap-6">
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
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Active Bookings</CardTitle>
          <CardDescription>Current reservations on your spots</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">0</p>
        </CardContent>
      </Card>
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Revenue</CardTitle>
          <CardDescription>Total earnings this month</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">$0.00</p>
        </CardContent>
      </Card>
    </div>
    <MyListings />
  </div>
);

const SeekerView = () => (
  <div className="grid md:grid-cols-3 gap-6">
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">My Bookings</CardTitle>
        <CardDescription>Upcoming & active reservations</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-foreground">0</p>
        <Button variant="outline" size="sm" className="mt-4 w-full">
          <Car className="w-4 h-4 mr-1" /> Find Parking
        </Button>
      </CardContent>
    </Card>
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Storage Contracts</CardTitle>
        <CardDescription>Long-term storage rentals</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-foreground">0</p>
        <Button variant="outline" size="sm" className="mt-4 w-full">
          <Warehouse className="w-4 h-4 mr-1" /> Find Storage
        </Button>
      </CardContent>
    </Card>
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Spent</CardTitle>
        <CardDescription>Total spent this month</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-foreground">$0.00</p>
      </CardContent>
    </Card>
  </div>
);

export default Dashboard;
