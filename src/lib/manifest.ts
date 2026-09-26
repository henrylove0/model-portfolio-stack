import { MANIFEST_URL } from '../site.config'
import type { SiteManifest } from './types'

const KEY_PATTERN = /^[A-Za-z0-9/._-]{1,200}$/

export function isManifest(value: unknown): value is SiteManifest {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Record<string, unknown>
  if (typeof m.updatedAt !== 'string') return false
  if (!isKeyArray(m.home) || !isKeyArray(m.about)) return false
  if (!Array.isArray(m.projects)) return false
  return m.projects.every((p) => {
    if (typeof p !== 'object' || p === null) return false
    const proj = p as Record<string, unknown>
    return (
      typeof proj.slug === 'string' &&
      typeof proj.title === 'string' &&
      isKeyArray(proj.images)
    )
  })
}

function isKeyArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

/**
 * Resolve a manifest image entry to a browser URL.
 * Entries are R2 object keys; built-in placeholders are absolute local paths.
 */
export function imageUrl(src: string): string {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src
  const base = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, '') ?? ''
  return base ? `${base}/${src}` : src
}

export function isSafeKey(key: unknown): key is string {
  return typeof key === 'string' && KEY_PATTERN.test(key)
}

/**
 * Fetch the live manifest. Tries R2 directly first (zero Vercel usage),
 * falls back to the Vercel API proxy, then to `null` (caller uses defaults).
 */
export async function fetchManifest(): Promise<SiteManifest | null> {
  // First call: reuse the request index.html started before the bundle loaded.
  const w = window as { __siteManifest?: Promise<unknown> }
  const early = w.__siteManifest
  if (early) {
    w.__siteManifest = undefined
    const data = await early
    if (isManifest(data)) return data
  }
  const urls = [MANIFEST_URL, '/api/manifest'].filter(Boolean)
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue
      const data: unknown = await res.json()
      if (isManifest(data)) return data
    } catch {
      // try next source
    }
  }
  return null
}
