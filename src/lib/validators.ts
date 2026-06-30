// Reusable form validators for profile, booking intake, and general use.

export const isBlank = (v: string | null | undefined) => !v || !v.trim();

/** Full name: letters, spaces, hyphens, apostrophes, periods. No digits. */
export function validateFullName(v: string): string | null {
  const s = (v || "").trim();
  if (!s) return "Full name is required";
  if (s.length < 2) return "Must be at least 2 characters";
  if (s.length > 100) return "Must be 100 characters or less";
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]+$/.test(s)) return "No numbers or special characters";
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
  return normalizePhoneE164(v) ? null : "Use (514) 555-1234 or +1-514-555-1234";
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

export function formatPostalCode(v: string): string {
  const s = (v || "").trim();
  if (CA_POSTAL.test(s)) {
    const compact = s.replace(/[ -]/g, "").toUpperCase();
    return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  }
  return s;
}

export function validatePostalCode(v: string): string | null {
  if (!v || !v.trim()) return null;
  const s = v.trim();
  if (CA_POSTAL.test(s) || US_ZIP.test(s)) return null;
  return "Enter a valid postal code (A1A 1A1) or ZIP (12345 or 12345-6789)";
}

/** License plate: alphanumeric, 1–8 chars, uppercase. */
export function validatePlate(v: string): string | null {
  const s = (v || "").trim().toUpperCase();
  if (!s) return "License plate is required";
  if (!/^[A-Z0-9]{1,8}$/.test(s)) return "Letters and numbers only, max 8 characters";
  return null;
}

/** Driver's license: alphanumeric, 5–20 chars. */
export function validateDriversLicense(v: string): string | null {
  const s = (v || "").trim();
  if (!s) return "Driver's license is required";
  if (!/^[A-Za-z0-9 -]{5,20}$/.test(s)) return "5–20 characters, letters/numbers only";
  return null;
}

export function requireSelect(v: string | null | undefined, label: string): string | null {
  if (!v || !v.trim()) return `${label} is required`;
  return null;
}
