import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { clampLimit, supabaseForUser, textResult } from "./_shared";

export default defineTool({
  name: "search_approved_listings",
  title: "Search approved listings",
  description: "Search public, approved SpotVault parking and storage listings by city, type, category, and price.",
  inputSchema: {
    city: z.string().optional().describe("City name to match, such as Montreal or Quebec City."),
    type: z.enum(["parking", "storage"]).optional().describe("Listing type to return."),
    category: z.string().optional().describe("Listing category to match."),
    max_price: z.number().optional().describe("Maximum matching hourly, daily, weekly, or monthly price."),
    limit: z.number().optional().describe("Maximum number of listings to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ city, type, category, max_price, limit }, ctx) => {
    const { client, error } = supabaseForUser(ctx);
    if (error) return error;

    const itemLimit = clampLimit(limit, 10, 20);
    let query = client
      .from("listings")
      .select("id,title,type,category,city,province,region,price_hourly,price_daily,price_weekly,price_monthly,availability,instant_book,avg_rating,size,size_sqft,spots,created_at")
      .eq("is_approved", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(itemLimit);

    if (city?.trim()) query = query.ilike("city", `%${city.trim()}%`);
    if (type) query = query.eq("type", type);
    if (category?.trim()) query = query.ilike("category", `%${category.trim()}%`);
    if (typeof max_price === "number" && Number.isFinite(max_price)) {
      const price = Math.max(0, max_price);
      query = query.or(`price_hourly.lte.${price},price_daily.lte.${price},price_weekly.lte.${price},price_monthly.lte.${price}`);
    }

    const { data, error: queryError } = await query;
    if (queryError) return { content: [{ type: "text", text: queryError.message }], isError: true };

    const listings = data ?? [];
    return textResult(
      listings.length ? `Found ${listings.length} approved listing${listings.length === 1 ? "" : "s"}.` : "No approved listings matched this search.",
      { listings },
    );
  },
});