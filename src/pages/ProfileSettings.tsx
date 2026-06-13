import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Loader2, Upload, Camera } from "lucide-react";

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    phone: profile?.phone || "",
    avatar_url: profile?.avatar_url || "",
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name,
        bio: form.bio,
        phone: form.phone,
        avatar_url: form.avatar_url,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-1">Profile Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your personal information</p>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
            <CardDescription>This information will be visible to other users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Avatar placeholder */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  placeholder="https://example.com/avatar.jpg"
                  value={form.avatar_url}
                  onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Paste a URL to your profile photo</p>
              </div>
            </div>

            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                placeholder="Your name"
                value={form.display_name}
                onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell others a bit about yourself…"
                rows={4}
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
