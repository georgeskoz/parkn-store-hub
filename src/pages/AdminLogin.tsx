import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      toast({ title: "Login failed", description: authError?.message || "Invalid credentials", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Check admin role using the has_role function
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      await supabase.auth.signOut();
      toast({ title: "Access denied", description: "You do not have admin privileges.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    navigate("/admin");
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 font-bold text-xl text-foreground justify-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-destructive flex items-center justify-center">
            <Shield className="w-6 h-6 text-destructive-foreground" />
          </div>
          Spotsvault Admin
        </div>

        <Card className="card-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Portal</CardTitle>
            <CardDescription>Sign in with your admin credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@spotsvault.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={submitting}>
                {submitting ? "Verifying..." : "Sign In as Admin"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
