import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { SiteManifest } from '../lib/types'
import { hasRealPhotos } from '../lib/manifest'
import { INSTAGRAM_URL, SITE_NAME } from '../site.config'
import { DEFAULT_TEXT, locationId } from '../data/content'

interface NavProps {
  manifest: SiteManifest
}

interface MenuItem {
  label: string
  to?: string
  href?: string
  items: { label: string; to?: string; href?: string }[]
}

export function InstagramIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Nav({ manifest }: NavProps) {
  const [open, setOpen] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const closeTimer = useRef(0)
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(null), 220)
  }

  useEffect(() => {
    setMobileOpen(false)
    setOpen(null)
  }, [location.pathname])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // After every hook: returning early before them breaks React's hook order when
  // moving between the site and /admin in the same tab.
  if (location.pathname.startsWith('/admin')) return null

  // Only projects with uploaded photos are shown; empty galleries appear once filled.
  const projects = manifest.projects.filter((p) => hasRealPhotos(p.images))

  const menu: MenuItem[] = [
    { label: 'Home', to: '/', items: [] },
    ...(projects.length
      ? [
          {
            label: 'Project',
            to: `/project/${projects[0].slug}`,
            items: projects.map((p) => ({ label: p.title, to: `/project/${p.slug}` })),
          },
        ]
      : []),
    {
      label: 'About',
      to: '/about',
      items: [
        { label: 'Story', to: '/about#story' },
        { label: 'Upcoming Location', to: '/about#upcoming' },
      ],
    },
    {
      label: 'Contact',
      to: '/contact',
      items: (manifest.text ?? DEFAULT_TEXT).contacts.map((c) => ({
        label: c.location,
        to: `/contact#${locationId(c.location)}`,
      })),
    },
  ]

  return (
    <header className="nav">
      <div className="nav-bar">
        <Link to="/" className="nav-wordmark" aria-label={`${SITE_NAME} — home`}>
          {SITE_NAME}
        </Link>

        <nav className="nav-desktop" aria-label="Main">
          {menu.map((item) => (
            <div
              key={item.label}
              className="nav-item"
              onMouseEnter={() => {
                window.clearTimeout(closeTimer.current)
                setOpen(item.label)
              }}
              onMouseLeave={scheduleClose}
            >
              <NavLink
                to={item.to ?? '#'}
                className={({ isActive }) =>
                  `nav-link${isActive || (item.label === 'Project' && location.pathname.startsWith('/project')) ? ' is-active' : ''}`
                }
              >
                {item.label}
              </NavLink>
              {item.items.length > 0 && (
                <div className={`nav-dropdown${open === item.label ? ' is-open' : ''}`}>
                  {item.items.map((sub, i) =>
                    sub.href ? (
                      <a
                        key={sub.label}
                        href={sub.href}
                        target="_blank"
                        rel="noreferrer"
                        className="nav-dropdown-link"
                        style={{ transitionDelay: `${i * 35}ms` }}
                      >
                        {sub.label}
                      </a>
                    ) : (
                      <Link
                        key={sub.label}
                        to={sub.to ?? '#'}
                        className="nav-dropdown-link"
                        style={{ transitionDelay: `${i * 35}ms` }}
                      >
                        {sub.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
          <a
            className="nav-instagram"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
          >
            <InstagramIcon />
          </a>
        </nav>

        <button
          type="button"
          className={`nav-burger${mobileOpen ? ' is-open' : ''}`}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className={`nav-mobile${mobileOpen ? ' is-open' : ''}`} aria-hidden={!mobileOpen}>
        {menu.map((item, i) =>
          item.items.length === 0 ? (
            <Link
              key={item.label}
              to={item.to ?? '#'}
              className="nav-mobile-single"
              style={{ transitionDelay: `${80 + i * 50}ms` }}
            >
              {item.label}
            </Link>
          ) : (
            <div key={item.label} className="nav-mobile-group" style={{ transitionDelay: `${80 + i * 50}ms` }}>
              <span className="nav-mobile-label">{item.label}</span>
              <div className="nav-mobile-items">
                {item.items.map((sub) =>
                  sub.href ? (
                    <a key={sub.label} href={sub.href} target="_blank" rel="noreferrer">
                      {sub.label}
                    </a>
                  ) : (
                    <Link key={sub.label} to={sub.to ?? '#'}>
                      {sub.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ),
        )}
        <a
          className="nav-mobile-instagram"
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
        >
          <InstagramIcon /> Instagram
        </a>
      </div>
    </header>
  )
}
