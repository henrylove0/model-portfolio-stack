import { useCallback, useEffect, useRef, useState } from 'react'
import { imageUrl } from './manifest'

/** Backoff before re-requesting a photo whose download failed (ms). Keeps retrying at the last value. */
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000]

/** Photo URL, with a retry marker so a failed request isn't served from the browser's error cache. */
function withRetry(src: string, attempt: number): string {
  const url = imageUrl(src)
  if (!attempt) return url
  return `${url}${url.includes('?') ? '&' : '?'}retry=${attempt}`
}

/**
 * Keeps photos from staying blank after a failed download.
 *
 * Phones cancel in-flight downloads when the browser is backgrounded, and connections drop.
 * Without a retry, a photo that is only shown after `load` stays invisible for good.
 * - `onError(key)` re-requests with backoff.
 * - Returning to the page, coming back online, or a back/forward-cache restore
 *   re-requests every photo under `rootRef` whose download ended without an image
 *   (photos marked with `data-photo-key`). Photos still downloading are left alone.
 */
export function usePhotoRetry<T extends HTMLElement>() {
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const attemptsRef = useRef(attempts)
  attemptsRef.current = attempts
  const timers = useRef<Map<string, number>>(new Map())
  const rootRef = useRef<T>(null)

  const retryNow = useCallback((key: string) => {
    const t = timers.current.get(key)
    if (t !== undefined) window.clearTimeout(t)
    timers.current.delete(key)
    setAttempts((a) => ({ ...a, [key]: (a[key] ?? 0) + 1 }))
  }, [])

  const onError = useCallback(
    (key: string) => {
      if (timers.current.has(key)) return
      const n = attemptsRef.current[key] ?? 0
      const delay = RETRY_DELAYS_MS[Math.min(n, RETRY_DELAYS_MS.length - 1)]
      timers.current.set(key, window.setTimeout(() => retryNow(key), delay))
    },
    [retryNow],
  )

  const photoSrc = (key: string, src: string) => withRetry(src, attempts[key] ?? 0)

  const reset = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current.clear()
    setAttempts({})
  }, [])

  useEffect(() => {
    const recheck = () => {
      if (document.hidden) return
      rootRef.current?.querySelectorAll<HTMLImageElement>('img[data-photo-key]').forEach((el) => {
        if (el.complete && el.naturalWidth === 0) retryNow(el.dataset.photoKey ?? '')
      })
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) recheck()
    }
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('online', recheck)
    return () => {
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('online', recheck)
    }
  }, [retryNow])

  useEffect(() => {
    const t = timers.current
    return () => t.forEach((id) => window.clearTimeout(id))
  }, [])

  return { attempts, photoSrc, onError, retryNow, reset, rootRef }
}
