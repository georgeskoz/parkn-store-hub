// Generates public/sitemap.xml with static routes + dynamic listing routes.
// Runs via predev/prebuild npm scripts.
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://spotsvault.com";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = { ...(process.env as Record<string, string>) };
  const envPath = resolve(".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!out[m[1]]) out[m[1]] = v;
    }
  }
  return out;
}

async function fetchListings(env: Record<string, string>): Promise<Entry[]> {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn("[sitemap] Missing Supabase env vars; skipping dynamic listings.");
    return [];
  }
  try {
    const res = await fetch(`${url}/rest/v1/listings?select=id,updated_at&status=eq.approved`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      console.warn(`[sitemap] Listings fetch failed: ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as { id: string; updated_at: string | null }[];
    return rows.map((r) => ({
      path: `/listing/${r.id}`,
      lastmod: r.updated_at ? r.updated_at.slice(0, 10) : undefined,
      changefreq: "weekly",
      priority: "0.7",
    }));
  } catch (e) {
    console.warn("[sitemap] Listings fetch error:", e);
    return [];
  }
}

function build(entries: Entry[]): string {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ].filter(Boolean).join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const env = loadEnv();
  const staticEntries: Entry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/find", changefreq: "daily", priority: "0.9" },
    { path: "/parking", changefreq: "daily", priority: "0.9" },
    { path: "/storage", changefreq: "daily", priority: "0.9" },
    { path: "/list", changefreq: "monthly", priority: "0.7" },
    { path: "/auth", changefreq: "yearly", priority: "0.3" },
  ];
  const listings = await fetchListings(env);
  const all = [...staticEntries, ...listings];
  writeFileSync(resolve("public/sitemap.xml"), build(all));
  console.log(`sitemap.xml written (${all.length} entries, ${listings.length} listings)`);
}

main().catch((e) => {
  console.error("[sitemap] failed:", e);
  process.exit(0); // do not fail the build
});
