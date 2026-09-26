import { Navigate, useParams } from 'react-router-dom'
import Slideshow from '../components/Slideshow'
import { useSite } from '../App'
import { SITE_NAME } from '../site.config'
import { hasRealPhotos, isPlaceholder } from '../lib/manifest'

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const { manifest, settled } = useSite()

  // Wait for the live photo list: the built-in defaults have no real photos, so deciding
  // earlier would bounce a visitor away from a project that does have photos.
  if (!settled) return <div className="page page-full" />

  const project = manifest.projects.find((p) => p.slug === slug)
  // Empty galleries are hidden: go to the first project with photos, or home.
  if (!project || !hasRealPhotos(project.images)) {
    const first = manifest.projects.find((p) => hasRealPhotos(p.images))
    return <Navigate to={first ? `/project/${first.slug}` : '/'} replace />
  }

  return (
    <div className="page page-full">
      <Slideshow
        images={project.images.filter((src) => !isPlaceholder(src))}
        mode="slide"
        interval={5000}
        caption={project.title}
        alt={`${SITE_NAME} — ${project.title}`}
      />
    </div>
  )
}
