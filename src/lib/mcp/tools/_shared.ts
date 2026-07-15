import { createClient } from "@supabase/supabase-js";
import type { ToolContext, ToolHandlerResult } from "@lovable.dev/mcp-js";

const readEnv = (name: string) => {
  const denoValue = (globalThis as { Deno?: { env?: { get?: (key: string) => string | undefined } } }).Deno?.env?.get?.(name);
  return denoValue ?? (typeof process !== "undefined" ? process.env[name] : undefined);
};

export const errorResult = (text: string): ToolHandlerResult => ({
  content: [{ type: "text", text }],
  structuredContent: { error: text },
  isError: true,
});

export const textResult = (text: string, structuredContent?: Record<string, unknown>): ToolHandlerResult => ({
  content: [{ type: "text", text }],
  structuredContent,
});

export const clampLimit = (limit: number | undefined, fallback = 10, max = 25) => {
  if (!Number.isFinite(limit ?? NaN)) return fallback;
  return Math.max(1, Math.min(Math.floor(limit as number), max));
};

export const supabaseForUser = (ctx: ToolContext) => {
  if (!ctx.isAuthenticated()) {
    return { error: errorResult("Authentication required. Connect with OAuth and sign in to SpotVault first.") };
  }

  const token = ctx.getToken();
  const url = readEnv("SUPABASE_URL");
  const key = readEnv("SUPABASE_PUBLISHABLE_KEY") ?? readEnv("SUPABASE_ANON_KEY");

  if (!token || !url || !key) {
    return { error: errorResult("MCP runtime is missing required backend configuration.") };
  }

  return {
    client: createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
};

export type UserSupabaseClient = NonNullable<ReturnType<typeof supabaseForUser>["client"]>;