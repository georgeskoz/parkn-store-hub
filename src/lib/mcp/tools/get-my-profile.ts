import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, textResult } from "./_shared";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in user's public SpotVault profile fields and OAuth email address.",
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async (_args, ctx) => {
    const userId = ctx.getUserId();
    const { client, error } = supabaseForUser(ctx);
    if (error) return error;
    if (!userId) return { content: [{ type: "text", text: "Could not identify the signed-in user." }], isError: true };

    const { data, error: queryError } = await client
      .from("profiles_public")
      .select("id,display_name,avatar_url,bio,phone,created_at")
      .eq("id", userId)
      .maybeSingle();

    if (queryError) return { content: [{ type: "text", text: queryError.message }], isError: true };

    const profile = { ...(data ?? { id: userId }), email: ctx.getUserEmail() ?? null };
    return textResult("Profile loaded.", { profile });
  },
});