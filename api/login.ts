import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAuthDisabled, checkPassword, loginThrottled, send, setSessionCookie } from './_lib/auth.js'

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' })
    return
  }
  if (loginThrottled(req)) {
    send(res, 429, { error: 'Too many attempts. Wait a few minutes.' })
    return
  }
  const password = (req.body as { password?: unknown } | undefined)?.password
  if (!isAuthDisabled() && (typeof password !== 'string' || !checkPassword(password))) {
    send(res, 401, { error: 'Incorrect password' })
    return
  }
  setSessionCookie(res)
  send(res, 200, { ok: true })
}
