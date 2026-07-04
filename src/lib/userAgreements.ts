import { supabase } from "@/integrations/supabase/client";

/**
 * Records the user's acceptance of the current Terms and Privacy Policy
 * versions. Safe to call multiple times — a duplicate row per version is
 * acceptable and cheap. Callers should not await this in critical paths.
 */
export async function recordUserAgreement(userId: string) {
  try {
    const { data: pages } = await supabase
      .from("site_pages")
      .select("slug, updated_at")
      .in("slug", ["terms-and-conditions", "privacy-policy"]);

    const terms = pages?.find((p) => p.slug === "terms-and-conditions")?.updated_at ?? null;
    const privacy = pages?.find((p) => p.slug === "privacy-policy")?.updated_at ?? null;

    await supabase.from("user_agreements").insert({
      user_id: userId,
      terms_version: terms,
      privacy_version: privacy,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      ip_address: null,
    });
  } catch {
    // Non-fatal.
  }
}

/**
 * Records an agreement only if the user has never accepted before — used on
 * first OAuth login where we don't know if the user is new.
 */
export async function recordUserAgreementIfMissing(userId: string) {
  try {
    const { data: existing } = await supabase
      .from("user_agreements")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (existing) return;
    await recordUserAgreement(userId);
  } catch {
    // Non-fatal.
  }
}
