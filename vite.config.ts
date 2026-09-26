import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Open the connection to the R2 photo host while the page's JS is still loading. */
function r2Preconnect(url: string): Plugin {
  return {
    name: 'r2-preconnect',
    transformIndexHtml() {
      if (!url) return []
      // Two pools: CORS (manifest fetch) and no-cors (<img> photos).
      // The inline script starts the manifest request before the app bundle has
      // downloaded; fetchManifest() picks up this promise instead of re-fetching.
      const early = `window.__siteManifest=fetch(${JSON.stringify(`${url}/_manifest.json`)},{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})`
      return [
        { tag: 'script', children: early, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'preconnect', href: url, crossorigin: '' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'preconnect', href: url }, injectTo: 'head' },
      ]
    },
  }
}

/**
 * Link-preview tags (Open Graph + Twitter) so a shared link shows public/og.jpg with the
 * page title and description. Scrapers need an absolute image URL: VITE_SITE_URL if set,
 * else the Vercel production domain (VERCEL_PROJECT_PRODUCTION_URL, set during Vercel
 * builds — it becomes the custom domain once one is attached).
 */
function socialMeta(siteUrl: string): Plugin {
  return {
    name: 'social-meta',
    transformIndexHtml(html) {
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''
      const image = `${siteUrl}/og.jpg`
      const meta = (attr: 'property' | 'name', key: string, content: string) => ({
        tag: 'meta',
        attrs: { [attr]: key, content },
        injectTo: 'head' as const,
      })
      return [
        meta('property', 'og:type', 'website'),
        meta('property', 'og:title', title),
        meta('property', 'og:description', description),
        meta('property', 'og:image', image),
        meta('property', 'og:image:width', '1200'),
        meta('property', 'og:image:height', '630'),
        ...(siteUrl ? [meta('property', 'og:url', `${siteUrl}/`)] : []),
        meta('name', 'twitter:card', 'summary_large_image'),
        meta('name', 'twitter:title', title),
        meta('name', 'twitter:description', description),
        meta('name', 'twitter:image', image),
      ]
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const r2 = (env.VITE_R2_PUBLIC_URL ?? '').replace(/\/+$/, '')
  const production = env.VERCEL_PROJECT_PRODUCTION_URL
  const siteUrl = (env.VITE_SITE_URL || (production ? `https://${production}` : '')).replace(/\/+$/, '')
  return { plugins: [react(), r2Preconnect(r2), socialMeta(siteUrl)] }
})
