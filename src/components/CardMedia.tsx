'use client'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Upload, X, Copy, Check, RotateCcw } from 'lucide-react'
import UploadBar from './UploadBar'
import { PlatformBadge, PLATFORM_CHOICES } from './PlatformBadge'
import { uploadToCard, stopUpload, retryUpload, forgetUpload, getActiveUpload, subscribeUploads, uploadsVersion } from '@/lib/cardUpload'
import { formatBytes } from '@/lib/uploadBig'

// One content card's media + per-platform posts. Used by the calendar's item card and
// Content Day; both point at the same card id, so both show the same media and statuses.
// Drop or pick footage → it uploads into THIS card (never a new one) → Cap gets a note.

type PlatformPost = { platform: string; caption: string; status: 'draft' | 'scheduled' | 'posted'; scheduled_at?: string | null; posted_url?: string | null; posted_at?: string | null }
type View = {
  id: number; title: string; status: string; account_id: string | null; handle: string; account_platform: string
  media: string[]; cover: string; script: boolean; description: string
  upload: { state: 'uploading' | 'incomplete'; filename: string; size: number; error?: string | null; parts_done?: number; parts_total?: number; key?: string | null; upload_id?: string | null; stalled?: boolean } | null
  footage_at: string | null
  platforms: string[]; platform_posts: PlatformPost[]
  mirrors: { id: string; handle: string; platform: string; brand_name: string }[]
  handoff: { id: string; status: 'open' | 'done'; missing: string[]; created_at: string } | null
  calendar: { id: string; date: string; time: string | null } | null
}

const isVid = (u: string) => /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(u)
const isImg = (u: string) => /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(u)
const isAud = (u: string) => /\.(mp3|m4a|wav|aac|ogg)(\?|$)/i.test(u)
const MISSING_LABEL: Record<string, string> = { script: 'script', caption: 'caption', cover: 'cover' }
const STATUS_TONE = { draft: '#8A8CA3', scheduled: '#7C4DDB', posted: '#2F7D5B' } as const

export default function CardMedia({ contentId, calendarItemId, onChanged, showPlatforms = true }: { contentId: number; calendarItemId?: string | null; onChanged?: () => void; showPlatforms?: boolean }) {
  const [view, setView] = useState<View | null>(null)
  const [err, setErr] = useState('')
  const [dragging, setDragging] = useState(false)
  const [queue, setQueue] = useState<File[]>([])
  const pickRef = useRef<HTMLInputElement>(null)
  useSyncExternalStore(subscribeUploads, uploadsVersion, () => 0)
  const live = getActiveUpload(contentId)

  const load = useCallback(async () => {
    const d = await fetch(`/api/content/media?id=${contentId}`).then(r => r.json()).catch(() => ({ error: 'Connection hiccup' }))
    if (d.error) setErr(d.error); else { setView(d); setErr('') }
  }, [contentId])
  useEffect(() => { load() }, [load])

  const afterUpload = useCallback(() => { load(); onChanged?.() }, [load, onChanged])

  // An upload into this card can start elsewhere (a file dropped on a calendar piece);
  // refresh whenever one finishes or fails, wherever it began.
  const lastState = useRef<string | undefined>(undefined)
  useEffect(() => {
    const s = live?.state
    if (s !== lastState.current && (s === 'done' || s === 'failed')) load()
    lastState.current = s
  }, [live?.state, load])

  // Files go up one after another, each into this same card.
  const run = useCallback(async (files: File[]) => {
    for (const f of files) {
      const ok = await uploadToCard(contentId, f, { calendarItemId, onDone: afterUpload })
      if (!ok) { load(); break }
      setQueue(q => q.slice(1))
    }
    setQueue([])
  }, [contentId, calendarItemId, afterUpload, load])

  const take = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []).filter(f => f.size > 0)
    if (!files.length) { setErr('That looks like it came straight from the Photos app. Apple won’t hand the file to a browser on a drag: drag it to your Desktop first, then drop it here (or choose it).'); return }
    if (live?.state === 'uploading') { setErr('One upload at a time on this card. Wait for this one to finish.'); return }
    setErr(''); setQueue(files); run(files)
  }

  const discard = async () => {
    forgetUpload(contentId)
    await fetch('/api/content/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'discard', id: contentId }) })
    load()
  }
  const removeMedia = async (url: string) => {
    if (!confirm('Take this file off the card? (It stays in storage.)')) return
    const d = await fetch('/api/content/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove_media', id: contentId, url }) }).then(r => r.json()).catch(() => null)
    if (d?.view) setView(d.view); onChanged?.()
  }

  if (!view) return <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '6px 0' }}>{err || 'Loading the card…'}</p>

  const serverIncomplete = view.upload && (view.upload.state === 'incomplete') && live?.state !== 'uploading'
  const failedHere = live?.state === 'failed'
  const showIncomplete = failedHere || serverIncomplete
  const waiting = view.handoff?.status === 'open'

  return (
    <div className="cm" onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.stopPropagation(); setDragging(true) } }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.stopPropagation(); setDragging(false); take(e.dataTransfer.files) } }}>
      <style>{css}</style>

      {waiting && (
        <div className="cm-cap">
          <b>🎬 Footage in, waiting on Cap</b>
          <span>{view.handoff!.missing.length ? `Still needs: ${view.handoff!.missing.map(m => MISSING_LABEL[m] ?? m).join(', ')}` : 'Has a script and caption; Cap writes the platform captions.'}</span>
        </div>
      )}

      {view.media.length > 0 && (
        <div className="cm-media">
          {view.media.map(u => (
            <div key={u} className="cm-thumb">
              {isVid(u) ? <video src={u} preload="metadata" muted playsInline controls />
                : isImg(u) ? <img src={u} alt="" />
                : isAud(u) ? <audio src={u} controls preload="none" />
                : <a href={u} target="_blank" rel="noreferrer">{u.split('/').pop()}</a>}
              <button type="button" className="cm-rm" aria-label="Take off the card" onClick={() => removeMedia(u)}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {live?.state === 'uploading' && (
        <div className="cm-box">
          <UploadBar name={live.file.name} progress={live.progress} onStop={() => stopUpload(contentId)} />
          {queue.length > 1 && <span className="cm-note">{queue.length - 1} more waiting</span>}
        </div>
      )}
      {live?.state === 'done' && <div className="cm-box ok"><Check size={14} /> {live.file.name} is on the card ({formatBytes(live.file.size)}). Cap has a note.</div>}

      {showIncomplete && (
        <div className="cm-box bad" role="alert">
          <b>Upload incomplete</b>
          <span>{failedHere ? live!.file.name : view.upload!.filename}{view.upload?.size ? ` · ${formatBytes(view.upload.size)}` : ''}{view.upload?.parts_total ? ` · ${view.upload.parts_done ?? 0} of ${view.upload.parts_total} parts saved` : ''}</span>
          <span className="cm-why">{failedHere ? live!.error : view.upload!.error}</span>
          <div className="cm-row">
            {failedHere
              ? <button type="button" className="cm-btn primary" onClick={() => retryUpload(contentId, { calendarItemId, onDone: afterUpload }).then(ok => { if (!ok) load() })}><RotateCcw size={13} /> Retry</button>
              : <button type="button" className="cm-btn primary" onClick={() => pickRef.current?.click()}><RotateCcw size={13} /> Pick the same file to resume</button>}
            <button type="button" className="cm-btn" onClick={discard}>Discard</button>
          </div>
          {!failedHere && view.upload?.upload_id && <span className="cm-note">RISE keeps the saved parts for 24 hours and skips them when you pick the file again.</span>}
        </div>
      )}

      {live?.state !== 'uploading' && (
        <button type="button" className={`cm-drop${dragging ? ' on' : ''}`} onClick={() => pickRef.current?.click()}>
          <Upload size={16} />
          <span><b>{view.media.length ? 'Add more footage' : 'Drop the finished footage here'}</b><br /><small>or tap to choose · video, audio or image, any size</small></span>
        </button>
      )}
      <input ref={pickRef} type="file" multiple accept="video/*,audio/*,image/*" hidden onChange={e => { take(e.target.files); e.target.value = '' }} />
      {err && <p className="cm-err">{err}</p>}

      {showPlatforms && <PlatformPosts view={view} setView={setView} onChanged={onChanged} />}
    </div>
  )
}

function PlatformPosts({ view, setView, onChanged }: { view: View; setView: (v: View) => void; onChanged?: () => void }) {
  const [copied, setCopied] = useState('')
  const [err, setErr] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const when = view.calendar ? `${view.calendar.date}T${view.calendar.time ?? '09:00'}` : ''

  const save = async (platform: string, patch: Partial<PlatformPost>) => {
    const d = await fetch('/api/content/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'platform', id: view.id, platform, patch }) }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup' }))
    if (d.error) { setErr(d.error); return false }
    setErr(''); setView(d.view); onChanged?.(); return true
  }
  const copy = async (platform: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(platform); setTimeout(() => setCopied(''), 1600) } catch { setErr('Copy didn’t work here. Select the text and copy it.') }
  }
  const extra = PLATFORM_CHOICES.filter(p => !view.platforms.includes(p) && !view.mirrors.some(m => m.platform === p))

  return (
    <div className="cm-plats">
      <p className="cm-h">Captions and posting</p>
      {view.platforms.length === 0 && <p className="cm-note">No platform yet. Add the one this goes to.</p>}
      {view.platforms.map(pl => {
        const pp = view.platform_posts.find(p => p.platform === pl) ?? { platform: pl, caption: '', status: 'draft' as const }
        const text = drafts[pl] ?? pp.caption
        return (
          <div key={pl} className="cm-plat">
            <div className="cm-row between">
              <PlatformBadge platform={pl} />
              <div className="cm-seg" role="group" aria-label={`${pl} status`}>
                {(['draft', 'scheduled', 'posted'] as const).map(s => (
                  <button key={s} type="button" aria-pressed={pp.status === s} className={pp.status === s ? 'on' : ''} style={pp.status === s ? { background: STATUS_TONE[s] } : undefined}
                    onClick={() => save(pl, s === 'scheduled' && !pp.scheduled_at && when ? { status: s, scheduled_at: when } : { status: s })}>
                    {s === 'draft' ? 'Draft' : s === 'scheduled' ? 'Scheduled' : 'Posted'}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={text} rows={3} placeholder={`The ${pl} caption`} onChange={e => setDrafts(d => ({ ...d, [pl]: e.target.value }))}
              onBlur={() => { if (drafts[pl] !== undefined && drafts[pl] !== pp.caption) save(pl, { caption: drafts[pl] }).then(ok => ok && setDrafts(d => { const n = { ...d }; delete n[pl]; return n })) }} />
            <div className="cm-row">
              <button type="button" className="cm-btn" disabled={!text.trim()} onClick={() => copy(pl, text)}>{copied === pl ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}</button>
              {!text.trim() && view.description.trim() && <button type="button" className="cm-btn" onClick={() => save(pl, { caption: view.description })}>Use the card’s caption</button>}
              {pp.status === 'scheduled' && (
                <label className="cm-when">For<input type="datetime-local" value={pp.scheduled_at ?? when} onChange={e => save(pl, { scheduled_at: e.target.value })} /></label>
              )}
              {pp.status === 'posted' && (
                <label className="cm-when grow">Link<input type="url" placeholder="https://…" defaultValue={pp.posted_url ?? ''} onBlur={e => { if ((e.target.value || null) !== (pp.posted_url ?? null)) save(pl, { posted_url: e.target.value }) }} /></label>
              )}
            </div>
            {pp.status === 'posted' && pp.posted_url && <a className="cm-note" href={pp.posted_url} target="_blank" rel="noreferrer">Open the live post ↗</a>}
          </div>
        )
      })}
      {view.mirrors.map(m => (
        <div key={m.id} className="cm-mirror">
          <PlatformBadge platform={m.platform} /> <span><b>{m.brand_name || m.handle}</b> reposts automatically from {view.handle}. Nothing to write.</span>
        </div>
      ))}
      {extra.length > 0 && (
        <select className="cm-add" value="" onChange={e => e.target.value && save(e.target.value, { status: 'draft' })} aria-label="Add a platform">
          <option value="">+ Add a platform</option>
          {extra.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
      {err && <p className="cm-err">{err}</p>}
    </div>
  )
}

const css = `
.cm{display:flex;flex-direction:column;gap:10px;margin:10px 0 4px;min-width:0}
.cm button{font-family:inherit}
.cm-cap{display:flex;flex-direction:column;gap:2px;padding:9px 12px;border-radius:12px;background:rgba(124,77,219,.09);border:1px solid rgba(124,77,219,.3);font-size:12.5px;color:var(--text)}
.cm-cap b{color:#7C4DDB;font-size:13px}
.cm-media{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}
.cm-thumb{position:relative;flex:none;width:104px;height:140px;border-radius:10px;overflow:hidden;background:#111;display:grid;place-items:center}
.cm-thumb video,.cm-thumb img{width:100%;height:100%;object-fit:cover}
.cm-thumb audio{width:100px}
.cm-thumb a{color:#fff;font-size:11px;padding:6px;word-break:break-all}
.cm-rm{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;display:grid;place-items:center;cursor:pointer}
.cm-box{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:12px;border:1px solid var(--border,#E7E1D6);background:var(--surface,#fff);font-size:12.5px}
.cm-box.ok{flex-direction:row;align-items:center;gap:6px;color:#2F7D5B;border-color:rgba(47,125,91,.35);background:rgba(47,125,91,.07);font-weight:700}
.cm-box.bad{border-color:rgba(178,58,72,.45);background:rgba(178,58,72,.06)}
.cm-box.bad b{color:#B23A48;font-size:13.5px}
.cm-why{color:var(--text-subtle);font-size:12px}
.cm-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.cm-row.between{justify-content:space-between}
.cm-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border,#E7E1D6);background:var(--surface,#fff);color:var(--text);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer}
.cm-btn:disabled{opacity:.45;cursor:default}
.cm-btn.primary{background:#B23A48;border-color:#B23A48;color:#fff}
.cm-drop{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:2px dashed var(--border,#E7E1D6);border-radius:12px;color:var(--text-subtle);font-size:12.5px;cursor:pointer;transition:border-color .15s,background .15s}
.cm-drop:hover,.cm-drop.on{border-color:#E2508A;background:rgba(226,80,138,.05);color:var(--text)}
.cm-drop b{color:var(--text)}
.cm-drop small{font-size:11px}
.cm-err{font-size:12px;color:#B23A48;margin:0}
.cm-note{font-size:11px;color:var(--text-subtle)}
.cm-plats{display:flex;flex-direction:column;gap:8px;border-top:1px dashed var(--border,#E7E1D6);padding-top:10px}
.cm-h{margin:0;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle)}
.cm-plat{display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid var(--border,#E7E1D6);border-radius:12px}
.cm-plat textarea{font:inherit;font-size:13px;line-height:1.45;color:var(--text);background:var(--surface,#fff);border:1px solid var(--border,#E7E1D6);border-radius:10px;padding:8px 10px;resize:vertical;width:100%;box-sizing:border-box}
.cm-seg{display:inline-flex;border:1px solid var(--border,#E7E1D6);border-radius:999px;padding:2px;gap:2px}
.cm-seg button{border:0;background:none;color:var(--text-subtle);font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;cursor:pointer}
.cm-seg button.on{color:#fff}
.cm-when{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--text-subtle)}
.cm-when.grow{flex:1;min-width:180px}
.cm-when input{font:inherit;font-size:12.5px;color:var(--text);background:var(--surface,#fff);border:1px solid var(--border,#E7E1D6);border-radius:8px;padding:5px 8px;min-width:0;flex:1}
.cm-mirror{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--text-subtle);padding:8px 10px;border-radius:10px;background:var(--pc-wash,rgba(23,28,58,.03))}
.cm-add{font:inherit;font-size:12px;color:var(--text-subtle);background:none;border:1px dashed var(--border,#E7E1D6);border-radius:999px;padding:5px 10px;align-self:flex-start;cursor:pointer}
@media (max-width:640px){ .cm-row.between{flex-direction:column;align-items:flex-start;gap:6px} }
`
