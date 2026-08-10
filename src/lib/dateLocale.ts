import { fr, enCA } from "date-fns/locale";
import i18n from "@/i18n";

/** Intl/native locale tag (toLocaleDateString, toLocaleString, toLocaleTimeString) driven by the active site language. */
export function getIntlLocale(): string {
  return i18n.language?.toLowerCase().startsWith("fr") ? "fr-CA" : "en-CA";
}

/** date-fns Locale object (format(), etc.) driven by the active site language. */
export function getDateFnsLocale() {
  return i18n.language?.toLowerCase().startsWith("fr") ? fr : enCA;
}
