// Reusable form validators for profile, booking intake, and general use.
import i18n from "@/i18n";

export const isBlank = (v: string | null | undefined) => !v || !v.trim();

/** Full name: letters, spaces, hyphens, apostrophes, periods. No digits. */
export function validateFullName(v: string): string | null {
  const s = (v || "").trim();
  if (!s) return i18n.t("validators.fullNameRequired");
  if (s.length < 2) return i18n.t("validators.minLength", { count: 2 });
  if (s.length > 100) return i18n.t("validators.maxLength", { count: 100 });
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]+$/.test(s)) return i18n.t("validators.noNumbersOrSpecialChars");
  return null;
}

/** Accepts CA/US phone in common formats. Returns E.164 (+1...) or null on invalid. */
export function normalizePhoneE164(v: string): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function validatePhone(v: string): string | null {
  if (!v || !v.trim()) return null; // optional unless caller marks required
  return normalizePhoneE164(v) ? null : i18n.t("validators.invalidPhone");
}

/** Canadian postal code regex. */
const CA_POSTAL = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const US_ZIP = /^\d{5}(-\d{4})?$/;

export function detectPostalKind(v: string): "ca" | "us" | "unknown" {
  const s = (v || "").trim();
  if (!s) return "unknown";
  if (CA_POSTAL.test(s)) return "ca";
  if (US_ZIP.test(s)) return "us";
  // Heuristic while typing
  return /[A-Za-z]/.test(s) ? "ca" : "us";
}

export function formatPostalCode(v: string, country?: "CA" | "US"): string {
  const s = (v || "").trim();
  if (country === "US") return s;
  if (country === "CA" || CA_POSTAL.test(s)) {
    const compact = s.replace(/[ -]/g, "").toUpperCase();
    if (compact.length >= 4) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
    return compact;
  }
  return s;
}

export function validatePostalCode(v: string, country?: "CA" | "US"): string | null {
  if (!v || !v.trim()) return null;
  const s = v.trim();
  if (country === "CA") {
    return CA_POSTAL.test(s) ? null : i18n.t("validators.invalidCaPostal");
  }
  if (country === "US") {
    return US_ZIP.test(s) ? null : i18n.t("validators.invalidUsZip");
  }
  if (CA_POSTAL.test(s) || US_ZIP.test(s)) return null;
  return i18n.t("validators.invalidPostalOrZip");
}


/** License plate: alphanumeric, 1–8 chars, uppercase. */
export function validatePlate(v: string): string | null {
  const s = (v || "").trim().toUpperCase();
  if (!s) return i18n.t("validators.plateRequired");
  if (!/^[A-Z0-9]{1,8}$/.test(s)) return i18n.t("validators.plateFormat");
  return null;
}

/** Driver's license: alphanumeric, 5–20 chars. Optional -- a blank value is
 *  valid; the format check only applies once the renter actually types
 *  something, same "optional unless caller marks required" pattern as
 *  validatePhone. Only caller is BookingIntake.tsx's vehicle/driver step. */
export function validateDriversLicense(v: string): string | null {
  const s = (v || "").trim();
  if (!s) return null;
  if (!/^[A-Za-z0-9 -]{5,20}$/.test(s)) return i18n.t("validators.driversLicenseFormat");
  return null;
}

export function requireSelect(v: string | null | undefined, label: string): string | null {
  if (!v || !v.trim()) return i18n.t("validators.fieldRequired", { label });
  return null;
}
