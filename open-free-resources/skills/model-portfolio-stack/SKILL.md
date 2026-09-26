---
name: model-portfolio-stack
description: Build and deploy a $0/month model/portfolio website (emrata-style fullscreen slideshows + drag-and-drop image CMS) on Vercel free + Cloudflare R2. Use when creating or deploying a photography/model portfolio that must serve high-quality images at scale without hosting costs, when wiring R2 to a Vercel frontend, or when avoiding Vercel's image-optimization and bandwidth free-tier caps.
license: MIT
---

Builds a production model portfolio that serves 100+ high-res photos to ~1.6M monthly visitors for $0. The reference implementation is `henrylove0/model-portfolio-stack` (Vite + React + TypeScript frontend, Vercel serverless API, R2 storage, JSON-manifest CMS). Clone it as a template and adapt names/content — or rebuild following the architecture below. Every rule here exists because violating it breaks the free tier; do not skip the "Non-negotiables" section.

## Architecture

```
[ Visitor browser ]
     │  HTML/JS/CSS only (~65 KB gzip, SPA)     ──► [ Vercel Hobby ]   100 GB/mo cap
     │  photos (WebP ≤3.5 MB, direct URLs)      ──► [ Cloudflare R2 via public domain ]
     │  manifest.json (60 s cache)              ──► [ R2 custom domain / r2.dev URL ]
                                                     CMS writes: /api/login, /api/upload, /api/manifest
```

- **Manifest-driven:** a `_manifest.json` object in R2 lists which image keys belong to which slideshow (home / about / project-01…N). The site reads it client-side; the CMS rewrites it. No database, no rebuilds on content change.
- **Auth:** scrypt password hash in env (`salt:hex`), HMAC-signed HttpOnly cookie session (7 days), per-IP login throttle. No auth provider needed.
- **Uploads:** browser converts to WebP (max 3840px long edge, q0.85 with adaptive fallback under 3.8 MB), POSTs raw bytes to `/api/upload`, function stores in R2. Vercel's 4.5 MB body limit is why conversion happens client-side.
- **Load-once flow:** a Vite plugin (`vite.config.ts`) injects into `index.html` an inline script that starts the `_manifest.json` fetch before the app bundle downloads (`window.__siteManifest`, consumed by `fetchManifest()`), plus two `preconnect` links to the R2 host (one CORS for the manifest, one no-cors for `<img>`). `App` exposes `settled`; the home slideshow renders only once the live manifest has arrived (3 s timeout → built-in defaults), so no photo is downloaded twice.
- **Portrait home set:** optional `homeMobile` list (admin section "Home Slideshow (Mobile)"). Under 900px it's a one-at-a-time slideshow. On wider screens `PeekCarousel` shows it as uncropped side-by-side pairs (admin order: 1+2, 3+4, …; odd last photo solo) in a sliding filmstrip, with the neighbouring pairs peeking in at 35% opacity on both sides; it loops by rendering the strip three times and silently re-centring on the middle copy after each transition. Never fit portraits into a 16:9 frame with `object-fit: cover` — full-body shots lose heads or legs. With no portraits, both fall back to `home`.
- **Fallbacks:** if the direct R2 manifest fetch fails (CORS/absent), the client falls back to same-origin `/api/manifest`, then to built-in placeholder images. An empty section renders a branded placeholder slide, never a broken page.

## Non-negotiables (the free-tier rules)

1. **Plain `<img>` tags only.** Never Next.js `<Image>` or any framework optimizer — Vercel Hobby includes only 1,000 optimizations/month; 80 photos × 13 visitors exhausts it. Vite + React with raw `<img>` bypasses optimization entirely.
2. **Images never proxy through Vercel.** 100 photos ≈ 300 MB per gallery pass; at 100 GB/month that's ~350 visitors. Served straight from R2, the same site reaches ~1.6M visitors (65 KB/visit ÷ 100 GB). Every image URL must be the R2 public domain, not `/api/...`.
3. **Serve R2 through a Cloudflare custom domain** (e.g. `cdn.example.com`, bucket → Settings → Custom Domain). This activates edge caching: repeat views hit Cloudflare's cache, not R2 Class B operations (10M/mo free). R2 egress is free either way.
4. **Convert before storing.** WebP at 3840px/q85 → ~1.5–3.5 MB per photo (from 35 MB originals), visually lossless even on 4K. Do it in the browser on upload and/or with a sharp bulk script (`photos-src/` → `r2-upload/`).
5. **Static assets get immutable cache headers** (`/assets/*`: 1 year) so repeat visits cost ~1 KB.

## Free quotas at a glance

| Platform | Limit | This stack's usage |
| --- | --- | --- |
| Vercel Hobby bandwidth | 100 GB/mo | ~65 KB per visitor SPA load → ~1.6M visitors |
| Vercel function invocations | 125k/mo | ~0 from visitors (manifest from R2); admin only |
| R2 storage | 10 GB | ~300 MB per 100 photos |
| R2 Class A (writes) | 1M/mo | negligible (uploads) |
| R2 Class B (reads) | 10M/mo | negligible with edge cache |
| R2 egress | free | all photo bytes |

## Setup runbook

1. **Repo:** clone the reference, `git init` in a fresh GitHub repo, `npm install`.
2. **R2 bucket** (Cloudflare dashboard or wrangler): create bucket; set CORS so browsers can read the manifest directly:
   `wrangler r2 bucket cors set <bucket> --file cors.json -y` where cors.json is `{"rules":[{"allowedOrigins":["*"],"allowedMethods":["GET","HEAD"],"allowedHeaders":["*"],"exposeHeaders":["ETag"],"maxAgeSeconds":3600}]}` (see camelCase gotcha below).
3. **Public URL for R2:** connect a custom domain (preferred; requires the domain's DNS on Cloudflare), or temporarily enable the managed URL: `wrangler r2 bucket dev-url enable <bucket>`. If the r2.dev URL 404s, the account-level "public access via r2.dev" switch is off (dashboard → R2 → Settings).
4. **R2 API token:** dashboard → R2 → Manage API Tokens → create with Object Read & Write on the bucket. Access Key ID + Secret go into Vercel env. If an agent is doing the setup via the Cloudflare API (create bucket, CORS, enable r2.dev), it needs an **Admin Read & Write** token for that step — an Object Read & Write token can list buckets but gets `Authentication error` (10000) on create/CORS/domain calls.
5. **Vercel env vars** (Production): `VITE_R2_PUBLIC_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `ADMIN_PASSWORD_HASH` (generate: `npm run password` → scrypt `salt:hex`), `SESSION_SECRET` (`openssl rand -hex 32`). Optional `CMS_DISABLE_AUTH=1` for pre-content testing.
6. **Deploy:** `vercel deploy --yes --prod`, or connect the GitHub repo in the Vercel dashboard for auto-deploys on push.
7. **Domains:** apex/www → Vercel (dashboard shows records); optional `admin.example.com` → CNAME `cname.vercel-dns.com` → add as a Vercel domain (same deployment serves `/admin`).
8. **Seed the manifest before handing over the CMS** if you pre-load photos: write `_manifest.json` to R2 with every section (placeholders included) — when no manifest exists the CMS starts from an empty one, so its first save drops the built-in placeholders from every other section.
9. **Content:** log into `/admin`, drop photos (multi-select works; 6000×9000 originals are fine), drag to reorder, "Move to…" sends photos between slideshows. Live within ~60 s.

## Pitfalls (each one was a production bug)

- **ESM imports in `api/`:** with `"type": "module"`, Vercel-compiled functions need explicit extensions — `./_lib/auth.js`, not `./_lib/auth`. Extensionless imports fail at runtime with `ERR_MODULE_NOT_FOUND` (build and types pass silently).
- **SPA rewrite destination is `/index`, not `/index.html`:** the Vite preset renames `index.html` to path `index` in its routing overrides, so `{"source":"/(.*)","destination":"/index.html"}` fails the filesystem check and every client route 404s. Use `"destination": "/index"`. Keep a single catch-all rewrite; do not add a self-rewriting `/api/(.*)→/api/$1` rule (breaks the table).
- **wrangler CORS file:** must be wrapped `{"rules":[...]}` and use camelCase keys (`allowedOrigins`, not S3-style `AllowedOrigins`); PascalCase → "not well formed" (10040).
- **Vercel body limit 4.5 MB** per function request — convert/resize images in the browser before upload; adapt quality down (0.85 → 0.75 → 0.65) if the blob exceeds ~3.8 MB.
- **r2.dev 404s despite "public access enabled":** account-level opt-in (R2 → Settings). Custom domains don't need it.
- **Vercel CLI deploys don't auto-deploy on git push** — connect the repo in the dashboard for CI, or redeploy manually. Check the deploy output for an `Aliased` line before assuming the production URL moved.
- **`tsc && vite build` piped through `tail` or `grep` hides failures** (pipeline exit code — `grep` even exits 0 because it matched the word "error") — a chained `build | grep … && git commit && vercel deploy` will ship a broken build. Gate on the build's own exit code: `npm run build >/dev/null && …`.
- **Double photo download = slow first load:** rendering the slideshow from built-in defaults and then swapping in the live manifest makes the browser fetch the first photos twice and restarts the slideshow. Keep the `settled` gate on image-heavy pages.
- **Photos that fail once must be retried:** slides stay at `opacity: 0` until the `<img>` fires `load`. Phones cancel in-flight downloads when the browser is backgrounded, and connections drop — without an `onError` retry the slide stays black forever ("photos gone after I came back, refresh sometimes doesn't fix it"). `src/lib/usePhotoRetry.ts` (used by `Slideshow` and `PeekCarousel`) retries with backoff (cache-busting `?retry=n`) and re-requests broken images on `visibilitychange`/`online`/bfcache `pageshow`; `Slideshow` adds a 12 s watchdog for hung requests. Don't mark photos loaded from a `ref` callback — setting state during commit loops (React #185) once a slide holds more than one photo. Test it by aborting the first image request (Playwright `page.route(...).abort()`) and checking the slide still appears.
- **Never use `%VITE_X%` env replacement in `index.html` for URLs:** when the var is unset (local builds) Vite leaves the literal `%VITE_X%` and the build dies with `URI malformed`. Inject env-dependent tags from a Vite plugin (`transformIndexHtml`) that emits nothing when the var is empty.
- **R2 not enabled:** a new Cloudflare account returns `Please enable R2 through the Cloudflare Dashboard` (10042) until R2 is purchased (card required, free tier still applies). Before that — and before the first bucket exists — the account's S3 endpoint `<account>.r2.cloudflarestorage.com` fails the TLS handshake (`sslv3 alert handshake failure`), which looks like a network problem but isn't.
- **r2.dev is test-only:** rate-limited and not edge-cached, so first visits pull every photo from the bucket's region. Only a custom domain gets Cloudflare's cache.
- **Open CMS + writable R2 = anyone can edit the live site.** `CMS_DISABLE_AUTH=1` is harmless before R2 keys exist and dangerous after; remove it in the same deploy that adds the keys.
- Session cookies: `Secure` only behind `VERCEL=1`; SameSite=Lax is enough (no CORS needed anywhere — everything is same-origin).

## Customization points

- `src/lib/config.ts` — Instagram URL, contact email, R2 public base.
- `src/data/content.ts` — agency/contact locations (nav dropdown + contact page read this).
- `src/lib/types.ts` (`PROJECT_SLUGS`) — number of projects (20 by default).
- `src/pages/AboutPage.tsx`, `ContactPage.tsx` — bio text, stats, agency details.
- Font: default Jost (free stand-in for emrata.com's Futura PT) — swap the Google Fonts link in `index.html` + `--sans` in `src/styles.css`.
- `public/placeholders/` — regenerate via `node scripts/make-placeholders.mjs` with new wordmark/copy.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | local frontend (placeholder images) |
| `npm run build` | type-check (src + api) + production build |
| `npm run password` | generate `ADMIN_PASSWORD_HASH` + `SESSION_SECRET` |
| `npm run photos` | bulk-convert `photos-src/` → `r2-upload/` (3840px WebP q85) |
| `vercel deploy --yes --prod` | manual production deploy |

## Launch checklist

- [ ] `CMS_DISABLE_AUTH` removed (or `0`) and redeployed — password gate active
- [ ] `vercel env ls production` shows all 7 vars
- [ ] `/api/session` returns `authenticated:false` anonymously; login flow verified
- [ ] Bucket CORS applied (or accept the same-origin manifest fallback)
- [ ] Custom domain on the R2 bucket (egress-free + edge cache)
- [ ] Test upload end-to-end: drop photo → appears on site within 60 s → object served from the R2 domain (check DevTools Network: zero image bytes from Vercel)
- [ ] Home page loads each photo once (DevTools Network: no image requested from both Vercel and R2)
- [ ] Placeholder Instagram handle/email replaced with real ones
