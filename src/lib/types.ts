import { PROJECT_COUNT } from '../site.config'

export interface Project {
  slug: string
  title: string
  images: string[]
}

export interface SiteManifest {
  updatedAt: string
  home: string[]
  about: string[]
  projects: Project[]
}

export const PROJECT_SLUGS = Array.from(
  { length: PROJECT_COUNT },
  (_, i) => `project-${String(i + 1).padStart(2, '0')}`,
)

export function emptyManifest(): SiteManifest {
  return {
    updatedAt: new Date().toISOString(),
    home: [],
    about: [],
    projects: PROJECT_SLUGS.map((slug, i) => ({
      slug,
      title: `Project ${String(i + 1).padStart(2, '0')}`,
      images: [],
    })),
  }
}
