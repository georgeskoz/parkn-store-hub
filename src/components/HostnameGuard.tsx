import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ADMIN_HOST = "admin.spotsvault.com";
const WWW_HOSTS = ["www.spotsvault.com", "spotsvault.com"];

/**
 * Enforces hostname ↔ route isolation:
 * - On admin.spotsvault.com: only /admin/* and /dashboard/* and /auth allowed → else redirect to /admin
 * - On www.spotsvault.com (production only): any /admin/* path is redirected to https://admin.spotsvault.com/admin/*
 *
 * Auth/role enforcement is still handled by AdminLayout (Supabase has_role check).
 * This guard only handles domain isolation, not authorization.
 */
const HostnameGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    const path = location.pathname;

    // On admin subdomain: block consumer routes
    if (host === ADMIN_HOST) {
      const allowed =
        path.startsWith("/admin") ||
        path.startsWith("/dashboard") ||
        path.startsWith("/auth");
      if (!allowed) {
        navigate("/admin", { replace: true });
      }
      return;
    }

    // On consumer domain: redirect /admin/* over to the admin subdomain
    if (WWW_HOSTS.includes(host) && path.startsWith("/admin")) {
      const target = `https://${ADMIN_HOST}${path}${location.search}${location.hash}`;
      window.location.replace(target);
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
};

export default HostnameGuard;
