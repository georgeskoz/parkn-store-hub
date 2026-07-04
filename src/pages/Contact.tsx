import { useEffect, useState } from "react";
import { z } from "zod";
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

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

interface Company {
  company_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  address: string | null;
}

const Contact = () => {
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
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Please check the form", description: parsed.error.errors[0].message, variant: "destructive" });
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
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Contact SpotsVault" description="Get in touch with the SpotsVault team." path="/contact" />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground">Get in touch</h1>
          <p className="mt-2 text-muted-foreground">
            We usually reply within one business day.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <aside className="md:col-span-1 space-y-4">
            {company?.support_email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">Email</div>
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
                  <div className="text-sm font-medium text-foreground">Phone</div>
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
                  <div className="text-sm font-medium text-foreground">Address</div>
                  <div className="text-sm text-muted-foreground">{company.address}</div>
                </div>
              </div>
            )}
          </aside>

          <div className="md:col-span-2">
            {submitted ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-foreground mb-1">Message sent</h2>
                <p className="text-muted-foreground mb-4">Thanks for reaching out — we'll be in touch soon.</p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>Send another</Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={form.name} maxLength={100}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} maxLength={255}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={form.subject} maxLength={200}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" rows={6} value={form.message} maxLength={2000}
                    onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Send message"}
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
