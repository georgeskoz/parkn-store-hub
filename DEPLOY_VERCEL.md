# Deploying Spotsvault to Vercel

Single Vercel deployment serving:
- `www.spotsvault.com` → consumer site (`/`, `/find-a-spot`, `/dashboard`, …)
- `admin.spotsvault.com` → admin panel (transparently rewritten to `/admin/*`)

## 1. Push the repo to GitHub

In Lovable: **GitHub → Connect to GitHub → Create repository**. Lovable will push this codebase to a new GitHub repo you own.

> If you have a separate `spotsvault-admin` Vercel project from Claude Code, delete or pause it — this single deployment replaces it.

## 2. Import the repo into Vercel

1. https://vercel.com/new → **Import** the GitHub repo.
2. Framework Preset: **Vite** (auto-detected).
3. Build Command: `vite build` (already in `vercel.json`).
4. Output Directory: `dist`.
5. Click **Deploy**.

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

Add for **Production, Preview, Development** (values are in this project's `.env`):

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_PROJECT_ID` | `skfaqjatbqrmfkojtqsz` |
| `VITE_SUPABASE_URL` | `https://skfaqjatbqrmfkojtqsz.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (copy from local `.env`) |

Redeploy after adding them.

## 4. Connect the two domains

Vercel → Project → **Settings → Domains** → **Add**:

1. `spotsvault.com` (set as primary, redirects to `www`)
2. `www.spotsvault.com`
3. `admin.spotsvault.com`

At your registrar add the DNS records Vercel shows you (typically):

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `admin` | `cname.vercel-dns.com` |

SSL is provisioned automatically.

## 5. How the admin subdomain works

`vercel.json` contains a host-based rewrite:

```json
{
  "source": "/((?!admin).*)",
  "has": [{ "type": "host", "value": "admin.spotsvault.com" }],
  "destination": "/admin/$1"
}
```

Visitors at `admin.spotsvault.com/users` are transparently served `/admin/users` from the same SPA bundle. URL stays clean (`admin.spotsvault.com/...`). No code split required.

## 6. Backend (Lovable Cloud / Supabase)

No change needed. Edge functions, database, storage, and auth keep running on Lovable Cloud and are reached via `VITE_SUPABASE_URL`. After connecting the custom domain, add `https://www.spotsvault.com` and `https://admin.spotsvault.com` to the auth **Site URL / Redirect URLs** list in the backend.

## 7. Stripe webhook

In Stripe Dashboard update the webhook endpoint to your deployed backend URL (the edge function URL stays the same — it lives on the backend, not on Vercel).
