import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { clampLimit, supabaseForUser, textResult } from "./_shared";

export default defineTool({
  name: "list_my_bookings",
  title: "List my bookings",
  description: "List the signed-in user's SpotVault bookings without exposing payment tokens, IDs, or private vehicle/license details.",
  inputSchema: {
    status: z.string().optional().describe("Optional booking status filter."),
    limit: z.number().optional().describe("Maximum number of bookings to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ status, limit }, ctx) => {
    const userId = ctx.getUserId();
    const { client, error } = supabaseForUser(ctx);
    if (error) return error;
    if (!userId) return { content: [{ type: "text", text: "Could not identify the signed-in user." }], isError: true };

    let query = client
      .from("bookings")
      .select("id,listing_id,seeker_id,provider_id,status,escrow_status,start_date,end_date,total_amount,category,city,created_at,listings(title,city,province,type,category)")
      .or(`seeker_id.eq.${userId},provider_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(clampLimit(limit, 10, 25));

    if (status?.trim()) query = query.eq("status", status.trim());

    const { data, error: queryError } = await query;
    if (queryError) return { content: [{ type: "text", text: queryError.message }], isError: true };

    const bookings = (data ?? []).map((booking) => ({
      id: booking.id,
      listing_id: booking.listing_id,
      role: booking.seeker_id === userId ? "seeker" : "provider",
      status: booking.status,
      escrow_status: booking.escrow_status,
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_amount: booking.total_amount,
      category: booking.category,
      city: booking.city,
      created_at: booking.created_at,
      listing: booking.listings,
    }));

    return textResult(
      bookings.length ? `Found ${bookings.length} booking${bookings.length === 1 ? "" : "s"}.` : "No bookings found for this account.",
      { bookings },
    );
  },
});