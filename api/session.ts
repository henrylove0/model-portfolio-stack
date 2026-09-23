import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sessionActive, send } from './_lib/auth.js'

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    send(res, 405, { error: 'Method not allowed' })
    return
  }
  send(res, 200, { authenticated: sessionActive(req) })
}
