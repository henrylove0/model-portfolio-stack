import { useEffect, useMemo, useState } from 'react'
import Slideshow from '../components/Slideshow'
import PeekCarousel from '../components/PeekCarousel'
import { useSite } from '../App'
import { SITE_NAME } from '../site.config'

/** Matches the site's mobile breakpoint in styles.css. */
const MOBILE_QUERY = '(max-width: 900px)'

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return mobile
}

export default function HomePage() {
  const { manifest, settled } = useSite()
  const isMobile = useIsMobile()
  const portraits = manifest.homeMobile ?? []
  // Desktop uses "Home Slideshow (Desktop)" once it has real photos; until then the
  // mobile/portrait set, so desktop never falls back to the built-in placeholders.
  const desktopHasPhotos = manifest.home.some((src) => !src.startsWith('/placeholders/'))
  const desktop = desktopHasPhotos ? manifest.home : portraits
  // Desktop filmstrip: one photo per step, centred, neighbours showing on both sides.
  const strip = useMemo(() => desktop.map((p) => [p]), [desktop])

  // Wait for the live photo list so each photo downloads once, not twice.
  if (!settled) return <div className="page page-full" />

  if (isMobile) {
    return (
      <div className="page page-full">
        <Slideshow
          images={portraits.length ? portraits : manifest.home}
          mode="fade"
          interval={5600}
          alt={SITE_NAME}
        />
      </div>
    )
  }

  return (
    <div className="page page-full">
      {strip.length ? (
        <PeekCarousel groups={strip} interval={5600} alt={SITE_NAME} />
      ) : (
        <Slideshow images={manifest.home} mode="fade" interval={5600} alt={SITE_NAME} />
      )}
    </div>
  )
}
