import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { listing_id, title, description, photos } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a content moderator for a parking & storage marketplace.
Review the listing for: profanity, scams, illegal activity, prohibited items (weapons, drugs, hazardous materials),
misleading claims, or spam. Respond ONLY with strict JSON:
{"status":"passed"|"flagged","issues":["short issue description", ...]}`;

    const userPrompt = `Title: ${title ?? ""}
Description: ${description ?? ""}
Photos count: ${Array.isArray(photos) ? photos.length : 0}`;

    let moderation: { status: "passed" | "flagged"; issues: string[] } = {
      status: "passed",
      issues: [],
    };

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        const content = data?.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(content);
        if (parsed?.status === "flagged" || parsed?.status === "passed") {
          moderation = {
            status: parsed.status,
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          };
        }
      } else {
        console.error("AI gateway error", aiRes.status, await aiRes.text());
      }
    } catch (e) {
      console.error("AI call failed:", e);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const newStatus = moderation.status === "passed" ? "approved" : "pending";
    const { error } = await admin
      .from("listings")
      .update({
        ai_moderation: moderation,
        status: newStatus,
        is_approved: moderation.status === "passed",
      })
      .eq("id", listing_id);

    if (error) console.error("Update listing failed:", error);

    return new Response(JSON.stringify({ ok: true, moderation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-listing error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
