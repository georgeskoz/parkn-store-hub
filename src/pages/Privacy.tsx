import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { PRIVACY_MARKDOWN_EN, PRIVACY_MARKDOWN_FR } from "@/content/legal/privacy";

const Privacy = () => {
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language?.toLowerCase().startsWith("fr");
  const content = isFrench ? PRIVACY_MARKDOWN_FR : PRIVACY_MARKDOWN_EN;
  const title = t("legal.privacyTitle");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={title} description={title} path="/privacy" />
      <Navbar />
      <main className="flex-1 w-full pt-24 pb-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          <header className="mb-10 pb-6 border-b border-border">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          </header>
          <article
            className="
              prose prose-slate dark:prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight
              prose-h1:text-3xl prose-h1:mt-10 prose-h1:mb-4
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-primary prose-a:font-medium prose-a:underline hover:prose-a:text-primary/80
              prose-li:text-muted-foreground prose-li:my-1
              prose-ul:my-4 prose-ol:my-4
              prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
              prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-hr:border-border
            "
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
