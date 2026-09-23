import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearSessionCookie, send } from './_lib/auth.js'

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' })
    return
  }
  clearSessionCookie(res)
  send(res, 200, { ok: true })
}
