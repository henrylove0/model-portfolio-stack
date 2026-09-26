import { useCallback, useEffect, useRef, useState } from 'react'
import { imageUrl } from '../lib/manifest'
import { SITE_NAME } from '../site.config'

interface Slide {
  key: number
  index: number
  dir: number
  exiting: boolean
}

interface SlideshowProps {
  images: string[]
  /** ms between automatic advances */
  interval?: number
  /** 'fade' = crossfade (home), 'slide' = left-to-right carousel (projects) */
  mode?: 'fade' | 'slide'
  /** label shown bottom-right, e.g. project title */
  caption?: string
  /** alt text prefix for accessibility */
  alt?: string
}

const TRANSITION_MS = 1000
/** Backoff before re-requesting a photo whose download failed (ms). Keeps retrying at the last value. */
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000]

/** Photo URL, with a retry marker so a failed request isn't served from the browser's error cache. */
function slideSrc(src: string, attempt: number): string {
  const url = imageUrl(src)
  if (!attempt) return url
  return `${url}${url.includes('?') ? '&' : '?'}retry=${attempt}`
}

export default function Slideshow({
  images,
  interval = 5500,
  mode = 'fade',
  caption,
  alt = 'Portfolio photograph',
}: SlideshowProps) {
  const count = images.length
  const keyRef = useRef(0)
  const [stack, setStack] = useState<Slide[]>(() => [{ key: 0, index: 0, dir: 1, exiting: false }])
  const [loaded, setLoaded] = useState<Set<number>>(new Set())
  /** slide key → how many times its photo has been re-requested after a failed load */
  const [attempts, setAttempts] = useState<Record<number, number>>({})
  const retryTimers = useRef<Map<number, number>>(new Map())
  const touchX = useRef<number | null>(null)

  const current = stack[stack.length - 1]

  // Reset when the image set changes (e.g. live manifest replaces placeholders),
  // so a stale slide index can never point past the end of the new list.
  useEffect(() => {
    keyRef.current += 1
    setStack([{ key: keyRef.current, index: 0, dir: 1, exiting: false }])
    setLoaded(new Set())
    setAttempts({})
  }, [images])

  const retryNow = useCallback((key: number) => {
    const timer = retryTimers.current.get(key)
    if (timer !== undefined) window.clearTimeout(timer)
    retryTimers.current.delete(key)
    setAttempts((a) => ({ ...a, [key]: (a[key] ?? 0) + 1 }))
  }, [])

  // A failed download (dropped connection, request cancelled while the phone had the
  // browser in the background, rate limit) would otherwise leave the slide black for good.
  const onImageError = (key: number) => {
    if (retryTimers.current.has(key)) return
    const n = attempts[key] ?? 0
    const delay = RETRY_DELAYS_MS[Math.min(n, RETRY_DELAYS_MS.length - 1)]
    retryTimers.current.set(key, window.setTimeout(() => retryNow(key), delay))
  }

  // Coming back to the page (app switch, back/forward cache, network back): re-request
  // any photo whose download ended without an image. Photos still downloading are left alone.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const recheck = () => {
      if (document.hidden) return
      rootRef.current?.querySelectorAll<HTMLImageElement>('img[data-slide-key]').forEach((el) => {
        if (el.complete && el.naturalWidth === 0) retryNow(Number(el.dataset.slideKey))
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

  // Watchdog: a request that hangs never fires load or error — re-request it after a while.
  const currentAttempt = attempts[current.key] ?? 0
  const currentLoaded = loaded.has(current.key)
  useEffect(() => {
    if (count === 0 || currentLoaded) return
    const id = window.setTimeout(() => {
      if (!document.hidden) retryNow(current.key)
    }, 12000)
    return () => window.clearTimeout(id)
  }, [current.key, currentAttempt, currentLoaded, count, retryNow])

  useEffect(() => {
    const timers = retryTimers.current
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  const go = useCallback(
    (dir: 1 | -1) => {
      if (count < 2) return
      setStack((s) => {
        const last = s[s.length - 1]
        const nextIndex = (last.index + dir + count) % count
        keyRef.current += 1
        const entering: Slide = { key: keyRef.current, index: nextIndex, dir, exiting: false }
        const marked = s.slice(-1).map((x) => ({ ...x, exiting: true, dir }))
        return [...marked, entering]
      })
    },
    [count],
  )

  // Auto-advance; restarts after every manual change. Pauses in background tabs.
  useEffect(() => {
    if (count < 2) return
    let id = window.setTimeout(() => go(1), interval)
    const onVisibility = () => {
      window.clearTimeout(id)
      if (!document.hidden) id = window.setTimeout(() => go(1), interval)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [current.key, interval, count, go])

  // Drop the exiting layer once its animation is done.
  useEffect(() => {
    if (stack.length <= 1) return
    const id = window.setTimeout(() => {
      setStack((s) => s.filter((x) => !x.exiting))
    }, TRANSITION_MS + 100)
    return () => window.clearTimeout(id)
  }, [stack])

  // Preload the next image for a seamless advance.
  useEffect(() => {
    if (count < 2) return
    const next = images[(current.index + 1) % count]
    if (next) new window.Image().src = imageUrl(next)
  }, [current.index, count, images])

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const markLoaded = (key: number) =>
    setLoaded((s) => (s.has(key) ? s : new Set(s).add(key)))

  if (count === 0) {
    return (
      <div className="slideshow slideshow-empty">
        <p className="slideshow-empty-mark">{SITE_NAME}</p>
        <p className="slideshow-empty-note">Photography coming soon</p>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={`slideshow slideshow-${mode}`}>
      {stack.map((slide) => (
        <div
          key={slide.key}
          className={[
            'slide',
            slide.exiting ? 'slide-exit' : 'slide-enter',
            loaded.has(slide.key) ? 'is-loaded' : '',
          ].join(' ')}
          style={{ '--dir': slide.dir } as React.CSSProperties}
        >
          <img
            src={slideSrc(images[slide.index], attempts[slide.key] ?? 0)}
            alt={`${alt} — ${slide.index + 1} of ${count}`}
            data-slide-key={slide.key}
            ref={(el) => {
              // Already decoded (e.g. from cache) before React attached onLoad.
              if (el && el.complete && el.naturalWidth > 0) markLoaded(slide.key)
            }}
            onLoad={() => markLoaded(slide.key)}
            onError={() => onImageError(slide.key)}
            draggable={false}
          />
        </div>
      ))}

      {count > 1 && (
        <>
          <button
            type="button"
            className="zone zone-prev"
            aria-label="Previous photo"
            onClick={() => go(-1)}
          >
            <span className="zone-arrow">&#8249;</span>
          </button>
          <button
            type="button"
            className="zone zone-next"
            aria-label="Next photo"
            onClick={() => go(1)}
          >
            <span className="zone-arrow">&#8250;</span>
          </button>
          <div
            className="slideshow-meta"
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX
            }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return
              const dx = e.changedTouches[0].clientX - touchX.current
              if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
              touchX.current = null
            }}
          >
            <span className="slideshow-counter">
              {String(current.index + 1).padStart(2, '0')}
              <span className="slideshow-counter-sep">/</span>
              {String(count).padStart(2, '0')}
            </span>
            {caption && <span className="slideshow-caption">{caption}</span>}
          </div>
        </>
      )}
    </div>
  )
}
