import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Search, CalendarCheck, KeyRound } from "lucide-react";

const STEP_ICONS = [Search, CalendarCheck, KeyRound];
const STEP_KEYS = ["search", "book", "use"] as const;
const STEP_NUMBERS = ["01", "02", "03"];

const HowItWorksSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-secondary/40">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t("home.howItWorks.title")}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            {t("home.howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {STEP_KEYS.map((key, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="text-center"
              >
                <div className="relative mx-auto w-20 h-20 rounded-full hero-gradient flex items-center justify-center mb-6">
                  <Icon className="w-8 h-8 text-primary-foreground" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                    {STEP_NUMBERS[index]}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {t(`home.howItWorks.steps.${key}.title`)}
                </h3>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                  {t(`home.howItWorks.steps.${key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
