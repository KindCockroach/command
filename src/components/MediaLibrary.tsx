'use client'
import { useState, useEffect } from 'react'
import { Loader2, Video, Music, Image, FileText, Download, ExternalLink, RefreshCw, Search, Pencil, Sparkles } from 'lucide-react'

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
  const [filter, setFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<MediaFile | null>(null)
  const [txState, setTxState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [txMsg, setTxMsg] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const [sent, setSent] = useState('')
  useEffect(() => { setTxState('idle'); setTxMsg(''); setRenaming(false); setSent(''); setRenameVal(displayName(preview?.name ?? '')) }, [preview?.name])

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = files.filter(f => {
    if (filter !== 'all' && f.type !== filter) return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..." style={{ border: 'none', background: 'none', fontSize: '13px', color: 'var(--text)', outline: 'none', width: '140px' }} />
        </div>
      </div>

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

            <div style={{ display: 'flex', gap: '8px' }}>
              <a href={preview.url} download target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '10px', background: 'var(--purple)', color: '#fff', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Download size={13} /> Download
              </a>
              <a href={preview.url} target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '10px', background: 'var(--surface-raised)', color: 'var(--text)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ExternalLink size={13} /> Open in R2
              </a>
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

            {preview.type === 'audio' && (
              <div>
                <button onClick={() => transcribe(preview)} disabled={txState === 'working'}
                  style={{ width: '100%', padding: '10px', background: txState === 'done' ? '#3DAA7C' : 'var(--surface)', color: txState === 'done' ? '#fff' : 'var(--purple)', border: '1px solid var(--purple)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: txState === 'working' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {txState === 'working' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Transcribing…</> : <><FileText size={13} /> Transcribe → save to Notes</>}
                </button>
                {txMsg && txState !== 'working' && <p style={{ fontSize: '11px', marginTop: '5px', textAlign: 'center', color: txState === 'error' ? '#E05252' : '#3DAA7C', fontWeight: 600 }}>{txMsg}</p>}
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '4px' }}>Big files auto-compress to a HeyGen-usable MP3 saved back to Media.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
