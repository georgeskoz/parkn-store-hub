
-- site_pages
CREATE TABLE public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_pages TO anon, authenticated;
GRANT ALL ON public.site_pages TO service_role;
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view site pages" ON public.site_pages FOR SELECT USING (true);
CREATE POLICY "Admins manage site pages" ON public.site_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER site_pages_updated BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- company_settings
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'SpotsVault',
  support_email text,
  support_phone text,
  address text,
  hours text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view company settings" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage company settings" ON public.company_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER company_settings_updated BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- support_tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.support_tickets TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a ticket" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete tickets" ON public.support_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER support_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed company settings
INSERT INTO public.company_settings (company_name, support_email, support_phone, address, hours)
VALUES ('SpotsVault', 'support@spotsvault.ca', '+1 (514) 555-0142', 'Montréal, Québec, Canada', 'Mon–Fri, 9am–6pm ET');

-- Seed About page
INSERT INTO public.site_pages (slug, title, content) VALUES
('about-us', 'About SpotsVault', $md$# About SpotsVault

## Your space, your way.

SpotsVault is a Canadian peer-to-peer marketplace connecting people who have space to spare — a driveway, a garage, a spare room, a storage unit — with people who need it, whether for an afternoon or a season.

We built SpotsVault because two things are true at the same time: parking and storage are chronically hard to find in busy Canadian cities, and thousands of driveways, garages, and basements sit empty every day.

## Our Values

- **Trust first.** Every host and every seeker should feel confident in who they're dealing with.
- **Fair to both sides.** Hosts set their own terms; seekers get transparent pricing with no surprise fees.
- **Community-driven.** Reviews, ratings, and a real dispute process keep everyone accountable.

## Get in Touch

Have questions, feedback, or a partnership idea? Visit our Contact page or reach out through our Help Center — we'd love to hear from you.
$md$),
('support-faq', 'Help & Support', $md$# Help & Support

Below are answers to some common questions. If you don't find what you need, please [contact us](/contact).

## Getting Started

**How do I book a spot?**
Search for parking or storage in your area, pick a listing, choose your dates, and confirm payment. You'll get an instant confirmation.

**How do I list my space?**
Click "List Your Space" in the navigation, follow the 7-step form, and publish. You can edit or pause your listing anytime from the dashboard.

## Payments

**When am I charged?**
Your card is charged when the booking is confirmed. Funds are held securely in escrow and released to the host after the rental completes.

**How do refunds work?**
Cancellation refunds depend on how close to the start date you cancel. See each listing's cancellation policy for details.

## Trust & Safety

**What if there's a problem?**
Open a dispute from the booking page within the dispute window. Our team reviews evidence from both sides and issues a fair resolution.

Still need help? [Contact our support team](/contact).
$md$);
