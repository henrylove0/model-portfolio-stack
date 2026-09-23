import Slideshow from '../components/Slideshow'
import { useSite } from '../App'
import { SITE_NAME } from '../site.config'

export default function HomePage() {
  const { manifest } = useSite()
  return (
    <div className="page page-full">
      <Slideshow images={manifest.home} mode="fade" interval={5600} alt={SITE_NAME} />
    </div>
  )
}
