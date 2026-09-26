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

/**
 * Desktop pairs follow the order of the portrait set in the admin: 1+2, 3+4, …
 * (an odd last photo shows on its own). Reorder in the admin to change the pairs.
 */
function pairUp(photos: string[]): string[][] {
  const pairs: string[][] = []
  for (let i = 0; i < photos.length; i += 2) pairs.push(photos.slice(i, i + 2))
  return pairs
}

export default function HomePage() {
  const { manifest, settled } = useSite()
  const isMobile = useIsMobile()
  const portraits = manifest.homeMobile ?? []
  const desktopPairs = useMemo(() => pairUp(portraits), [portraits])

  // Wait for the live photo list so each photo downloads once, not twice.
  if (!settled) return <div className="page page-full" />

  return (
    <div className="page page-full">
      {/* Phones: one portrait at a time. Desktop/widescreen: portraits in pairs, uncropped,
          with the neighbouring pairs peeking in at the edges. No portraits → regular home set. */}
      {isMobile || portraits.length < 2 ? (
        <Slideshow
          images={isMobile && portraits.length ? portraits : manifest.home}
          mode="fade"
          interval={5600}
          alt={SITE_NAME}
        />
      ) : (
        <PeekCarousel groups={desktopPairs} interval={5600} alt={SITE_NAME} />
      )}
    </div>
  )
}
