import { useCallback, useEffect, useRef, useState } from 'react'
import { useSite } from '../App'
import { fetchManifest, imageUrl } from '../lib/manifest'
import { emptyManifest, type Project, type SiteManifest } from '../lib/types'
import { SITE_NAME } from '../site.config'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const STATUS_LABEL: Record<SaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed — retry or refresh',
}

const MOVE_TARGETS: { value: string; label: string }[] = [
  { value: 'home', label: 'Home Slideshow' },
  { value: 'home-mobile', label: 'Home Slideshow (Mobile)' },
  { value: 'about', label: 'About Photo' },
]

/** Resize + convert to WebP in the browser, so the server just stores bytes. */
async function fileToWebp(file: File, maxDim = 3840): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const encode = (quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
        'image/webp',
        quality,
      )
    })

  // Adaptive quality: stay under the ~4.5 MB upload ceiling with margin.
  let blob = await encode(0.85)
  let quality = 0.85
  while (blob.size > 3_800_000 && quality > 0.65) {
    quality -= 0.1
    blob = await encode(quality)
  }
  return blob
}

async function uploadImage(section: string, blob: Blob): Promise<string> {
  const res = await fetch(`/api/upload?section=${encodeURIComponent(section)}`, {
    method: 'POST',
    headers: { 'content-type': 'image/webp' },
    body: blob,
  })
  const data = (await res.json().catch(() => ({}))) as { key?: string; error?: string }
  if (!res.ok || !data.key) throw new Error(data.error ?? 'Upload failed')
  return data.key
}

interface ManagerProps {
  onLogout: () => void
}

export default function Manager({ onLogout }: ManagerProps) {
  const { reload } = useSite()
  const [manifest, setManifest] = useState<SiteManifest | null>(null)
  const [tab, setTab] = useState<string>('home')
  const [save, setSave] = useState<SaveState>('idle')
  const [busy, setBusy] = useState('')
  const [dropTarget, setDropTarget] = useState<number | 'add' | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [reorderTarget, setReorderTarget] = useState<number | 'add' | null>(null)
  const addInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const replaceIndex = useRef(-1)

  useEffect(() => {
    fetchManifest().then((m) => setManifest(m ?? emptyManifest()))
  }, [])

  const persist = useCallback(
    async (next: SiteManifest) => {
      setManifest(next)
      setSave('saving')
      try {
        const res = await fetch('/api/manifest', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(next),
        })
        if (!res.ok) throw new Error('save failed')
        setSave('saved')
        reload()
      } catch {
        setSave('error')
      }
    },
    [reload],
  )

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => undefined)
    onLogout()
  }

  if (!manifest) {
    return (
      <div className="page page-static admin-loading">
        <span className="admin-loading-mark">{SITE_NAME}</span>
      </div>
    )
  }

  const project = manifest.projects.find((p) => p.slug === tab)
  const images =
    tab === 'home'
      ? manifest.home
      : tab === 'home-mobile'
        ? (manifest.homeMobile ?? [])
        : tab === 'about'
          ? manifest.about
          : (project?.images ?? [])
  const section = tab

  const updateImages = (updater: (imgs: string[]) => string[]) => {
    const next: SiteManifest = { ...manifest, updatedAt: new Date().toISOString() }
    if (tab === 'home') next.home = updater(manifest.home)
    else if (tab === 'home-mobile') next.homeMobile = updater(manifest.homeMobile ?? [])
    else if (tab === 'about') next.about = updater(manifest.about)
    else
      next.projects = manifest.projects.map((p) =>
        p.slug === tab ? { ...p, images: updater(p.images) } : p,
      )
    void persist(next)
  }

  /** Reorder within the current section: drag slot `from` onto position `to`. */
  const moveToPosition = (from: number | null, to: number) => {
    if (from === null || from === to) return
    updateImages((imgs) => {
      if (from < 0 || from >= imgs.length) return imgs
      const copy = [...imgs]
      const [item] = copy.splice(from, 1)
      copy.splice(Math.min(to, copy.length), 0, item)
      return copy
    })
  }

  /** Move an existing photo from the current section into another section. */
  const moveToSection = (target: string, index: number) => {
    if (target === tab || index < 0 || index >= images.length) return
    const key = images[index]
    const next: SiteManifest = { ...manifest, updatedAt: new Date().toISOString() }
    const takeOut = (imgs: string[]) => imgs.filter((_, i) => i !== index)
    if (tab === 'home') next.home = takeOut(manifest.home)
    else if (tab === 'home-mobile') next.homeMobile = takeOut(manifest.homeMobile ?? [])
    else if (tab === 'about') next.about = takeOut(manifest.about)
    else
      next.projects = manifest.projects.map((p) =>
        p.slug === tab ? { ...p, images: takeOut(p.images) } : p,
      )

    const putIn = (imgs: string[]) => [...imgs, key]
    if (target === 'home') next.home = putIn(next.home)
    else if (target === 'home-mobile') next.homeMobile = putIn(next.homeMobile ?? [])
    else if (target === 'about') next.about = putIn(next.about)
    else
      next.projects = next.projects.map((p) =>
        p.slug === target ? { ...p, images: putIn(p.images) } : p,
      )

    void persist(next)
    setTab(target)
  }

  const runReplace = async (index: number, file: File) => {
    setBusy(`Uploading ${file.name}…`)
    try {
      const key = await uploadImage(section, await fileToWebp(file))
      updateImages((imgs) => imgs.map((img, i) => (i === index ? key : img)))
    } catch (err) {
      setSave('error')
      window.alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy('')
    }
  }

  const runAdd = async (files: File[]) => {
    try {
      const keys: string[] = []
      for (let i = 0; i < files.length; i++) {
        setBusy(`Uploading ${i + 1} of ${files.length}…`)
        keys.push(await uploadImage(section, await fileToWebp(files[i])))
      }
      updateImages((imgs) => [...imgs, ...keys])
    } catch (err) {
      setSave('error')
      window.alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy('')
    }
  }

  const renameProject = (title: string) => {
    if (!project || title.trim() === project.title) return
    const next: SiteManifest = {
      ...manifest,
      updatedAt: new Date().toISOString(),
      projects: manifest.projects.map((p) => (p.slug === tab ? { ...p, title: title.trim() } : p)),
    }
    void persist(next)
  }

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDropTarget(null)
    setReorderTarget(null)
    if (e.dataTransfer.files?.length) {
      const file = e.dataTransfer.files[0]
      void runReplace(index, file)
    } else {
      moveToPosition(dragIndex, index)
    }
    setDragIndex(null)
  }

  const onDropAdd = (e: React.DragEvent) => {
    e.preventDefault()
    setDropTarget(null)
    setReorderTarget(null)
    if (e.dataTransfer.files?.length) {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
      if (files.length) void runAdd(files)
    } else {
      moveToPosition(dragIndex, images.length)
    }
    setDragIndex(null)
  }

  const pickReplace = (index: number) => {
    replaceIndex.current = index
    replaceInput.current?.click()
  }

  const moveTargets = [
    ...MOVE_TARGETS,
    ...manifest.projects.map((p: Project) => ({ value: p.slug, label: p.title })),
  ].filter((t) => t.value !== tab)

  return (
    <div className="page page-static admin">
      <input
        ref={replaceInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void runReplace(replaceIndex.current, f)
          e.target.value = ''
        }}
      />
      <input
        ref={addInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) void runAdd(files)
          e.target.value = ''
        }}
      />

      <aside className="admin-side">
        <span className="admin-side-mark">{SITE_NAME}</span>
        <nav className="admin-tabs">
          <button className={tab === 'home' ? 'is-active' : ''} onClick={() => setTab('home')}>
            Home Slideshow
          </button>
          <button
            className={tab === 'home-mobile' ? 'is-active' : ''}
            onClick={() => setTab('home-mobile')}
          >
            Home Slideshow (Mobile)
          </button>
          <button className={tab === 'about' ? 'is-active' : ''} onClick={() => setTab('about')}>
            About Photo
          </button>
          <span className="admin-tabs-group">Projects</span>
          {manifest.projects.map((p: Project) => (
            <button
              key={p.slug}
              className={tab === p.slug ? 'is-active' : ''}
              onClick={() => setTab(p.slug)}
            >
              {p.title}
            </button>
          ))}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-head">
          <div>
            <h1 className="admin-title">
              {tab === 'home'
                ? 'Home Slideshow'
                : tab === 'home-mobile'
                  ? 'Home Slideshow (Mobile)'
                  : tab === 'about'
                    ? 'About Photo'
                    : (project?.title ?? tab)}
            </h1>
            {project && (
              <input
                key={`${project.slug}-${project.title}`}
                className="admin-rename"
                defaultValue={project.title}
                placeholder="Project title"
                onBlur={(e) => renameProject(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
              />
            )}
          </div>
          <div className="admin-status">
            {busy && <span className="admin-busy">{busy}</span>}
            {!busy && save !== 'idle' && (
              <span className={`admin-save is-${save}`}>{STATUS_LABEL[save]}</span>
            )}
            <button type="button" className="admin-logout" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </header>

        <div className="admin-slots">
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={[
                'admin-slot',
                dropTarget === i ? 'is-drop' : '',
                reorderTarget === i ? 'is-reorder' : '',
                dragIndex === i ? 'is-dragging' : '',
              ].join(' ')}
              onDragOver={(e) => {
                e.preventDefault()
                if (e.dataTransfer.types.includes('Files')) setDropTarget(i)
                else setReorderTarget(i)
              }}
              onDragLeave={() => {
                setDropTarget((t) => (t === i ? null : t))
                setReorderTarget((t) => (t === i ? null : t))
              }}
              onDrop={(e) => onDrop(e, i)}
              onClick={() => pickReplace(i)}
              title="Drop a new file here to replace · drag photo onto another slot to reorder"
            >
              <div
                className="admin-slot-thumb"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(i))
                  e.dataTransfer.effectAllowed = 'move'
                  setDragIndex(i)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setReorderTarget(null)
                  setDropTarget(null)
                }}
              >
                <img src={imageUrl(src)} alt={`${tab} ${i + 1}`} loading="lazy" />
                <span className="admin-slot-num">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="admin-slot-actions" onClick={(e) => e.stopPropagation()}>
                <select
                  className="admin-move"
                  value=""
                  aria-label="Move to section"
                  onChange={(e) => {
                    if (e.target.value) moveToSection(e.target.value, i)
                  }}
                >
                  <option value="" disabled>
                    Move to…
                  </option>
                  {moveTargets.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  aria-label="Move earlier"
                  disabled={i === 0}
                  onClick={() => updateImages((imgs) => move(imgs, i, -1))}
                >
                  &#8592;
                </button>
                <button
                  aria-label="Move later"
                  disabled={i === images.length - 1}
                  onClick={() => updateImages((imgs) => move(imgs, i, 1))}
                >
                  &#8594;
                </button>
                <button
                  aria-label="Delete"
                  className="is-danger"
                  onClick={() => {
                    if (window.confirm('Delete this image from the slideshow?')) {
                      updateImages((imgs) => imgs.filter((_, x) => x !== i))
                    }
                  }}
                >
                  &#10005;
                </button>
              </div>
            </div>
          ))}

          <div
            className={`admin-add${dropTarget === 'add' || reorderTarget === 'add' ? ' is-drop' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              if (e.dataTransfer.types.includes('Files')) setDropTarget('add')
              else setReorderTarget('add')
            }}
            onDragLeave={() => {
              setDropTarget((t) => (t === 'add' ? null : t))
              setReorderTarget((t) => (t === 'add' ? null : t))
            }}
            onDrop={onDropAdd}
            onClick={() => addInput.current?.click()}
            role="button"
            tabIndex={0}
          >
            <span className="admin-add-plus">+</span>
            <span>
              {dragIndex !== null
                ? 'Drop here to move to the end'
                : 'Drop new images here, or click to select'}
            </span>
          </div>
        </div>

        <p className="admin-hint">
          Drop a file onto a photo to replace it. Drag a photo onto another slot to reorder, or
          use “Move to…” to send it to a different slideshow — changes save automatically.
          New files are converted to WebP (up to 3840px / 4K, adaptive quality) before upload;
          6000×9000 originals are no problem.
        </p>
      </section>
    </div>
  )
}

function move(imgs: string[], index: number, dir: -1 | 1): string[] {
  const target = index + dir
  if (target < 0 || target >= imgs.length) return imgs
  const copy = [...imgs]
  ;[copy[index], copy[target]] = [copy[target], copy[index]]
  return copy
}
