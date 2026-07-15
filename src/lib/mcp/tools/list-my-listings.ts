import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { clampLimit, supabaseForUser, textResult } from "./_shared";

export default defineTool({
  name: "list_my_listings",
  title: "List my listings",
  description: "List parking and storage listings owned by the signed-in SpotVault user, including approval and activity status.",
  inputSchema: {
    status: z.string().optional().describe("Optional listing status filter."),
    limit: z.number().optional().describe("Maximum number of listings to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ status, limit }, ctx) => {
    const userId = ctx.getUserId();
    const { client, error } = supabaseForUser(ctx);
    if (error) return error;
    if (!userId) return { content: [{ type: "text", text: "Could not identify the signed-in user." }], isError: true };

    let query = client
      .from("listings")
      .select("id,title,type,category,city,province,region,status,is_active,is_approved,price_hourly,price_daily,price_weekly,price_monthly,availability,instant_book,avg_rating,created_at,updated_at")
      .or(`user_id.eq.${userId},host_id.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(clampLimit(limit, 10, 25));

    if (status?.trim()) query = query.eq("status", status.trim());

    const { data, error: queryError } = await query;
    if (queryError) return { content: [{ type: "text", text: queryError.message }], isError: true };

    const listings = data ?? [];
    return textResult(
      listings.length ? `Found ${listings.length} listing${listings.length === 1 ? "" : "s"} owned by this account.` : "No listings found for this account.",
      { listings },
    );
  },
});