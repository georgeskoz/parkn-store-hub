import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Car, Package, KeyRound, ShieldCheck, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shown once per browser on first visit -- a lightweight web counterpart to
// the mobile app's swipeable first-launch walkthrough (see
// spotsvault-mobile/mobile/src/app/onboarding.tsx), so a visitor who lands
// on the site cold gets the same "what is this" orientation. Mounted
// globally in App.tsx rather than only on the homepage, since a shared link
// can land someone on any page first.
const ONBOARDING_STORAGE_KEY = "spotsvault_onboarding_seen";

const SCREENS = [
  { key: "welcome", Icon: MapPin },
  { key: "findParking", Icon: Car },
  { key: "storeThings", Icon: Package },
  { key: "becomeHost", Icon: KeyRound },
  { key: "bookedConfidence", Icon: ShieldCheck },
  { key: "allSet", Icon: PartyPopper },
] as const;

const LAST_INDEX = SCREENS.length - 1;

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
  } catch {
    // localStorage blocked (private mode / an extension) -- default to
    // showing rather than throwing; worst case it reappears next visit.
    return false;
  }
}

function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch {
    // Best-effort persistence, same as the language-detection cache in
    // src/i18n/index.ts -- a failed write just means it may show again.
  }
}

const OnboardingWelcomeModal = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!hasSeenOnboarding()) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const finish = useCallback(() => {
    markOnboardingSeen();
    setOpen(false);
  }, []);

  // Covers every dismiss path Radix's Dialog can trigger -- the X button,
  // Escape, and clicking the overlay -- not just our own buttons below.
  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) markOnboardingSeen();
    setOpen(next);
  }, []);

  const isLast = selectedIndex === LAST_INDEX;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0" data-testid="onboarding-welcome-modal">
        {/* Visually hidden -- DialogContent requires an accessible title/description,
            but this screen already renders its own visible heading per slide. */}
        <DialogTitle className="sr-only">{t("onboarding.screens.welcome.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("onboarding.screens.welcome.subtitle")}</DialogDescription>

        {/* min-w-0 is the fix: DialogContent is `display:grid` with implicit
            auto-sized columns (no grid-cols-N, so no built-in minmax(0,1fr)
            floor). Without it, the grid track sizes to this carousel's
            max-content width -- which for a flex row of 6 basis-full slides
            is their SUMMED width (~965px), not the container's 448px -- and
            overflow-hidden then clips the visual box while embla measures
            and lays out slides against that oversized width, producing the
            squished/cut-off modal seen in production. min-w-0 tells grid to
            ignore this item's intrinsic content width when sizing the
            track, letting it shrink to the actual 448px column instead. */}
        <Carousel setApi={setApi} className="w-full min-w-0 pt-4">
          <CarouselContent className="ml-0">
            {SCREENS.map(({ key, Icon }) => (
              <CarouselItem key={key} className="pl-0">
                <div className="flex flex-col items-center px-8 pb-6 pt-6 text-center">
                  <div className="hero-gradient mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                    <Icon className="h-9 w-9 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {t(`onboarding.screens.${key}.title`)}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {t(`onboarding.screens.${key}.subtitle`)}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="flex items-center justify-center gap-2 pb-2" data-testid="onboarding-dots">
          {SCREENS.map((screen, index) => (
            <span
              key={screen.key}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === selectedIndex ? "w-6 bg-primary" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={finish}
            className={cn(isLast && "pointer-events-none opacity-0")}
            data-testid="onboarding-skip-button"
          >
            {t("onboarding.skip")}
          </Button>
          <Button
            type="button"
            onClick={() => (isLast ? finish() : api?.scrollNext())}
            className="px-6"
            data-testid={isLast ? "onboarding-get-started-button" : "onboarding-next-button"}
          >
            {isLast ? t("onboarding.getStarted") : t("common.next")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWelcomeModal;
