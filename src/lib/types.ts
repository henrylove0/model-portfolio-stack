import { PROJECT_COUNT } from '../site.config'

export interface Project {
  slug: string
  title: string
  images: string[]
}

export interface Contact {
  location: string
  details: string
}

/** Page text edited in the admin (Story, Upcoming Location, Contacts). Plain text only. */
export interface SiteText {
  storyTitle: string
  storyLede: string
  /** paragraphs separated by a blank line */
  story: string
  stats: { label: string; value: string }[]
  upcoming: string
  email: string
  contacts: Contact[]
}

export interface SiteManifest {
  updatedAt: string
  home: string[]
  /** Portrait home slideshow shown on phones; falls back to `home` when empty. */
  homeMobile?: string[]
  about: string[]
  projects: Project[]
  text?: SiteText
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
