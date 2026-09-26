import { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import AdminApp from './admin/AdminApp'
import { defaultManifest } from './data/defaultManifest'
import { fetchManifest } from './lib/manifest'
import type { SiteManifest } from './lib/types'

interface ManifestState {
  manifest: SiteManifest
  /** true once the live manifest has been loaded from R2/Vercel */
  live: boolean
  /** true once the first manifest fetch has finished (or given up), so photos load once */
  settled: boolean
  reload: () => void
}

/** Stop waiting for the live manifest after this long and fall back to built-in photos. */
const MANIFEST_WAIT_MS = 3000

const ManifestContext = createContext<ManifestState>({
  manifest: defaultManifest,
  live: false,
  settled: false,
  reload: () => undefined,
})

export const useSite = () => useContext(ManifestContext)

/** Scrolls to the element named by the URL hash (e.g. /contact#bali). */
function ScrollToHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [pathname, hash])
  return null
}

export default function App() {
  const [state, setState] = useState<ManifestState>({
    manifest: defaultManifest,
    live: false,
    settled: false,
    reload: () => undefined,
  })

  useEffect(() => {
    let cancelled = false
    const giveUp = window.setTimeout(() => setState((s) => ({ ...s, settled: true })), MANIFEST_WAIT_MS)
    const load = async () => {
      const live = await fetchManifest()
      window.clearTimeout(giveUp)
      if (cancelled) return
      setState((s) =>
        live
          ? { ...s, manifest: mergeWithDefaults(live), live: true, settled: true }
          : { ...s, settled: true },
      )
    }
    void load()
    return () => {
      cancelled = true
      window.clearTimeout(giveUp)
    }
  }, [])

  const reload = () => {
    void fetchManifest().then((live) => {
      if (live) setState((s) => ({ ...s, manifest: mergeWithDefaults(live), live: true }))
    })
  }

  return (
    <ManifestContext.Provider value={{ ...state, reload }}>
      <BrowserRouter>
        <ScrollToHash />
        <Nav manifest={state.manifest} />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/project/:slug" element={<ProjectPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/admin" element={<AdminApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </ManifestContext.Provider>
  )
}

/**
 * Keep all 10 project slots present even if the stored manifest is partial,
 * so the Project dropdown never loses entries.
 */
function mergeWithDefaults(live: SiteManifest): SiteManifest {
  const defaults = defaultManifest.projects
  const projects = defaults.map((d) => {
    const found = live.projects.find((p) => p.slug === d.slug)
    return found ? { ...d, title: found.title || d.title, images: found.images } : d
  })
  const homeMobile = live.homeMobile ?? defaultManifest.homeMobile
  return { ...live, homeMobile, projects }
}
