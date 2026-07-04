import MarkdownPage from "@/components/MarkdownPage";
import { Link } from "react-router-dom";

const Support = () => (
  <MarkdownPage
    slug="support-faq"
    fallbackTitle="Help & Support"
    footerSlot={
      <div className="mt-10 p-6 rounded-lg border border-border bg-card">
        <h3 className="font-semibold text-foreground mb-1">Still need help?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Anything not covered above — reach our team directly.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          Contact support →
        </Link>
      </div>
    }
  />
);

export default Support;
