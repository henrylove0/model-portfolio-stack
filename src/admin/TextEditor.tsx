import { useEffect, useState } from 'react'
import type { SiteText } from '../lib/types'

export type TextSection = 'story' | 'upcoming' | 'contacts'

interface TextEditorProps {
  section: TextSection
  /** the saved text */
  text: SiteText
  /** saves the whole text object; resolves true on success */
  onSave: (next: SiteText) => Promise<boolean>
  /** reports unsaved edits, so the admin can warn before switching sections */
  onDirtyChange: (dirty: boolean) => void
}

/**
 * Edits page text. Changes stay a local draft until "Save" (no save per keystroke).
 * The draft is never replaced from outside, so a photo save elsewhere can't wipe what
 * she is typing, and a failed save keeps the draft for a retry.
 */
export default function TextEditor({ section, text, onSave, onDirtyChange }: TextEditorProps) {
  const [draft, setDraft] = useState<SiteText>(text)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(text)

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = <K extends keyof SiteText>(key: K, value: SiteText[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const save = async () => {
    setSaving(true)
    setFailed(false)
    const ok = await onSave(draft)
    setSaving(false)
    setFailed(!ok)
  }

  return (
    <div className="admin-text">
      {section === 'story' && (
        <>
          <label className="admin-field">
            <span>Name / title</span>
            <input value={draft.storyTitle} maxLength={120} onChange={(e) => set('storyTitle', e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Intro line</span>
            <input value={draft.storyLede} maxLength={400} onChange={(e) => set('storyLede', e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Her story</span>
            <textarea
              value={draft.story}
              maxLength={20000}
              rows={14}
              onChange={(e) => set('story', e.target.value)}
            />
            <small>Leave an empty line between paragraphs.</small>
          </label>

          <div className="admin-field">
            <span>Measurements</span>
            {draft.stats.map((s, i) => (
              <div key={i} className="admin-row">
                <input
                  aria-label="Label"
                  placeholder="Label (e.g. Height)"
                  value={s.label}
                  maxLength={60}
                  onChange={(e) => set('stats', draft.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  aria-label="Value"
                  placeholder="Value"
                  value={s.value}
                  maxLength={120}
                  onChange={(e) => set('stats', draft.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                />
                <RowButtons
                  index={i}
                  count={draft.stats.length}
                  onMove={(dir) => set('stats', swap(draft.stats, i, dir))}
                  onRemove={() => set('stats', draft.stats.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button
              type="button"
              className="admin-add-row"
              disabled={draft.stats.length >= 30}
              onClick={() => set('stats', [...draft.stats, { label: '', value: '' }])}
            >
              + Add measurement
            </button>
          </div>
        </>
      )}

      {section === 'upcoming' && (
        <label className="admin-field">
          <span>Upcoming location</span>
          <input
            value={draft.upcoming}
            maxLength={200}
            placeholder="e.g. Paris — January 2027"
            onChange={(e) => set('upcoming', e.target.value)}
          />
          <small>Shown on the Story page. Leave empty to hide it.</small>
        </label>
      )}

      {section === 'contacts' && (
        <>
          <div className="admin-field">
            <span>Locations</span>
            {draft.contacts.map((c, i) => (
              <div key={i} className="admin-row admin-row-contact">
                <input
                  aria-label="Location"
                  placeholder="Location (e.g. Bali)"
                  value={c.location}
                  maxLength={60}
                  onChange={(e) => set('contacts', draft.contacts.map((x, j) => (j === i ? { ...x, location: e.target.value } : x)))}
                />
                <textarea
                  aria-label="Contact details"
                  placeholder="Agency / contact details"
                  value={c.details}
                  maxLength={1000}
                  rows={2}
                  onChange={(e) => set('contacts', draft.contacts.map((x, j) => (j === i ? { ...x, details: e.target.value } : x)))}
                />
                <RowButtons
                  index={i}
                  count={draft.contacts.length}
                  onMove={(dir) => set('contacts', swap(draft.contacts, i, dir))}
                  onRemove={() => set('contacts', draft.contacts.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button
              type="button"
              className="admin-add-row"
              disabled={draft.contacts.length >= 30}
              onClick={() => set('contacts', [...draft.contacts, { location: '', details: '' }])}
            >
              + Add location
            </button>
            <small>Each location also appears in the Contact menu.</small>
          </div>
          <label className="admin-field">
            <span>Email</span>
            <input
              type="email"
              value={draft.email}
              maxLength={200}
              placeholder="hello@example.com"
              onChange={(e) => set('email', e.target.value.trim())}
            />
          </label>
        </>
      )}

      <div className="admin-text-actions">
        <button type="button" className="admin-save-btn" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
        {dirty && !saving && (
          <button type="button" className="admin-discard-btn" onClick={() => setDraft(text)}>
            Discard
          </button>
        )}
        {failed && <span className="admin-save is-error">Save failed — your text is kept, try again</span>}
      </div>
    </div>
  )
}

function RowButtons({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <div className="admin-row-actions">
      <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
        &#8593;
      </button>
      <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
        &#8595;
      </button>
      <button type="button" aria-label="Remove" className="is-danger" onClick={onRemove}>
        &#10005;
      </button>
    </div>
  )
}

function swap<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const copy = [...list]
  ;[copy[i], copy[j]] = [copy[j], copy[i]]
  return copy
}
