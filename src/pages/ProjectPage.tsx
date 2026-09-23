import { Navigate, useParams } from 'react-router-dom'
import { useSite } from '../App'
import { SITE_NAME } from '../site.config'
import Slideshow from '../components/Slideshow'

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const { manifest } = useSite()
  const project = manifest.projects.find((p) => p.slug === slug)

  if (!project) return <Navigate to={`/project/${manifest.projects[0]?.slug ?? 'project-01'}`} replace />

  return (
    <div className="page page-full">
      <Slideshow
        images={project.images}
        mode="slide"
        interval={5000}
        caption={project.title}
        alt={`${SITE_NAME} — ${project.title}`}
      />
    </div>
  )
}
