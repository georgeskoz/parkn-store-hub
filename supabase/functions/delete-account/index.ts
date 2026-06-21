import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);

    // 1. Anonymize profile
    const placeholderEmail = `deleted-user-${userId}@spotsvault.invalid`;
    const { error: profErr } = await admin
      .from("profiles")
      .update({
        display_name: "Deleted User",
        phone: null,
        bio: null,
        avatar_url: null,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (profErr) console.error("profile update error", profErr);

    // 2. Unpublish listings (match host_id OR user_id)
    const { error: l1 } = await admin.from("listings").update({ status: "removed" }).eq("host_id", userId);
    if (l1) console.error("listings host_id update error", l1);
    const { error: l2 } = await admin.from("listings").update({ status: "removed" }).eq("user_id", userId);
    if (l2) console.error("listings user_id update error", l2);

    // 3. Ban auth user + update email
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      email: placeholderEmail,
      ban_duration: "876600h",
      user_metadata: { deleted: true, deleted_at: new Date().toISOString() },
    });
    if (updErr) {
      console.error("auth admin update error", updErr);
      return json({ error: "Failed to disable account", details: updErr.message }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("delete-account error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
