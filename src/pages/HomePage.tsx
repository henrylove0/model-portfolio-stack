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
  // Desktop filmstrip: one portrait per step, centred, neighbours showing on both sides.
  const strip = useMemo(() => portraits.map((p) => [p]), [portraits])

  // Wait for the live photo list so each photo downloads once, not twice.
  if (!settled) return <div className="page page-full" />

  return (
    <div className="page page-full">
      {/* Phones: one portrait at a time. Desktop/widescreen: a filmstrip of the same portraits,
          uncropped, with the previous and next photos showing (dimmed) on both sides.
          No portraits → the regular home slideshow. */}
      {isMobile || portraits.length < 2 ? (
        <Slideshow
          images={isMobile && portraits.length ? portraits : manifest.home}
          mode="fade"
          interval={5600}
          alt={SITE_NAME}
        />
      ) : (
        <PeekCarousel groups={strip} interval={5600} alt={SITE_NAME} />
      )}
    </div>
  )
}
