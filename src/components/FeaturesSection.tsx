import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Car, Warehouse, Shield, Clock, Star, CreditCard } from "lucide-react";

const FEATURE_ICONS = [Car, Warehouse, Shield, Clock, Star, CreditCard];
const FEATURE_KEYS = ["parking", "storage", "payments", "booking", "reviews", "earn"] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t("home.features.titleLead")}{" "}
            <span className="text-primary">{t("home.features.titleAccent")}</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            {t("home.features.subtitle")}
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURE_KEYS.map((key, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <motion.div
                key={key}
                variants={item}
                className="group p-6 rounded-xl bg-card border border-border card-shadow hover:card-shadow-hover transition-shadow duration-300"
              >
                <div className="w-12 h-12 rounded-lg hero-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  {t(`home.features.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {t(`home.features.items.${key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
