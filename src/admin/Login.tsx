import { useState } from 'react'
import { SITE_NAME } from '../site.config'

interface LoginProps {
  onSuccess: () => void
}

export default function Login({ onSuccess }: LoginProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) onSuccess()
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page page-static admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <span className="admin-login-mark">{SITE_NAME}</span>
        <span className="admin-login-sub">Content Management</span>
        <input
          type="password"
          className="admin-login-input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
        {error && <span className="admin-login-error">Incorrect password. Try again.</span>}
        <button type="submit" className="admin-login-button" disabled={loading || !password}>
          {loading ? 'Entering…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
