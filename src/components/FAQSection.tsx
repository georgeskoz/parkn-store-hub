import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Six honest, verified answers -- pricing (hosts set their own rate, no
// platform-fixed price), the real listing flow, escrow payment protection,
// installments, current service area, and bilingual support. Kept in sync
// with the actual product (see StepPricing.tsx, payout-executor.ts,
// booking_installments) rather than generic marketing copy.
const FAQ_KEYS = ["pricing", "listing", "escrow", "installments", "coverage", "french"] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const FAQSection = () => {
  const { t } = useTranslation();

  // The visible accordion below and this JSON-LD are built from the exact
  // same FAQ_KEYS + translation strings, so the structured data search
  // engines and AI answer engines read can never drift out of sync with
  // what a visitor actually sees on the page.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: t(`home.faq.items.${key}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`home.faq.items.${key}.answer`),
      },
    })),
  };

  return (
    <section className="py-24" data-testid="faq-section">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t("home.faq.title")}</h2>
          <p className="mt-4 text-muted-foreground text-lg">{t("home.faq.subtitle")}</p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-2xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQ_KEYS.map((key) => (
              <motion.div key={key} variants={item}>
                <AccordionItem value={key}>
                  <AccordionTrigger className="text-left text-base">
                    {t(`home.faq.items.${key}.question`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {t(`home.faq.items.${key}.answer`)}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
