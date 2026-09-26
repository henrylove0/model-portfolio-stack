import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowWrite, send } from './_lib/auth.js'
import { getObjectText, putObject } from './_lib/r2.js'

const MANIFEST_KEY = '_manifest.json'
const MAX_MANIFEST_BYTES = 200_000
const KEY_PATTERN = /^[A-Za-z0-9/._-]{1,200}$/

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method === 'GET') {
      const text = await getObjectText(MANIFEST_KEY)
      if (text === null) {
        send(res, 404, { error: 'No manifest yet. Upload images via /admin first.' })
        return
      }
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('cache-control', 'public, max-age=60')
      res.statusCode = 200
      res.end(text)
      return
    }

    if (req.method === 'PUT') {
      if (!allowWrite(req)) {
        send(res, 401, { error: 'Not authenticated' })
        return
      }
      const raw = JSON.stringify(req.body ?? {})
      if (raw.length > MAX_MANIFEST_BYTES) {
        send(res, 413, { error: 'Manifest is too large' })
        return
      }
      const sanitized = sanitize(req.body)
      if (!sanitized) {
        send(res, 400, { error: 'Invalid manifest shape' })
        return
      }
      await putObject(MANIFEST_KEY, raw, 'application/json', 'public, max-age=60')
      send(res, 200, { ok: true, updatedAt: (sanitized as { updatedAt: string }).updatedAt })
      return
    }

    send(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    send(res, 500, { error: `Storage error: ${err instanceof Error ? err.message : 'unknown'}` })
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function sanitize(input: any): unknown | null {
  if (typeof input !== 'object' || input === null) return null
  if (typeof input.updatedAt !== 'string') return null
  if (!keys(input.home) || !keys(input.about) || !Array.isArray(input.projects)) return null
  if (input.homeMobile !== undefined && !keys(input.homeMobile)) return null
  const projects = input.projects.map((p: any) => {
    if (typeof p !== 'object' || p === null) return null
    if (typeof p.slug !== 'string' || !/^[a-z0-9-]{1,40}$/.test(p.slug)) return null
    if (typeof p.title !== 'string' || p.title.length > 80) return null
    if (!keys(p.images)) return null
    return { slug: p.slug, title: p.title, images: p.images }
  })
  if (projects.some((p: unknown) => p === null)) return null
  return { ...input, projects }
}

function keys(value: any): boolean {
  return Array.isArray(value) && value.every((v) => typeof v === 'string' && KEY_PATTERN.test(v))
}
