import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { recordUserAgreement } from "@/lib/userAgreements";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const consumePendingBooking = (): { target: string; state: any } | null => {
    try {
      const raw = sessionStorage.getItem("pendingBookingState");
      if (!raw) return null;
      sessionStorage.removeItem("pendingBookingState");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    if (!isLogin && !agreed) {
      toast({
        title: "Agreement required",
        description: "Please accept the Terms and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !agreed) return;
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        // Record Terms/Privacy acceptance for the new user (if a session was created immediately).
        const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
        if (userId) await recordUserAgreement(userId);

        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to verify your account.",
        });
      }
    }
    setSubmitting(false);
  };

  const disableSignupActions = !isLogin && !agreed;

  const AgreementCheckbox = (
    <div className="rounded-md border border-border bg-muted/40 p-3 flex items-start gap-3">
      <Checkbox
        id="agree"
        checked={agreed}
        onCheckedChange={(v) => setAgreed(v === true)}
        className="mt-0.5"
      />
      <Label
        htmlFor="agree"
        className="text-sm font-normal text-foreground leading-snug cursor-pointer"
      >
        I agree to the{" "}
        <Link
          to="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline underline-offset-2 hover:text-primary/80"
        >
          Terms and Conditions
        </Link>{" "}
        and{" "}
        <Link
          to="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline underline-offset-2 hover:text-primary/80"
        >
          Privacy Policy
        </Link>
        .
      </Label>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground justify-center mb-8">
          <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          Spotsvault
        </Link>

        <Card className="card-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{isLogin ? "Welcome back" : "Create your account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to access your dashboard" : "Join Spotsvault to find or list spaces"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isLogin && <div className="mb-4">{AgreementCheckbox}</div>}

            <Button
              type="button"
              variant="outline"
              className="w-full bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              onClick={handleGoogle}
              disabled={googleLoading || submitting || disableSignupActions}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || disableSignupActions}
              >
                {submitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
