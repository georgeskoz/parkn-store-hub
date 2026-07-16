import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Loader2, Upload, Camera, Trash2, AlertTriangle } from "lucide-react";
import {
  validateFullName,
  validatePhone,
  normalizePhoneE164,
  validatePostalCode,
  formatPostalCode,
} from "@/lib/validators";

const CA_PROVINCES: Array<{ code: string; name: string }> = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

const US_STATES: Array<{ code: string; name: string }> = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }));

export default function ProfileSettings() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const p = profile as any;
  const [form, setForm] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    phone: profile?.phone || "",
    postal_code: p?.postal_code || "",
    address_line1: p?.address_line1 || "",
    address_line2: p?.address_line2 || "",
    city: p?.city || "",
    province: p?.province || "",
    country: (p?.country as "CA" | "US") || "CA",
    avatar_url: profile?.avatar_url || "",
  });
  const [errors, setErrors] = useState<{
    display_name?: string;
    phone?: string;
    postal_code?: string;
    address_line1?: string;
    city?: string;
    province?: string;
  }>({});

  const regionOptions = form.country === "US" ? US_STATES : CA_PROVINCES;
  const regionLabel = form.country === "US" ? "State" : "Province";

  const runValidation = (f = form) => {
    const e: typeof errors = {};
    const en = validateFullName(f.display_name);
    if (en) e.display_name = en;
    const ep = validatePhone(f.phone);
    if (ep) e.phone = ep;
    const epc = validatePostalCode(f.postal_code, f.country);
    if (epc) e.postal_code = epc;
    if (!f.address_line1.trim()) e.address_line1 = "Address is required";
    if (!f.city.trim()) e.city = "City is required";
    if (!f.province.trim()) e.province = `${f.country === "US" ? "State" : "Province"} is required`;
    return e;
  };
  const hasErrors = (e: typeof errors) => Object.values(e).some(Boolean);

  const handleAvatarFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed) throw sErr || new Error("Could not create URL");
      setForm(p => ({ ...p, avatar_url: signed.signedUrl }));
      toast({ title: "Photo uploaded", description: "Click Save Changes to apply." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const e = runValidation();
    setErrors(e);
    if (hasErrors(e)) return;

    setSaving(true);
    const phoneE164 = form.phone.trim() ? normalizePhoneE164(form.phone) : null;
    const postal = form.postal_code.trim() ? formatPostalCode(form.postal_code) : null;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name.trim(),
        bio: form.bio,
        phone: phoneE164,
        postal_code: postal,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || null,
        city: form.city.trim(),
        province: form.province,
        country: form.country,
        avatar_url: form.avatar_url,
      } as any)
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setErrors({});
      await refreshProfile();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast({
        title: "Account deleted",
        description: "Your account has been deactivated. We're sorry to see you go.",
      });
      await signOut();
      navigate("/", { replace: true });
    } catch (e: any) {
      toast({
        title: "Could not delete account",
        description: e?.message || "Please try again or contact support.",
        variant: "destructive",
      });
      setDeleting(false);
    }
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
            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label>Profile Photo</Label>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ""; }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ""; }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Photo
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
                    <Camera className="w-4 h-4 mr-2" />
                    Take Selfie
                  </Button>
                  {form.avatar_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setForm(p => ({ ...p, avatar_url: "" }))} disabled={uploading}>
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG/JPG up to 5MB</p>
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly disabled />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be edited here.</p>
            </div>

            <div>
              <Label htmlFor="display_name">Full Name *</Label>
              <Input
                id="display_name"
                placeholder="Your name"
                value={form.display_name}
                onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                onBlur={() => setErrors(p => ({ ...p, display_name: validateFullName(form.display_name) || undefined }))}
                className={errors.display_name ? "border-destructive" : ""}
                maxLength={100}
              />
              {errors.display_name && (
                <p className="text-xs text-destructive mt-1">{errors.display_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(514) 555-1234"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                onBlur={() => setErrors(p => ({ ...p, phone: validatePhone(form.phone) || undefined }))}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone ? (
                <p className="text-xs text-destructive mt-1">{errors.phone}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Format: (514) 555-1234 or +1-514-555-1234. Stored as +15145551234.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="address_line1">Address Line 1 *</Label>
              <Input
                id="address_line1"
                placeholder="123 Main St"
                value={form.address_line1}
                onChange={e => setForm(p => ({ ...p, address_line1: e.target.value }))}
                onBlur={() => setErrors(p => ({ ...p, address_line1: form.address_line1.trim() ? undefined : "Address is required" }))}
                className={errors.address_line1 ? "border-destructive" : ""}
                maxLength={200}
              />
              {errors.address_line1 && (
                <p className="text-xs text-destructive mt-1">{errors.address_line1}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                placeholder="Apt, suite, unit (optional)"
                value={form.address_line2}
                onChange={e => setForm(p => ({ ...p, address_line2: e.target.value }))}
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Montreal"
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  onBlur={() => setErrors(p => ({ ...p, city: form.city.trim() ? undefined : "City is required" }))}
                  className={errors.city ? "border-destructive" : ""}
                  maxLength={100}
                />
                {errors.city && (
                  <p className="text-xs text-destructive mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  value={form.country}
                  onValueChange={(v) => setForm(p => ({ ...p, country: v as "CA" | "US", province: "" }))}
                >
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="province">{regionLabel} *</Label>
                <Select
                  value={form.province}
                  onValueChange={(v) => {
                    setForm(p => ({ ...p, province: v }));
                    setErrors(p => ({ ...p, province: undefined }));
                  }}
                >
                  <SelectTrigger
                    id="province"
                    className={errors.province ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder={`Select ${regionLabel.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map(o => (
                      <SelectItem key={o.code} value={o.code}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.province && (
                  <p className="text-xs text-destructive mt-1">{errors.province}</p>
                )}
              </div>

              <div>
                <Label htmlFor="postal_code">
                  {form.country === "US" ? "ZIP Code" : "Postal Code"}
                </Label>
                <Input
                  id="postal_code"
                  placeholder={form.country === "US" ? "12345" : "A1A 1A1"}
                  value={form.postal_code}
                  onChange={e => setForm(p => ({ ...p, postal_code: e.target.value }))}
                  onBlur={() =>
                    setForm(p => {
                      const formatted = p.postal_code.trim() ? formatPostalCode(p.postal_code) : "";
                      setErrors(prev => ({ ...prev, postal_code: validatePostalCode(formatted) || undefined }));
                      return { ...p, postal_code: formatted };
                    })
                  }
                  className={errors.postal_code ? "border-destructive" : ""}
                />
                {errors.postal_code && (
                  <p className="text-xs text-destructive mt-1">{errors.postal_code}</p>
                )}
              </div>
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
              <Button onClick={handleSave} disabled={saving || hasErrors(runValidation())}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow mt-8 border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently disable your account. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirm(""); }}>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Account
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete your account?</DialogTitle>
                  <DialogDescription className="space-y-2 pt-2">
                    <span className="block">This action is permanent. Once confirmed:</span>
                    <span className="block">• Your login will be disabled and personal info (name, photo, phone, bio) removed.</span>
                    <span className="block">• All your listings will be unpublished.</span>
                    <span className="block">• Bookings, payments, and reviews will be retained for legal and accounting purposes and to preserve other users' records.</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
                  <Input
                    id="confirm-delete"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteConfirm !== "DELETE" || deleting}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Permanently delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
