import { useSite } from '../App'
import { DEFAULT_TEXT, locationId } from '../data/content'

export default function ContactPage() {
  const { manifest } = useSite()
  const text = manifest.text ?? DEFAULT_TEXT

  return (
    <div className="page page-static contact">
      <div className="contact-inner">
        <h1 className="contact-title">Contact</h1>
        {text.contacts.map((c, i) => (
          <div key={`${c.location}-${i}`} id={locationId(c.location)} className="contact-block">
            <span className="contact-label">{c.location}</span>
            <span className="contact-value">{c.details}</span>
          </div>
        ))}
        {text.email && (
          <div className="contact-block">
            <span className="contact-label">Email</span>
            <a className="contact-link" href={`mailto:${text.email}`}>
              {text.email}
            </a>
          </div>
        )}
        <p className="contact-note">Represented worldwide — please contact the agency in your region.</p>
      </div>
    </div>
  )
}
