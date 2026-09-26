import { useSite } from '../App'
import { INSTAGRAM_URL, SITE_NAME } from '../site.config'
import { imageUrl } from '../lib/manifest'
import { DEFAULT_TEXT, paragraphs } from '../data/content'

/** Story page: one photo, her story below it, then stats, contact and upcoming location. */
export default function AboutPage() {
  const { manifest } = useSite()
  const text = manifest.text ?? DEFAULT_TEXT
  const portrait = manifest.about[0]

  return (
    <div className="page page-static about">
      <article className="about-story" id="story">
        <figure className="about-photo">
          {portrait ? (
            <img src={imageUrl(portrait)} alt={`${text.storyTitle} portrait`} />
          ) : (
            <div className="about-photo-empty">{SITE_NAME}</div>
          )}
        </figure>

        <div className="about-body">
          <h1 className="about-name">{text.storyTitle}</h1>
          {text.storyLede && <p className="about-lede">{text.storyLede}</p>}
          {paragraphs(text.story).map((p, i) => (
            <p key={i} className="about-text">
              {p}
            </p>
          ))}

          {text.stats.length > 0 && (
            <dl className="about-stats">
              {text.stats.map((s, i) => (
                <div key={`${s.label}-${i}`} className="about-stat">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="about-contact">
            {text.email && <a href={`mailto:${text.email}`}>{text.email}</a>}
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </div>

          {text.upcoming && (
            <div className="about-upcoming" id="upcoming">
              <span className="contact-label">Upcoming Location</span>
              <span className="about-upcoming-value">{text.upcoming}</span>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
