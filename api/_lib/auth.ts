import crypto from 'crypto'
import type { IncomingMessage, ServerResponse } from 'http'

const COOKIE_NAME = 'portfolio_admin'
const SESSION_DAYS = 7

interface RateEntry {
  count: number
  resetAt: number
}

const attempts = new Map<string, RateEntry>()

export function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export function clientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
}

/** Simple in-memory throttle: 10 attempts per 10 minutes per IP. */
export function loginThrottled(req: IncomingMessage): boolean {
  const ip = clientIp(req)
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return false
  }
  entry.count += 1
  return entry.count > 10
}

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) throw new Error('SESSION_SECRET is not configured')
  return s
}

function hmac(value: string): string {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url')
}

export function createSessionValue(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 }),
  ).toString('base64url')
  return `${payload}.${hmac(payload)}`
}

export function isAuthed(req: IncomingMessage): boolean {
  const header = req.headers.cookie
  if (!header) return false
  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  if (!match) return false
  const value = decodeURIComponent(match[1])
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return false
  const payload = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  const expected = hmac(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp?: number }
    return typeof data.exp === 'number' && data.exp > Date.now()
  } catch {
    return false
  }
}

export function setSessionCookie(res: ServerResponse): void {
  const secure = process.env.VERCEL === '1' ? '; Secure' : ''
  res.setHeader(
    'set-cookie',
    `${COOKIE_NAME}=${encodeURIComponent(createSessionValue())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure}`,
  )
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader('set-cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`)
}

export function checkPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH
  if (!stored) return false
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false
  const actual = crypto.scryptSync(password, salt, 64)
  const wanted = Buffer.from(expected, 'hex')
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted)
}

/**
 * TEMPORARY open-access mode (CMS_DISABLE_AUTH=1): used while content is empty so the
 * client can try the CMS without a password. Anyone can then modify content — remove
 * the env var and redeploy before launch; the password login takes over immediately.
 */
export function isAuthDisabled(): boolean {
  return process.env.CMS_DISABLE_AUTH === '1'
}

export function sessionActive(req: IncomingMessage): boolean {
  return isAuthDisabled() || isAuthed(req)
}

export function allowWrite(req: IncomingMessage): boolean {
  return isAuthDisabled() || isAuthed(req)
}
