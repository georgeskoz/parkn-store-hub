import { useEffect, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";

const buildSchema = (t: (key: string) => string) => z.object({
  name: z.string().trim().min(1, t("contact.nameRequired")).max(100),
  email: z.string().trim().email(t("contact.invalidEmail")).max(255),
  subject: z.string().trim().min(1, t("contact.subjectRequired")).max(200),
  message: z.string().trim().min(1, t("contact.messageRequired")).max(2000),
});

interface Company {
  company_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  address: string | null;
}

const Contact = () => {
  const { t } = useTranslation();
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("company_name, support_email, support_phone, address")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCompany(data));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = buildSchema(t).safeParse(form);
    if (!parsed.success) {
      toast({ title: t("contact.pleaseCheckForm"), description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("contact.couldNotSend"), description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={t("contact.seoTitle")} description={t("contact.seoDescription")} path="/contact" />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground">{t("contact.getInTouch")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("contact.usuallyReply")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <aside className="md:col-span-1 space-y-4">
            {company?.support_email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">{t("auth.email")}</div>
                  <a href={`mailto:${company.support_email}`} className="text-sm text-muted-foreground hover:text-foreground">
                    {company.support_email}
                  </a>
                </div>
              </div>
            )}
            {company?.support_phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">{t("contact.phone")}</div>
                  <a href={`tel:${company.support_phone}`} className="text-sm text-muted-foreground hover:text-foreground">
                    {company.support_phone}
                  </a>
                </div>
              </div>
            )}
            {company?.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">{t("contact.address")}</div>
                  <div className="text-sm text-muted-foreground">{company.address}</div>
                </div>
              </div>
            )}
          </aside>

          <div className="md:col-span-2">
            {submitted ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-foreground mb-1">{t("contact.messageSent")}</h2>
                <p className="text-muted-foreground mb-4">{t("contact.thanksForReachingOut")}</p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>{t("contact.sendAnother")}</Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t("contact.name")}</Label>
                    <Input id="name" value={form.name} maxLength={100}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <Input id="email" type="email" value={form.email} maxLength={255}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">{t("contact.subject")}</Label>
                  <Input id="subject" value={form.subject} maxLength={200}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">{t("contact.message")}</Label>
                  <Textarea id="message" rows={6} value={form.message} maxLength={2000}
                    onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("booking.sending") : t("contact.sendMessage")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
