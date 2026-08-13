-- Two confirmed, ready-to-apply fixes from the comprehensive security audit.
-- Both are additive/idempotent -- safe to run regardless of current state.

-- ============================================================
-- 1. Regression from the profiles column-lockdown fix: admin_notifications
--    and user_agreements broke for every role.
-- ============================================================
--
-- Root cause confirmed via direct SQL introspection (not available to this
-- session, run by the user): both tables carry an "Admin full access"
-- policy with an EXISTS subquery reading profiles.role directly --
--   EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::text)
-- -- rather than going through has_role()/user_roles. This policy isn't in
-- this repo's migration history at all (confirmed via grep, zero matches),
-- so it was created directly on production outside any migration here.
--
-- Postgres checks column privileges for the *entire* combined RLS
-- expression at query-rewrite time, not lazily per matching branch -- so
-- once profiles.role was no longer readable by anon/authenticated, EVERY
-- query against these two tables failed with "permission denied for table
-- profiles", including branches that never needed the admin check at all.
--
-- Re-verified live across all 20 tables in the public schema (not just
-- these two) for the same failure signature -- confirmed nowhere else.
-- role isn't sensitive (admin/host/seeker status, not personal data), so
-- granting it back doesn't reopen the exposure the original fix closed
-- (stripe fields, home address, etc. remain revoked).
GRANT SELECT (role) ON public.profiles TO anon, authenticated;

-- ============================================================
-- 2. public.listings.address / postal_code readable by anon on approved
--    (publicly visible) listings.
-- ============================================================
--
-- A migration already in this repo's history (20260701131050) explicitly
-- restricts these two columns from anon -- exact address is meant to be
-- revealed only after booking, same idea as Airbnb -- but was never
-- applied to production. Confirmed live: pulled a live listing's full
-- street address using nothing but the anon key.
--
-- Only anon is restricted here, matching that migration's original scope
-- exactly -- authenticated already has full column access via a separate,
-- unrestricted GRANT (20260701001002) and is intentionally left untouched.
--
-- Correction from that original migration's column list: before applying
-- this, checked every one of its 46 columns directly against production
-- (safe to do right now specifically because anon still has *unrestricted*
-- table-wide SELECT on listings until this statement runs) -- 17 of them
-- don't exist under those names (region, features, availability, spots,
-- size, sqft, hourly, daily, weekly, monthly, seasonal, cancellation,
-- student_discount, student_discount_percent, student_universities,
-- nearby_landmarks, disclaimer_accepted). GRANT on a nonexistent column
-- errors and would have failed this whole statement, same mistake as the
-- app_role situation. The 30 remaining below were each individually
-- confirmed to exist, and cross-checked against the full row dump captured
-- earlier this week. address and postal_code are correctly absent from
-- both the original list and this one -- that's the fix, not an oversight.
REVOKE SELECT ON public.listings FROM anon;
GRANT SELECT (
  id, user_id, host_id, category, type, title, description,
  city, province, country, lat, lng, size_sqft,
  price_hourly, price_daily, price_weekly, price_monthly,
  nearby_venues, photos, created_at, updated_at, status,
  instant_book, is_active, is_approved, amenities, avg_rating,
  event_pricing_enabled, event_pricing, ai_moderation
) ON public.listings TO anon;
