import type { SiteManifest } from '../lib/types'
import { PROJECT_SLUGS } from '../lib/types'
import { DEFAULT_TEXT } from './content'

/**
 * Built-in fallback content so the site looks intentional before any photos
 * are uploaded through the CMS. Images are local placeholder files.
 */
export const defaultManifest: SiteManifest = {
  updatedAt: 'default',
  home: ['/placeholders/home-01.webp', '/placeholders/home-02.webp', '/placeholders/home-03.webp'],
  about: ['/placeholders/about-01.webp'],
  text: DEFAULT_TEXT,
  projects: PROJECT_SLUGS.map((slug, i) => ({
    slug,
    title: `Project ${String(i + 1).padStart(2, '0')}`,
    images: [
      '/placeholders/project-a.webp',
      '/placeholders/project-b.webp',
      '/placeholders/project-c.webp',
    ],
  })),
}
