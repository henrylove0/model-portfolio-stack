import { useEffect, useState } from 'react'
import Slideshow from '../components/Slideshow'
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
  // Phones get the portrait set when one exists; otherwise the regular home slideshow.
  const images = isMobile && manifest.homeMobile?.length ? manifest.homeMobile : manifest.home
  return (
    <div className="page page-full">
      {/* Wait for the live photo list so each photo downloads once, not twice. */}
      {settled && <Slideshow images={images} mode="fade" interval={5600} alt={SITE_NAME} />}
    </div>
  )
}
