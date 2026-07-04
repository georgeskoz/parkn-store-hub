import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

interface Props {
  slug: string;
  fallbackTitle?: string;
  footerSlot?: React.ReactNode;
}

const MarkdownPage = ({ slug, fallbackTitle, footerSlot }: Props) => {
  const [title, setTitle] = useState(fallbackTitle ?? "");
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("title, content")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setTitle(data.title);
        setContent(data.content);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={title || fallbackTitle || "SpotsVault"} description={title} />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : notFound ? (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              {fallbackTitle || "Coming soon"}
            </h1>
            <p className="text-muted-foreground">
              This page hasn't been published yet. Please check back soon.
            </p>
          </div>
        ) : (
          <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ""}</ReactMarkdown>
          </article>
        )}
        {footerSlot}
      </main>
      <Footer />
    </div>
  );
};

export default MarkdownPage;
