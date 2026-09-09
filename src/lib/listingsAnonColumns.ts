// Columns public.listings actually grants to the `anon` role today —
// verified live directly against production (raw REST call, anon key only,
// no session): `select=*` returns 401 "permission denied for table
// listings", while this exact column list returns 200 with real rows.
//
// This isn't a bug to work around by requesting a broader GRANT — it's the
// deliberate, security-audit-driven result of two real migrations
// (supabase/migrations/20260701131050_*.sql conceived it, 20260814090000_*.sql
// actually applied the corrected version to production): address,
// postal_code, and every Stripe/host-payout field are intentionally
// excluded from anon so an anonymous visitor can't scrape a host's exact
// address or financial linkage before booking. Any page fetching listings
// as a possibly-signed-out visitor (ParkingSearch.tsx, FindASpot.tsx) must
// select from exactly this list, not `*` — requesting `*` asks Postgres for
// every column's privilege at once, so it fails outright the moment even
// one requested column isn't granted, regardless of whether the caller
// actually reads that column.
//
// Keep this in sync with the GRANT SELECT (...) list in
// 20260814090000_4b5ff00f-eddf-48df-bf2b-74f1d0a5a00d.sql if that migration
// is ever revised.
// A single un-concatenated literal, not built with `+` — supabase-js parses
// this exact string's TypeScript *literal* type to infer the returned row
// shape; a `string`-typed value (which `+`-concatenation normally widens
// to) parses as an opaque error type instead, silently losing type-checking
// on every field the caller reads off the result.
export const ANON_SAFE_LISTING_COLUMNS =
  "id,user_id,host_id,category,type,title,description,city,province,country,lat,lng,size_sqft,price_hourly,price_daily,price_weekly,price_monthly,nearby_venues,photos,created_at,updated_at,status,instant_book,is_active,is_approved,amenities,avg_rating,event_pricing_enabled,event_pricing,ai_moderation" as const;
