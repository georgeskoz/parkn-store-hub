import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

// EN | FR pill — matches the existing Button variant="ghost" size="sm"
// pattern already used for every other Navbar control. Persistence is
// automatic: the custom detector registered in src/i18n/index.ts hooks
// into i18next's languageChanged event and writes to localStorage
// whenever changeLanguage() runs, whether triggered by auto-detection
// (geo/browser) or a manual pick here — a manual pick always wins on
// future visits since localStorage is checked first.
const LanguageToggle = ({ className }: { className?: string }) => {
  const { i18n, t } = useTranslation();
  const current: LanguageCode = i18n.language?.toLowerCase().startsWith("fr") ? "fr" : "en";

  function switchTo(code: LanguageCode) {
    if (code === current) return;
    void i18n.changeLanguage(code);
  }

  return (
    <div className={cn("flex items-center rounded-md border border-border p-0.5", className)}>
      {LANGUAGES.map(({ code, label }) => (
        <Button
          key={code}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => switchTo(code)}
          aria-pressed={current === code}
          aria-label={t("nav.languageToggleLabel", {
            language: t(code === "en" ? "nav.languageEnglish" : "nav.languageFrench"),
          })}
          className={cn(
            "h-7 px-2 text-xs font-semibold",
            current === code
              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </Button>
      ))}
    </div>
  );
};

export default LanguageToggle;
