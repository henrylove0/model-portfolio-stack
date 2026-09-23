/**
 * Site identity — the one file you edit to make this template yours.
 * The nav wordmark, about page, contact agencies, slideshow alt text and the
 * admin branding all read from here.
 */
export const SITE_NAME = 'Your Name'
export const SITE_TITLE = 'Your Name — Model'
export const INSTAGRAM_URL = 'https://instagram.com/yourhandle'
export const CONTACT_EMAIL = 'hello@yourdomain.com'

/** Contact-page agencies — the Contact nav dropdown and page read this. */
export const AGENCIES: { location: string; contact: string }[] = [
  { location: 'New York', contact: 'Agency Name — enquiries placeholder' },
  { location: 'Paris', contact: 'Agency Name — enquiries placeholder' },
  { location: 'Milan', contact: 'Agency Name — enquiries placeholder' },
  { location: 'London', contact: 'Agency Name — enquiries placeholder' },
  { location: 'Worldwide', contact: 'Agency Name — enquiries placeholder' },
]

/** Number of project galleries (Project 01 … Project N). */
export const PROJECT_COUNT = 20

// ---- R2 / Cloudflare (set VITE_R2_PUBLIC_URL in Vercel env; see README) ----

const raw = import.meta.env.VITE_R2_PUBLIC_URL as string | undefined

/** Public base URL of the R2 bucket (custom domain), no trailing slash. */
export const R2_PUBLIC_URL = (raw || '').replace(/\/+$/, '')

/** Public URL of the JSON manifest stored in R2. Empty until R2 is configured. */
export const MANIFEST_URL = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/_manifest.json` : ''
