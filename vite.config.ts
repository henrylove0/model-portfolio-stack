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

export default defineConfig(({ mode }) => {
  const r2 = (loadEnv(mode, process.cwd(), 'VITE_').VITE_R2_PUBLIC_URL ?? '').replace(/\/+$/, '')
  return { plugins: [react(), r2Preconnect(r2)] }
})
