import { useEffect, useState } from 'react'
import { SITE_NAME } from '../site.config'
import Login from './Login'
import Manager from './Manager'

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/session')
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data: { authenticated?: boolean }) => {
        if (!cancelled) setAuthed(data.authenticated === true)
      })
      .catch(() => {
        if (!cancelled) setAuthed(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (authed === null) {
    return (
      <div className="page page-static admin-loading">
        <span className="admin-loading-mark">{SITE_NAME}</span>
      </div>
    )
  }

  return authed ? <Manager onLogout={() => setAuthed(false)} /> : <Login onSuccess={() => setAuthed(true)} />
}
