import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Car, MapPin, DollarSign, BadgeCheck } from "lucide-react";

// The 4 marketing-copy steps below intentionally condense the real 7-step
// wizard in ListYourSpace.tsx (type/category, location, details, photos,
// pricing, extras, review) into what a first-time visitor actually needs to
// know: what you pick, what you add, what you set, and what happens next.
// Keep this in sync in spirit (not step-for-step) if that wizard's flow
// changes materially.
const STEP_ICONS = [Car, MapPin, DollarSign, BadgeCheck];
const STEP_KEYS = ["chooseType", "addDetails", "setPrice", "getApproved"] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Counts up from 0 to `to` once, the first time it scrolls into view --
// framer-motion's imperative `animate()` drives a plain number in state
// rather than a motion value in the DOM, since the value needs to render as
// ordinary text (with a $ prefix) rather than as a CSS property.
function AnimatedDollar({ to, duration = 1.2 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  return <span ref={ref}>${display}</span>;
}

const ListingStepsSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-secondary/40" data-testid="listing-steps-section">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("home.listSteps.title")}</h2>
          <p className="mt-4 text-muted-foreground text-lg">{t("home.listSteps.subtitle")}</p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="relative grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6 max-w-5xl mx-auto"
        >
          {/* Connecting line, desktop only -- draws in left to right as the
              steps stagger in, so the sequence reads as one motion rather
              than four separate cards. */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
            className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-primary/30 origin-left"
          />
          {STEP_KEYS.map((key, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <motion.div key={key} variants={item} className="relative text-center">
                <div className="relative z-10 mx-auto w-16 h-16 rounded-full hero-gradient flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-primary-foreground" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {t(`home.listSteps.steps.${key}.title`)}
                </h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {t(`home.listSteps.steps.${key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Pricing comparison -- real, cited garage rates on the left; the
            right side deliberately doesn't invent a platform-wide SpotsVault
            price, since hosts set their own. The honest claim is structural
            (no garage overhead), not a specific number we don't control. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 max-w-3xl mx-auto rounded-2xl border border-border bg-card card-shadow p-8 md:p-10"
        >
          <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("home.pricingCompare.label")}
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
            <div className="text-center sm:border-r sm:border-border">
              <div className="text-3xl md:text-4xl font-extrabold text-foreground">
                <AnimatedDollar to={110} /> &ndash; <AnimatedDollar to={240} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t("home.pricingCompare.garageLabel")}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-primary">
                {t("home.pricingCompare.hostSetLabel")}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t("home.pricingCompare.hostSetSubtitle")}</p>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">{t("home.pricingCompare.note")}</p>
        </motion.div>
      </div>
    </section>
  );
};

export default ListingStepsSection;
