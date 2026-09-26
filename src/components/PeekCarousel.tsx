import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePhotoRetry } from '../lib/usePhotoRetry'
import { SITE_NAME } from '../site.config'

interface PeekCarouselProps {
  /** slides; each slide shows its photos side by side, uncropped */
  groups: string[][]
  /** ms between automatic advances */
  interval?: number
  /** alt text prefix for accessibility */
  alt?: string
}

const SLIDE_MS = 900

/**
 * Desktop filmstrip: the current slide sits centred, and the edges of the previous and
 * next slides show (dimmed) on either side as a cue to browse. Loops endlessly by
 * rendering the strip three times and silently re-centring on the middle copy.
 */
export default function PeekCarousel({ groups, interval = 5600, alt = SITE_NAME }: PeekCarouselProps) {
  const n = groups.length
  const items = n > 1 ? [...groups, ...groups, ...groups] : groups
  const start = n > 1 ? n : 0

  const [pos, setPos] = useState(start)
  const posRef = useRef(pos)
  posRef.current = pos
  const [loaded, setLoaded] = useState<Set<string>>(new Set())
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const trackRef = useRef<HTMLDivElement>(null)
  /** true when the next position change is a user/auto move (slides); false = silent jump */
  const slideNext = useRef(false)
  /** true while a slide animation is running */
  const moving = useRef(false)
  const retry = usePhotoRetry<HTMLDivElement>()
  const { reset: resetRetry } = retry

  // New photo set → back to the first slide.
  useEffect(() => {
    slideNext.current = false
    setPos(start)
    setLoaded(new Set())
    resetRetry()
  }, [groups, start, resetRetry])

  /**
   * Put the current slide dead centre. Only moves between slides animate; re-centring
   * because a photo finished loading or the window resized snaps instantly — otherwise
   * the strip visibly drifts while photos arrive (worst in Safari).
   */
  const place = useCallback(
    (animated: boolean) => {
      const track = trackRef.current
      const el = itemRefs.current[posRef.current]
      const root = retry.rootRef.current
      if (!track || !el || !root) return
      const x = root.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2)
      track.style.transition = animated ? `transform ${SLIDE_MS}ms cubic-bezier(0.65, 0, 0.35, 1)` : 'none'
      track.style.transform = `translate3d(${x}px, 0, 0)`
      moving.current = animated
      if (!animated) void track.offsetWidth // commit the jump before any later transition
    },
    [retry.rootRef],
  )

  // Position change: slide for a move, snap for the silent loop jump.
  useLayoutEffect(() => {
    place(slideNext.current)
    slideNext.current = false
  }, [pos, place])

  // A photo finished loading (widths changed) → re-centre; keep sliding if mid-move.
  useLayoutEffect(() => {
    place(moving.current)
  }, [loaded, place])

  useEffect(() => {
    const onResize = () => place(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [place])

  const go = useCallback(
    (dir: 1 | -1) => {
      if (n < 2) return
      slideNext.current = true
      setPos((p) => Math.max(0, Math.min(items.length - 1, p + dir)))
    },
    [n, items.length],
  )

  // After sliding into the outer copies, jump (without animation) to the same slide in the middle copy.
  const onTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target !== e.currentTarget || n < 2) return
    moving.current = false
    const p = posRef.current
    if (p < n || p >= 2 * n) {
      slideNext.current = false
      setPos(((p % n) + n) % n + n)
    }
  }

  // Auto-advance; restarts after every change. Pauses in background tabs.
  useEffect(() => {
    if (n < 2) return
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
  }, [pos, n, interval, go])

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const markLoaded = (key: string) => setLoaded((s) => (s.has(key) ? s : new Set(s).add(key)))

  if (n === 0) return null
  const current = ((pos % n) + n) % n

  return (
    <div ref={retry.rootRef} className="peek">
      <div
        ref={trackRef}
        className="peek-track"
        style={{ '--slide-ms': `${SLIDE_MS}ms` } as React.CSSProperties}
        onTransitionEnd={onTransitionEnd}
      >
        {items.map((photos, i) => {
          const role = i === pos ? 'is-current' : i < pos ? 'is-prev' : 'is-next'
          return (
            <div
              key={i}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              className={`peek-item ${role}`}
              onClick={i === pos ? undefined : () => go(i < pos ? -1 : 1)}
              aria-hidden={i !== pos}
            >
              {photos.map((src, j) => {
                const key = `${i}:${j}`
                return (
                  <img
                    key={j}
                    src={retry.photoSrc(key, src)}
                    alt={`${alt} — ${(i % n) + 1} of ${n}`}
                    data-photo-key={key}
                    className={loaded.has(key) ? 'is-loaded' : ''}
                    onLoad={() => markLoaded(key)}
                    onError={() => retry.onError(key)}
                    draggable={false}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {n > 1 && (
        <>
          <button type="button" className="zone zone-prev" aria-label="Previous photos" onClick={() => go(-1)}>
            <span className="zone-arrow">&#8249;</span>
          </button>
          <button type="button" className="zone zone-next" aria-label="Next photos" onClick={() => go(1)}>
            <span className="zone-arrow">&#8250;</span>
          </button>
          <div className="slideshow-meta">
            <span className="slideshow-counter">
              {String(current + 1).padStart(2, '0')}
              <span className="slideshow-counter-sep">/</span>
              {String(n).padStart(2, '0')}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
