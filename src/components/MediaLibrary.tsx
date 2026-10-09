'use client'
import { useState, useEffect } from 'react'
import { Loader2, Video, Music, Image, FileText, Download, ExternalLink, RefreshCw, Search, Pencil, Sparkles, Copy, Check, Trash2 } from 'lucide-react'
import VideoDraftPanel from './VideoDraftPanel'
import FileUpload from './FileUpload'

interface MediaFile {
  key: string
  name: string
  folder: string
  type: 'video' | 'audio' | 'image' | 'other'
  ext: string
  size: number
  lastModified: string
  url: string
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <Video size={16} />,
  audio: <Music size={16} />,
  image: <Image size={16} />,
  other: <FileText size={16} />,
}

const TYPE_COLOR: Record<string, string> = {
  video: '#5A4FCF',
  audio: '#E8448A',
  image: '#3DAA7C',
  other: '#9494B0',
}

// Friendly name for the rename field: drop the extension and the -6char uniquifier.
function displayName(name: string): string {
  return (name || '').replace(/\.[^.]+$/, '').replace(/-[a-z0-9]{6}$/i, '').replace(/-/g, ' ')
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return `${mins}m ago`
}

export default function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  // One-drop clip pipeline: pick an account, turn this voice clip into a captioned
  // avatar reel + a ready post (kills the manual HeyGen round-trip).
  const [clipAccounts, setClipAccounts] = useState<{ id: string; handle: string }[]>([])
  const [clipAcct, setClipAcct] = useState('')
  const [clipState, setClipState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [clipMsg, setClipMsg] = useState('')
  useEffect(() => { fetch('/api/accounts').then(r => r.json()).then((a: { id: string; handle: string; status: string }[]) => setClipAccounts(a.filter(x => ['active', 'restricted', 'planned'].includes(x.status)))).catch(() => {}) }, [])
  const makeClipReel = async (f: MediaFile) => {
    if (!clipAcct) { setClipState('error'); setClipMsg('Pick an account first.'); return }
    setClipState('working'); setClipMsg('Transcribing → writing the post → firing the captioned avatar render…')
    const d = await fetch('/api/clip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl: f.url, accountId: clipAcct }),
    }).then(r => r.json()).catch(() => ({ error: 'connection failed' }))
    if (d.piece) {
      setClipState('done')
      setClipMsg(`✓ Post #${d.piece.id} created in ${clipAccounts.find(a => a.id === clipAcct)?.handle || clipAcct} · ${d.transcriptWords} words${d.heygen?.started ? ' · captioned avatar rendering (lands on the card)' : d.heygen?.error ? ` · (avatar render: ${d.heygen.error} — click Make avatar video on the card)` : ''}. Approve it in Accounts.`)
    } else { setClipState('error'); setClipMsg(d.error || 'Could not build the reel.') }
  }
  // Drop a finished VIDEO → open the clean draft panel (hooks/title/caption/hashtags).
  const [videoDrafting, setVideoDrafting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<MediaFile | null>(null)
  const [txState, setTxState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [txMsg, setTxMsg] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const [sent, setSent] = useState('')
  // Media memory — descriptions/tags per file, so media is findable by meaning.
  type Meta = { description: string; tags: string[]; vibe?: string; has_children?: boolean }
  const [meta, setMeta] = useState<Record<string, Meta>>({})
  const [describing, setDescribing] = useState<Record<string, boolean>>({})
  const [bulkState, setBulkState] = useState<'idle' | 'working' | 'done'>('idle')
  const [bulkMsg, setBulkMsg] = useState('')
  // Thought → media matching
  const [thought, setThought] = useState('')
  const [matching, setMatching] = useState(false)
  const [matches, setMatches] = useState<{ key: string; reason: string }[]>([])
  const [matchNote, setMatchNote] = useState('')

  const matchThought = async () => {
    const t = thought.trim()
    if (!t || matching) return
    setMatching(true); setMatches([]); setMatchNote('')
    const d = await fetch('/api/media/match', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thought: t }),
    }).then(r => r.json()).catch(() => ({ error: 'connection failed' }))
    if (Array.isArray(d.matches)) {
      setMatches(d.matches)
      if (!d.matches.length) setMatchNote(d.note || 'Nothing fit yet — describe more images, or reword the thought.')
    } else setMatchNote(d.error || 'Could not match.')
    setMatching(false)
  }

  const describeOne = async (f: MediaFile) => {
    if (describing[f.key] || meta[f.key]) return
    setDescribing(s => ({ ...s, [f.key]: true }))
    try {
      const d = await fetch('/api/media/describe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: f.key, url: f.url, type: f.type, name: f.name }),
      }).then(r => r.json()).catch(() => ({}))
      if (d.meta) setMeta(m => ({ ...m, [f.key]: d.meta }))
    } finally {
      setDescribing(s => { const n = { ...s }; delete n[f.key]; return n })
    }
  }

  const loadMeta = async (currentFiles: MediaFile[]) => {
    try {
      const d = await fetch('/api/media/describe').then(r => r.json())
      const m: Record<string, Meta> = d.meta || {}
      setMeta(m)
      // Auto-describe freshly dropped images (last ~3 min) that have no memory yet.
      const fresh = currentFiles.filter(f => f.type === 'image' && !m[f.key] && Date.now() - new Date(f.lastModified).getTime() < 3 * 60000).slice(0, 5)
      for (const f of fresh) describeOne(f)
    } catch { /* non-fatal */ }
  }

  const describeAll = async () => {
    const imgs = files.filter(f => f.type === 'image' && !meta[f.key]).map(f => ({ key: f.key, url: f.url, type: f.type, name: f.name }))
    if (!imgs.length || bulkState === 'working') return
    setBulkState('working'); setBulkMsg(`Describing ${Math.min(imgs.length, 12)}…`)
    const d = await fetch('/api/media/describe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ describeAll: true, files: imgs }),
    }).then(r => r.json()).catch(() => ({}))
    const m = await fetch('/api/media/describe').then(r => r.json()).catch(() => ({ meta: {} }))
    setMeta(m.meta || {})
    setBulkState('done'); setBulkMsg(`✓ Described ${d.described || 0}${d.remaining ? ` · ${d.remaining} left — tap again` : ''}`)
  }
  useEffect(() => { setTxState('idle'); setTxMsg(''); setRenaming(false); setSent(''); setVideoDrafting(false); setRenameVal(displayName(preview?.name ?? '')) }, [preview?.name])

  const doRename = async () => {
    if (!preview || !renameVal.trim()) return
    setRenameBusy(true)
    try {
      const d = await fetch('/api/media/rename', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: preview.key, newName: renameVal.trim() }),
      }).then(r => r.json()).catch(() => ({ error: 'failed' }))
      if (d.url) { setRenaming(false); setPreview(null); load() }
    } finally { setRenameBusy(false) }
  }

  // Inline (grid) rename via a quick prompt.
  const [copiedKey, setCopiedKey] = useState('')
  const renameInline = async (file: MediaFile) => {
    const nn = window.prompt('Rename this file', displayName(file.name))
    if (!nn || !nn.trim()) return
    await fetch('/api/media/rename', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: file.key, newName: nn.trim() }),
    }).catch(() => {})
    load()
  }

  const [deleteBusy, setDeleteBusy] = useState('')
  const doDelete = async (file: MediaFile) => {
    if (!window.confirm(`Delete "${displayName(file.name)}"? This removes it from R2 permanently and unlinks it from any post using it.`)) return
    setDeleteBusy(file.key)
    const res = await fetch('/api/media/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: file.key }),
    }).catch(() => null)
    setDeleteBusy('')
    if (res && res.ok) {
      setFiles(fs => fs.filter(f => f.key !== file.key))
      if (preview?.key === file.key) setPreview(null)
    } else {
      window.alert('Could not delete that file. Try again.')
    }
  }

  // Compress a big audio file to a HeyGen-ready sub-100MB MP3, saved back to Media.
  const [cmpState, setCmpState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [cmpMsg, setCmpMsg] = useState('')
  const compress = async (f: MediaFile) => {
    setCmpState('working'); setCmpMsg('Compressing for HeyGen…')
    const d = await fetch('/api/media/compress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: f.url }),
    }).then(r => r.json()).catch(() => ({ error: 'connection failed' }))
    if (d.url) {
      setCmpState('done')
      setCmpMsg(`✓ Saved ${d.name} — ${formatBytes(d.size)} @ ${d.bitrate}kbps${d.underLimit ? '' : ' (still large)'}`)
      load()
    } else {
      setCmpState('error'); setCmpMsg(d.error || 'Compression failed.')
    }
  }

  // Hand this media off to Instant Compose (the media-native tool) and jump to it.
  const sendToCompose = () => {
    if (!preview) return
    localStorage.setItem('rise-media-handoff', JSON.stringify({ url: preview.url, name: preview.name, type: preview.type }))
    window.dispatchEvent(new CustomEvent('rise-goto-compose'))
    setSent('✓ Sent to Instant Compose — opening…')
  }

  // Transcribe an audio file straight from Media → save the transcript as a note.
  const transcribe = async (f: MediaFile) => {
    setTxState('working'); setTxMsg('Transcribing…')
    try {
      const d = await fetch('/api/transcribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: f.url }),
      }).then(r => r.json()).catch(() => ({ error: 'connection failed' }))
      if (d.transcript) {
        await fetch('/api/notes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `📄 Transcript — ${f.name}`, body: d.transcript, category: 'idea', tags: ['transcript', 'from-media'] }),
        }).catch(() => {})
        setTxState('done'); setTxMsg(`✓ Transcribed (${d.transcript.split(/\s+/).length.toLocaleString()} words) — saved to Notes${d.compressed ? ' · compressed MP3 added to Media' : ''}`)
      } else {
        setTxState('error'); setTxMsg(d.error || 'Transcription failed')
      }
    } catch {
      setTxState('error'); setTxMsg('Transcription failed')
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/media/list')
      const data = await res.json()
      setFiles(data.files ?? [])
      loadMeta(data.files ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = files.filter(f => {
    if (filter !== 'all' && f.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const m = meta[f.key]
      const hay = `${f.name} ${m?.description ?? ''} ${(m?.tags ?? []).join(' ')} ${m?.vibe ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const undescribed = files.filter(f => f.type === 'image' && !meta[f.key]).length

  const counts = {
    all: files.length,
    video: files.filter(f => f.type === 'video').length,
    audio: files.filter(f => f.type === 'audio').length,
    image: files.filter(f => f.type === 'image').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Media Library</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{files.length} files in Cloudflare R2</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Drop b-roll right here — the Media tab had no uploader before */}
      <FileUpload
        folder="broll"
        accept="video/*,image/*,.mov,.heic,.heif,.mp4,.m4v,.jpg,.jpeg,.png,.webp"
        label="Drop b-roll or photos here — from your Desktop (not straight from the Photos app)"
        onUploaded={() => load()}
      />

      {/* Thought → media: hand RISE a feeling, it brings back the footage */}
      <div style={{ borderRadius: '14px', padding: '15px 16px', background: 'linear-gradient(120deg, rgba(90,79,207,0.07), rgba(226,68,138,0.06))', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '7px' }}><Sparkles size={14} style={{ color: 'var(--purple)' }} /> Match a thought to your media</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={thought} onChange={e => setThought(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') matchThought() }}
            placeholder="Paste a thought or rant — I'll find the clips that fit it…"
            style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', outline: 'none' }} />
          <button onClick={matchThought} disabled={matching || !thought.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: thought.trim() ? 'var(--purple)' : 'var(--border)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: thought.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
            {matching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Find clips'}
          </button>
        </div>
        {matchNote && <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{matchNote}</p>}
        {matches.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {matches.map(m => {
              const f = files.find(x => x.key === m.key)
              if (!f) return null
              return (
                <div key={m.key} onClick={() => setPreview(f)} style={{ background: 'var(--surface)', border: '1px solid var(--purple)', borderRadius: '11px', overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ height: '90px', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {f.type === 'image'
                      ? <img src={f.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <div style={{ color: TYPE_COLOR[f.type], opacity: 0.5 }}>{TYPE_ICON[f.type]}</div>}
                  </div>
                  <div style={{ padding: '8px 9px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.35 }}>{m.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {(['all', 'video', 'audio', 'image'] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
              background: filter === t ? 'var(--purple)' : 'var(--surface-raised)',
              color: filter === t ? '#fff' : 'var(--text-muted)',
            }}>
            {t !== 'all' && TYPE_ICON[t]}
            {t.charAt(0).toUpperCase() + t.slice(1)} <span style={{ opacity: 0.7 }}>({counts[t]})</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Search size={13} style={{ color: 'var(--text-subtle)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or meaning…" style={{ border: 'none', background: 'none', fontSize: '13px', color: 'var(--text)', outline: 'none', width: '170px' }} />
        </div>
      </div>

      {/* Give your media a memory — describe the backlog so it's findable + matchable */}
      {undescribed > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '11px 14px', borderRadius: '11px', background: 'linear-gradient(120deg, rgba(90,79,207,0.08), rgba(61,170,124,0.06))', border: '1px solid var(--border)' }}>
          <Sparkles size={15} style={{ color: 'var(--purple)' }} />
          <span style={{ fontSize: '12.5px', color: 'var(--text)', fontWeight: 600 }}>{undescribed} image{undescribed === 1 ? '' : 's'} with no description yet — RISE can&apos;t match what it can&apos;t see.</span>
          <button onClick={describeAll} disabled={bulkState === 'working'}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '9px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '12.5px', cursor: bulkState === 'working' ? 'default' : 'pointer' }}>
            {bulkState === 'working' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> describing…</> : <><Sparkles size={13} /> Describe all (12 at a time)</>}
          </button>
          {bulkMsg && bulkState !== 'working' && <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', width: '100%', textAlign: 'right' }}>{bulkMsg}</span>}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-subtle)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px' }}>Loading your media...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-subtle)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📭</p>
          <p style={{ fontSize: '14px', fontWeight: 700 }}>No files yet</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Upload files through the Content Pipeline or Universal Capture</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {filtered.map(file => (
            <div key={file.key} onClick={() => setPreview(file)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', borderTop: `3px solid ${TYPE_COLOR[file.type]}` }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>

              {/* Preview area */}
              <div style={{ height: '120px', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {file.type === 'image' ? (
                  <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div style={{ color: TYPE_COLOR[file.type], opacity: 0.5 }}>
                    {file.type === 'video' ? <Video size={40} /> : file.type === 'audio' ? <Music size={40} /> : <FileText size={40} />}
                  </div>
                )}
                <div style={{ position: 'absolute', top: '6px', right: '6px', padding: '3px 7px', borderRadius: '20px', background: 'rgba(0,0,0,0.5)', fontSize: '10px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>
                  {file.ext}
                </div>
              </div>

              <div style={{ padding: '10px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{formatBytes(file.size)}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{timeAgo(file.lastModified)}</span>
                </div>

                {/* Media memory — what's in it, so it's searchable + matchable */}
                {meta[file.key] ? (
                  <div style={{ marginTop: '7px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{meta[file.key].description}</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
                      {meta[file.key].has_children && <span style={{ fontSize: '9px', fontWeight: 800, color: '#E05252', background: 'rgba(224,82,82,0.12)', borderRadius: '5px', padding: '1px 5px' }}>👶 has kids</span>}
                      {meta[file.key].tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: '9px', color: 'var(--text-subtle)', background: 'var(--surface-raised)', borderRadius: '5px', padding: '1px 5px' }}>{t}</span>)}
                    </div>
                  </div>
                ) : file.type === 'image' ? (
                  <button onClick={e => { e.stopPropagation(); describeOne(file) }} disabled={describing[file.key]}
                    style={{ marginTop: '7px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px', borderRadius: '7px', border: '1px dashed var(--border)', background: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)' }}>
                    {describing[file.key] ? <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> describing…</> : <><Sparkles size={10} /> Describe</>}
                  </button>
                ) : null}

                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(file.url); setCopiedKey(file.key); setTimeout(() => setCopiedKey(''), 1500) }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-raised)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: copiedKey === file.key ? '#3DAA7C' : 'var(--text-muted)' }}>
                    {copiedKey === file.key ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy link</>}
                  </button>
                  <button onClick={e => { e.stopPropagation(); renameInline(file) }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-raised)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    <Pencil size={11} /> Rename
                  </button>
                  <button onClick={e => { e.stopPropagation(); doDelete(file) }} title="Delete file" disabled={deleteBusy === file.key}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 8px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface-raised)', cursor: 'pointer', color: '#E05252' }}>
                    {deleteBusy === file.key ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '16px', padding: '20px', maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              {renaming ? (
                <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                  <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doRename() }}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--purple)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px' }} />
                  <button onClick={doRename} disabled={renameBusy} style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                    {renameBusy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save'}
                  </button>
                  <button onClick={() => setRenaming(false)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-subtle)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {preview.name}
                  <button onClick={() => setRenaming(true)} title="Rename" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple)', padding: '2px', display: 'flex' }}><Pencil size={13} /></button>
                </p>
              )}
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '4px', flexShrink: 0 }}>✕</button>
            </div>

            {preview.type === 'video' && <video src={preview.url} controls style={{ width: '100%', borderRadius: '10px' }} />}
            {preview.type === 'audio' && <audio src={preview.url} controls style={{ width: '100%' }} />}
            {preview.type === 'image' && <img src={preview.url} alt={preview.name} style={{ width: '100%', borderRadius: '10px', objectFit: 'contain', maxHeight: '400px' }} />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
              {[['Type', preview.type], ['Size', formatBytes(preview.size)], ['Uploaded', timeAgo(preview.lastModified)]].map(([k, v]) => (
                <div key={k} style={{ padding: '8px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                  <p style={{ color: 'var(--text-subtle)', fontWeight: 600, marginBottom: '2px' }}>{k}</p>
                  <p style={{ color: 'var(--text)', fontWeight: 700, textTransform: 'capitalize' }}>{v}</p>
                </div>
              ))}
            </div>

            {/* What's in it — the memory RISE uses to match it to your ideas */}
            {preview.type === 'image' && (
              meta[preview.key] ? (
                <div style={{ padding: '12px 14px', borderRadius: '11px', background: 'var(--surface-raised)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', marginBottom: '6px' }}>What RISE sees</p>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{meta[preview.key].description}</p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {meta[preview.key].has_children && <span style={{ fontSize: '10px', fontWeight: 800, color: '#E05252', background: 'rgba(224,82,82,0.12)', borderRadius: '6px', padding: '2px 7px' }}>👶 has kids — exclude from posts</span>}
                    {meta[preview.key].tags.map(t => <span key={t} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 7px' }}>{t}</span>)}
                  </div>
                </div>
              ) : (
                <button onClick={() => describeOne(preview)} disabled={describing[preview.key]}
                  style={{ width: '100%', padding: '10px', background: 'var(--surface)', color: 'var(--purple)', border: '1px solid var(--purple)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {describing[preview.key] ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> describing…</> : <><Sparkles size={13} /> Describe this image</>}
                </button>
              )
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <a href={preview.url} download target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '10px', background: 'var(--purple)', color: '#fff', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Download size={13} /> Download
              </a>
              <a href={preview.url} target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '10px', background: 'var(--surface-raised)', color: 'var(--text)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ExternalLink size={13} /> Open in R2
              </a>
              <button onClick={() => doDelete(preview)} disabled={deleteBusy === preview.key} title="Delete file"
                style={{ padding: '10px 14px', background: 'rgba(224,82,82,0.1)', color: '#E05252', border: '1px solid rgba(224,82,82,0.4)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {deleteBusy === preview.key ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />} Delete
              </button>
            </div>

            {(preview.type === 'image' || preview.type === 'video') && (
              <div>
                <button onClick={sendToCompose}
                  style={{ width: '100%', padding: '10px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Sparkles size={13} /> Send to Instant Compose
                </button>
                {sent && <p style={{ fontSize: '11px', marginTop: '5px', textAlign: 'center', color: '#3DAA7C', fontWeight: 600 }}>{sent}</p>}
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '4px' }}>Composes 3 ready posts from this media. (Full Send &amp; Shredder work on written stories, not raw files.)</p>
              </div>
            )}

            {preview.type === 'video' && (
              <div style={{ marginBottom: '10px', paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
                {!videoDrafting ? (
                  <>
                    <button onClick={() => setVideoDrafting(true)} className="rise-tactile"
                      style={{ width: '100%', padding: '12px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '11px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Sparkles size={14} /> ✍️ Write post from this video
                    </button>
                    <p style={{ fontSize: '10px', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '4px' }}>RISE transcribes your words and writes hooks, a title, a caption, and hashtags to review.</p>
                  </>
                ) : (
                  <VideoDraftPanel videoUrl={preview.url} fileName={preview.name} onClose={() => setVideoDrafting(false)} />
                )}
              </div>
            )}

            {preview.type === 'audio' && (
              <div>
                <button onClick={() => transcribe(preview)} disabled={txState === 'working'}
                  style={{ width: '100%', padding: '10px', background: txState === 'done' ? '#3DAA7C' : 'var(--surface)', color: txState === 'done' ? '#fff' : 'var(--purple)', border: '1px solid var(--purple)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: txState === 'working' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {txState === 'working' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Transcribing…</> : <><FileText size={13} /> Transcribe → save to Notes</>}
                </button>
                {txMsg && txState !== 'working' && <p style={{ fontSize: '11px', marginTop: '5px', textAlign: 'center', color: txState === 'error' ? '#E05252' : '#3DAA7C', fontWeight: 600 }}>{txMsg}</p>}

                <button onClick={() => compress(preview)} disabled={cmpState === 'working'}
                  style={{ width: '100%', marginTop: '8px', padding: '10px', background: cmpState === 'done' ? '#3DAA7C' : 'var(--surface)', color: cmpState === 'done' ? '#fff' : 'var(--purple)', border: '1px solid var(--purple)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: cmpState === 'working' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {cmpState === 'working' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Compressing…</> : <>🗜 Compress for HeyGen → save to Media</>}
                </button>
                {cmpMsg && cmpState !== 'working' && <p style={{ fontSize: '11px', marginTop: '5px', textAlign: 'center', color: cmpState === 'error' ? '#E05252' : '#3DAA7C', fontWeight: 600 }}>{cmpMsg}</p>}
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '4px' }}>Makes a sub-100MB mono MP3 (voice-grade) you can upload to HeyGen.</p>

                {/* 🎬 One-drop: voice clip → captioned avatar reel + ready post */}
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: '6px' }}>🎬 Captioned Reel + Post</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={clipAcct} onChange={e => setClipAcct(e.target.value)}
                      style={{ flex: 1, padding: '9px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12px' }}>
                      <option value="">Which account?</option>
                      {clipAccounts.map(a => <option key={a.id} value={a.id}>{a.handle}</option>)}
                    </select>
                    <button onClick={() => makeClipReel(preview)} disabled={clipState === 'working' || !clipAcct}
                      style={{ padding: '9px 14px', borderRadius: '9px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: clipState === 'working' || !clipAcct ? 'default' : 'pointer', opacity: clipState === 'working' || !clipAcct ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                      {clipState === 'working' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Make it →'}
                    </button>
                  </div>
                  {clipMsg && clipState !== 'working' && <p style={{ fontSize: '11px', marginTop: '6px', textAlign: 'center', color: clipState === 'error' ? '#E05252' : '#3DAA7C', fontWeight: 600 }}>{clipMsg}</p>}
                  {clipState === 'working' && <p style={{ fontSize: '11px', marginTop: '6px', textAlign: 'center', color: 'var(--purple)', fontWeight: 600 }}>{clipMsg}</p>}
                  <p style={{ fontSize: '10px', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '4px' }}>Transcribes → writes the post → renders your avatar lip-synced to this audio with burned captions. No HeyGen round-trip.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
