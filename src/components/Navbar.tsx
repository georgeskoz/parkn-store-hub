import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Car, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import NotificationBell from "@/components/notifications/NotificationBell";
import LanguageToggle from "@/components/LanguageToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { total: unreadTotal } = useUnreadMessages();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
            <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            {t("common.appName")}
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/parking" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t("nav.findParking")}
            </Link>
            <Link to="/storage" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t("nav.findStorage")}
            </Link>
            <Link to="/list" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t("nav.listYourSpace")}
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="relative" onClick={() => navigate("/messages")}>
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {t("nav.messages")}
                  {unreadTotal > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1 text-[10px]">{unreadTotal}</Badge>
                  )}
                </Button>
                <NotificationBell />
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  {t("nav.profile")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  {t("nav.dashboard")}
                </Button>
                <Button variant="outline" size="sm" onClick={signOut}>
                  {t("nav.logOut")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  {t("nav.logIn")}
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")}>
                  {t("nav.signUp")}
                </Button>
              </>
            )}
            <LanguageToggle />
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/parking" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t("nav.findParking")}
            </Link>
            <Link to="/storage" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t("nav.findStorage")}
            </Link>
            <Link to="/list" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t("nav.listYourSpace")}
            </Link>
            <div className="flex items-center justify-between gap-2 pt-2 px-3">
              <div className="flex gap-2 flex-1">
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => { navigate("/dashboard"); setIsOpen(false); }}>{t("nav.dashboard")}</Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={signOut}>{t("nav.logOut")}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => { navigate("/auth"); setIsOpen(false); }}>{t("nav.logIn")}</Button>
                    <Button size="sm" className="flex-1" onClick={() => { navigate("/auth"); setIsOpen(false); }}>{t("nav.signUp")}</Button>
                  </>
                )}
              </div>
              <LanguageToggle />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
