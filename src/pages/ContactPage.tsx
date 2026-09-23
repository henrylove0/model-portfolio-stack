import { AGENCIES } from '../site.config'

export default function ContactPage() {
  return (
    <div className="page page-static contact">
      <div className="contact-inner">
        <h1 className="contact-title">Contact</h1>
        {AGENCIES.map((agency) => (
          <div
            key={agency.location}
            id={agency.location.toLowerCase()}
            className="contact-block"
          >
            <span className="contact-label">{agency.location}</span>
            <span className="contact-value">{agency.contact}</span>
          </div>
        ))}
        <p className="contact-note">
          Represented worldwide — please contact the agency in your region. Agency names and
          details are placeholders, editable in <code>src/data/content.ts</code>.
        </p>
      </div>
    </div>
  )
}
