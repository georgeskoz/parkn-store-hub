import { useTranslation } from "react-i18next";
import MarkdownPage from "@/components/MarkdownPage";
import { Link } from "react-router-dom";

const Support = () => {
  const { t } = useTranslation();
  return (
    <MarkdownPage
      slug="support-faq"
      fallbackTitle={t("staticPages.helpAndSupport")}
      footerSlot={
        <div className="mt-10 p-6 rounded-lg border border-border bg-card">
          <h3 className="font-semibold text-foreground mb-1">{t("staticPages.stillNeedHelp")}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t("staticPages.anythingNotCovered")}
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            {t("staticPages.contactSupportArrow")}
          </Link>
        </div>
      }
    />
  );
};

export default Support;
