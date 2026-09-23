import crypto from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowWrite, send } from './_lib/auth.js'
import { putObject, readBody } from './_lib/r2.js'

const MAX_BYTES = 4_500_000
const TYPES: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' })
    return
  }
  if (!allowWrite(req)) {
    send(res, 401, { error: 'Not authenticated' })
    return
  }

  const section = String(req.query.section ?? 'misc')
  if (!/^[a-z0-9-]{1,40}$/.test(section)) {
    send(res, 400, { error: 'Invalid section' })
    return
  }

  const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim()
  const ext = TYPES[contentType]
  if (!ext) {
    send(res, 415, { error: 'Only WebP, JPEG, or PNG images are accepted' })
    return
  }

  let body: Buffer
  try {
    body = await readBody(req, MAX_BYTES)
  } catch {
    send(res, 413, { error: 'Image is too large (max ~4.5 MB after conversion)' })
    return
  }
  if (body.length === 0) {
    send(res, 400, { error: 'Empty body' })
    return
  }

  const key = `${section}/${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  try {
    await putObject(key, body, contentType, 'public, max-age=31536000, immutable')
  } catch (err) {
    send(res, 500, { error: `Storage error: ${err instanceof Error ? err.message : 'unknown'}` })
    return
  }
  send(res, 200, { key })
}
