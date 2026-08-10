import { useTranslation } from "react-i18next";
import MarkdownPage from "@/components/MarkdownPage";
const About = () => {
  const { t } = useTranslation();
  return <MarkdownPage slug="about-us" fallbackTitle={t("staticPages.aboutSpotsVault")} />;
};
export default About;
