import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Reached either via a real redirect from the recovery email, or (today,
// given the unresolved Site URL / Redirect URLs misconfiguration) via
// AuthContext's PASSWORD_RECOVERY listener navigating here after the link
// lands on the bare Site URL instead. Either way, a valid recovery session
// is already present in AuthContext's `session` by the time this renders.
const ResetPassword = () => {
  const { t } = useTranslation();
  const { session, loading, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: t("auth.passwordsDontMatch"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    if (error) {
      toast({ title: t("auth.passwordUpdateFailed"), description: error.message, variant: "destructive" });
    } else {
      setDone(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground justify-center mb-8">
          <img src="/icon.png" alt="" className="w-8 h-8 rounded-lg" />
          {t("common.appName")}
        </Link>

        <Card className="card-shadow">
          {loading ? (
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("auth.pleaseWait")}
            </CardContent>
          ) : done ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t("auth.passwordUpdated")}</CardTitle>
                <CardDescription>{t("auth.passwordUpdatedDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/dashboard")}>
                  {t("auth.continueToDashboard")}
                </Button>
              </CardContent>
            </>
          ) : !session ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t("auth.invalidOrExpiredLink")}</CardTitle>
                <CardDescription>{t("auth.invalidOrExpiredLinkDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  {t("auth.requestNewLink")}
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t("auth.setNewPassword")}</CardTitle>
                <CardDescription>{t("auth.setNewPasswordDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t("auth.newPassword")}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">{t("auth.confirmNewPassword")}</Label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? t("auth.pleaseWait") : t("auth.updatePassword")}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
