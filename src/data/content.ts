import type { SiteText } from '../lib/types'
import { AGENCIES, CONTACT_EMAIL, SITE_NAME } from '../site.config'

/**
 * Built-in page text, shown until it is edited in the admin (Story, Upcoming Location,
 * Contacts). Starting values come from src/site.config.ts; after launch the owner edits
 * them in /admin, which saves its own copy in the manifest. Missing fields fall back here.
 */
export const DEFAULT_TEXT: SiteText = {
  storyTitle: SITE_NAME,
  storyLede: 'Model. Represented worldwide.',
  story:
    'Bio placeholder — write a short biography in the admin under Pages → Story: recent campaigns, editorials, and the brands and photographers you have worked with.\n\nLeave an empty line between paragraphs.',
  stats: [
    { label: 'Height', value: `5'9" / 175cm` },
    { label: 'Bust', value: '32" / 81cm' },
    { label: 'Waist', value: '24" / 61cm' },
    { label: 'Hips', value: '35" / 89cm' },
    { label: 'Shoes', value: '9 US / 40 EU' },
    { label: 'Hair', value: 'Brown' },
    { label: 'Eyes', value: 'Hazel' },
  ],
  upcoming: 'Paris — January 2027 (placeholder)',
  email: CONTACT_EMAIL,
  contacts: AGENCIES.map((a) => ({ location: a.location, details: a.contact })),
}

/** Anchor id for a contact location, e.g. "New York" → "new-york" (/contact#new-york). */
export function locationId(location: string): string {
  return location
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Paragraphs from text where a blank line separates paragraphs. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
