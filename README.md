# Model Portfolio Stack

An emrata-style portfolio website for models — fullscreen slideshows, twenty project
galleries, about & agency contact pages, and a drag-and-drop admin — engineered to serve
your photos in true 4K to roughly **1.6 million visitors a month for $0**.

- **Frontend:** Vite + React + TypeScript on **Vercel** (free tier)
- **Photos:** **Cloudflare R2** through a custom domain — free egress, edge-cached
- **CMS:** `/admin` on the same deployment — drag, drop, reorder, done. No database.

> New here? Read [**the-free-model-stack.pdf**](open-free-resources/the-free-model-stack.pdf)
> first — a 9-page, plain-language guide to how and why this works, written for models,
> not developers.

## Why it stays free

Most photo sites blow past free plans on two meters: image **processing** and
**bandwidth**. This stack is arranged so neither is ever metered:

1. Plain `<img>` tags only — no platform image optimizer (Vercel's free cap is
   1,000 images/month; this site uses zero).
2. Photos are served **directly from Cloudflare's network**, never proxied through
   Vercel (100 photos ≈ 300 MB per gallery pass — through Vercel that's ~350 visitors
   a month; through Cloudflare it's unlimited).
3. Every photo is converted to **WebP at up to 3840px (4K), quality 85** before upload —
   ~1.5–3.5 MB instead of 35 MB, visually lossless.
4. One visitor downloads ≈ 65 KB of code → **~1.6M visitors/month** inside Vercel's
   100 GB free tier.

## Capacity: how many visitors, how many photos

**Visitors.** The whole site (HTML + JavaScript + CSS) is ≈ 65 KB compressed, and because
it's a single-page app that 65 KB is downloaded once no matter how many galleries a
visitor clicks through. Vercel's free 100 GB ÷ 65 KB ≈ **~1.6 million visitors per
month**. Repeat visits cost almost nothing — static assets are cached in the browser
for a year. If you ever approach the ceiling, the dashboard shows it weeks in advance
and the fix is a ~$20/mo plan (10× the ceiling); everything else stays free.

**Photos.** There is no limit on how many photos a slideshow can hold — 20 on the home
show, hundreds in a project. The practical ceiling is R2's free 10 GB of storage:

| Photos stored | Approx. storage | Fits in free 10 GB? |
| --- | --- | --- |
| 100 | ~300 MB | ✅ with 30× headroom |
| 500 | ~1.5 GB | ✅ |
| 3,000 | ~9 GB | ✅ — the realistic free ceiling |

**Operations** (R2's other meters): uploads are a rounding error on the 1M free
writes/month, and photo views are served from Cloudflare's edge cache — billions of
views consume effectively none of the 10M free origin reads/month.

## How your photos are optimized

Every photo passes through the same pipeline before it reaches storage — automatically,
whether you drop one file or a hundred:

```
original (any size — 6000×9000 / 35 MB is fine)
   → resized to 3840px on the long edge (true 4K — native sharpness on 4K monitors,
     exact on 1080p/1440p, and indistinguishable when downscaled on phones)
   → encoded as WebP at quality 85 (visually lossless)
   → if still over ~3.8 MB, quality steps down (0.85 → 0.75 → 0.65) until it fits
   → lands in R2 at ~1.5–3.5 MB (~90% smaller than the original)
```

Conversion happens **in your browser the moment you drop the file** — the original
never leaves your computer, and Vercel's 4.5 MB upload limit is never at risk. For
very large batches there is also a desktop script: put originals in `photos-src/`,
run `npm run photos`, and drop the optimized files from `r2-upload/` into the admin.
The heavy lifting then uses sharp (server-grade, no browser memory limits).

**Why not store the full 6000px original?** A 3840px WebP is the largest size any
screen can display; beyond that you're paying storage and load time for pixels nobody
sees. Keep the RAW/JPEG masters in your own archive — the stored WebPs are the
publication masters, not backups.

## Performance on mobile and desktop

What's already built in, per device:

- **Everywhere:** single-page app (no reloads between galleries), the next slideshow
  photo preloads in the background while you view the current one, photos use
  GPU-friendly CSS transitions (no jank), and — once the bucket has a custom domain —
  all photos are cached at Cloudflare's edge, so a visitor in Tokyo loads from Tokyo,
  not from one origin server. (The temporary `r2.dev` URL is **not** edge-cached; see
  Quick start step 4.)
- **Photos download once:** the photo list request starts in `index.html` before the
  app code has loaded, the browser opens its connection to the photo host
  immediately, and the home slideshow waits for the live list instead of first
  loading built-in images and then swapping them out.
- **Desktop:** arrow-key navigation, edge-click zones with hover arrows, `object-fit:
  cover` so vertical 4:5 images fill any window without distortion, fullscreen 4K
  quality on retina/4K displays.
- **Mobile:** an optional separate portrait home slideshow for phones (admin section
  "Home Slideshow (Mobile)"; phones fall back to the regular home set when it's
  empty), swipe left/right to change photos, `100dvh` sizing that follows the
  real viewport ( Safari's dynamic URL bar ), a full-screen menu overlay under 900px,
  tap-sized admin controls, and lazy-loaded thumbnails in the CMS.
- **Data-conscious:** photos are WebP (universally supported since 2020); code assets
  carry immutable 1-year cache headers; the slideshow only ever holds two photo
  layers in memory regardless of gallery size.

**Honest note + extension path:** the site stores one 3840px master per photo, which
serves every screen beautifully but downloads ~2–3.5 MB even on a phone. If mobile
data usage ever matters to your audience, the natural upgrade is responsive images
(serving a 960px variant to small screens via `srcset`) — the manifest can carry the
extra sizes with a small code change.

## The tools we chose, and why

| Tool | Role | Why this one |
| --- | --- | --- |
| **Vite + React + TypeScript** | the website | Industry-standard, instant dev server, tiny optimized builds; TypeScript catches breakage before deploy |
| **Vercel** | hosts the site code | Zero-config deploys from git, free SSL, 100 GB/mo free — and it only ever serves ~65 KB of code |
| **Cloudflare R2** | photo storage & delivery | S3-compatible with **zero egress fees**; paired with a custom domain it's also a global CDN |
| **Jost** (typeface) | design | Open Futura revival — the look of high-fashion sites without a $400/font license |
| **sharp** (script) | bulk photo conversion | The fastest image library available; handles 54 MP files server-side |
| **wrangler** (CLI) | Cloudflare automation | Creates buckets, public URLs, and CORS from the terminal |
| **GitHub** | source of truth | Free private/public repos; Vercel deploys automatically on every push |

Deliberately **not** chosen: Next.js image optimization (1,000 free cap), any
database (a JSON manifest is enough and removes a whole category of cost/ops), any
CMS product (the drag-and-drop admin is ~400 lines and fully yours).

## Customizing everything

- **Identity** — `src/site.config.ts`: name, Instagram, email, agency locations,
  project count. The nav, pages, and admin all read from it.
- **Bio, stats, story** — `src/pages/AboutPage.tsx`; agency/contact blocks in
  `src/pages/ContactPage.tsx`.
- **Design** — CSS variables at the top of `src/styles.css` (colors, hairlines, font
  stack). Swap the typeface by changing the Google Fonts link in `index.html` +
  `--sans`.
- **Placeholder art** — `node scripts/make-placeholders.mjs` after editing the titles
  in it.
- **Structure** — add pages as React components in `src/pages/` plus a route in
  `src/App.tsx`; galleries are data, so "more projects" is a config value, not code.

## Quick start

```sh
git clone https://github.com/henrylove0/model-portfolio-stack my-portfolio
cd my-portfolio
npm install
```

1. **Make it yours** — edit `src/site.config.ts` (name, Instagram, email, agencies,
   number of projects). Update the bio/stats in `src/pages/AboutPage.tsx` and the
   `<title>` in `index.html`.
2. **Push** to your own GitHub repo.
3. **Deploy** — [Vercel](https://vercel.com) → Add New Project → import the repo.
4. **Create an R2 bucket** (Cloudflare dashboard) named `model-portfolio`, an API token
   with Object Read & Write, and connect a custom domain (`cdn.yourdomain.com`) — or
   temporarily use the bucket's public r2.dev URL. The r2.dev URL is for testing only:
   Cloudflare rate-limits it and does not edge-cache it, so first visits load noticeably
   slower. Move to a custom domain before you promote the site.
   New Cloudflare accounts must first switch R2 on (dashboard → R2 → Purchase R2; a
   card is required even on the free tier) — until then every R2 call fails.
5. **Set environment variables** in Vercel → Settings → Environment Variables:

   | Variable | Value |
   | --- | --- |
   | `VITE_R2_PUBLIC_URL` | `https://cdn.yourdomain.com` |
   | `R2_ACCOUNT_ID` | Cloudflare R2 overview page |
   | `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | from the API token |
   | `R2_BUCKET` | `model-portfolio` |
   | `ADMIN_PASSWORD_HASH` | `npm run password` |
   | `SESSION_SECRET` | `openssl rand -hex 32` |

   Optional while testing: `CMS_DISABLE_AUTH=1` opens the CMS without a password —
   **remove it before launch**. Once R2 is connected, an open CMS lets anyone who finds
   `/admin` replace your live photos.

   `VITE_R2_PUBLIC_URL` is baked in at build time — after changing it, redeploy.
6. **Redeploy**, open `https://your-site.vercel.app/admin`, and start dropping photos.
   Changes are live worldwide within about a minute — no rebuilds.

## Using the admin

- Drop one or many photos onto a section (Home, Home (Mobile), About, or any
  Project) — they queue
  automatically and are converted to 4K WebP in your browser before upload.
- Drag a photo onto another slot to reorder; use its **Move to…** control to send it to
  a different gallery; retitle projects inline. Everything autosaves.
- **Golden rule:** always add photos through the admin, never into cloud storage
  directly — the admin is what tells the website a photo exists.

Full details, the quota math, and the pre-launch checklist are in
[**the-free-model-stack.pdf**](open-free-resources/the-free-model-stack.pdf). The
`open-free-resources/skills/` directory contains an AI-agent skill (SKILL.md) that
rebuilds or adapts this entire stack from a single instruction.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | local development (placeholder images) |
| `npm run build` | type-check + production build |
| `npm run password` | generate `ADMIN_PASSWORD_HASH` + `SESSION_SECRET` |
| `npm run photos` | bulk-convert `photos-src/` → `r2-upload/` (3840px WebP) |

## Layout

```
src/site.config.ts    ← your identity: the only file you must edit
src/                  React app (slideshow, nav, pages, admin UI)
api/                  Vercel serverless functions (login, session, upload, manifest)
public/placeholders/  built-in images until you upload real ones
scripts/              password generator, bulk optimizer, placeholder generator
open-free-resources/  the PDF guide + AI-agent skill
```

## License

MIT — see [LICENSE](LICENSE). Yours, permanently.
