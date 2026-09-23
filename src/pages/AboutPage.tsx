import { useSite } from '../App'
import { CONTACT_EMAIL, INSTAGRAM_URL, SITE_NAME } from '../site.config'
import { imageUrl } from '../lib/manifest'

const STATS: [string, string][] = [
  ['Height', `5'9" / 175cm`],
  ['Bust', '32" / 81cm'],
  ['Waist', '24" / 61cm'],
  ['Hips', '35" / 89cm'],
  ['Shoes', '9 US / 40 EU'],
  ['Hair', 'Brown'],
  ['Eyes', 'Hazel'],
]

export default function AboutPage() {
  const { manifest } = useSite()
  const portrait = manifest.about[0]

  return (
    <div className="page page-static about">
      <div className="about-grid">
        <figure className="about-photo">
          {portrait ? (
            <img src={imageUrl(portrait)} alt={`${SITE_NAME} portrait`} />
          ) : (
            <div className="about-photo-empty">{SITE_NAME}</div>
          )}
        </figure>

        <div className="about-body" id="story">
          <h1 className="about-name">{SITE_NAME}</h1>
          <p className="about-lede">
            Model based between New York and Paris. Represented worldwide.
          </p>
          <p className="about-text">
            Bio placeholder — replace this text with a short biography in
            src/pages/AboutPage.tsx: recent campaigns, editorials, and the
            cities you work between.
          </p>

          <dl className="about-stats">
            {STATS.map(([label, value]) => (
              <div key={label} className="about-stat">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="about-contact">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </div>

          <div className="about-upcoming" id="upcoming">
            <span className="contact-label">Upcoming Location</span>
            <span className="about-upcoming-value">Paris — January 2027 (placeholder)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
