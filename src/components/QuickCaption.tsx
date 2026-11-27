'use client'
// Phase 8 · B5: QUICK CAPTION (Mandi, Nov 27). One card, mobile-first, its own block at the top of Home.
// Media drop (a video is transcribed + a few frames) → ONE context box → five checkboxes for what she
// needs (caption, hashtags, on-screen text, CTA, sound) → "Write it". The result shows in the same card,
// already saved as a ready card; she can edit it, copy it, and "Post it" (published + today's calendar).
import { useEffect, useRef, useState } from 'react'
import { UploadCloud, X, Copy, CheckCircle2, Loader2, Send } from 'lucide-react'
import { uploadBig } from '@/lib/uploadBig'
import { extractFrames } from '@/lib/videoFrames'
import MusicLine from './MusicLine'
import type { ContentPiece } from '@/lib/db'

type Wants = { caption: boolean; hashtags: boolean; onscreen: boolean; cta: boolean; sound: boolean }
const CHIPS: { k: keyof Wants; label: string }[] = [
  { k: 'caption', label: 'Caption' }, { k: 'hashtags', label: 'Hashtags' }, { k: 'onscreen', label: 'On-screen text' }, { k: 'cta', label: 'CTA' }, { k: 'sound', label: 'Sound' },
]
const WANTS_KEY = 'rise-qc-wants'
type Acct = { id: string; handle: string; status: string; mirrors_account_id?: string | null }
type Result = { card: ContentPiece; account: { id: string; handle: string; why: string }; cta_basis: string }

export default function QuickCaption() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [pct, setPct] = useState<number | null>(null)
  const [frames, setFrames] = useState<string[]>([])
  const [handoff, setHandoff] = useState<{ name: string; type: string } | null>(null)   // media sent from the Media library
  const [context, setContext] = useState('')
  const [wants, setWants] = useState<Wants>({ caption: true, hashtags: true, onscreen: true, cta: true, sound: false })
  const [accounts, setAccounts] = useState<Acct[]>([])
  const [accountId, setAccountId] = useState('')
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [res, setRes] = useState<Result | null>(null)
  const [copied, setCopied] = useState(false)
  const [posted, setPosted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try { const s = localStorage.getItem(WANTS_KEY); if (s) setWants(w => ({ ...w, ...JSON.parse(s) })) } catch { /* defaults */ }
    fetch('/api/accounts').then(r => r.json()).then(d => {
      const list = (Array.isArray(d) ? d : d?.accounts ?? []) as Acct[]
      setAccounts(list.filter(a => a.status === 'active' && !a.mirrors_account_id))
    }).catch(() => {})
  }, [])
  // "Send to Quick Caption" from the Media library: it saves the file's url, then opens Home.
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('rise-media-handoff')
        if (!raw) return
        localStorage.removeItem('rise-media-handoff')
        const h = JSON.parse(raw) as { url: string; name: string; type: string }
        if (!h.url) return
        setFile(null); setRes(null); setPosted(false); setFrames([])
        setMediaUrl(h.url); setPreview(h.url); setHandoff({ name: h.name || 'From your Media library', type: h.type === 'video' ? 'video/mp4' : h.type === 'image' ? 'image/jpeg' : '' })
      } catch { /* no handoff */ }
    }
    load()
    const later = () => setTimeout(load, 0)
    window.addEventListener('rise-goto-compose', later)
    return () => window.removeEventListener('rise-goto-compose', later)
  }, [])
  useEffect(() => { try { localStorage.setItem(WANTS_KEY, JSON.stringify(wants)) } catch { /* fine */ } }, [wants])
  // The context box grows with what she types.
  useEffect(() => { const t = taRef.current; if (t) { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 320)}px` } }, [context])

  const accept = async (f: File) => {
    setFile(f); setHandoff(null); setPreview(URL.createObjectURL(f)); setMediaUrl(''); setFrames([]); setError(''); setRes(null); setPosted(false)
    if (f.type.startsWith('video')) extractFrames(f).then(fr => setFrames(fr.slice(0, 8))).catch(() => {})
    setPct(0)
    try { const { publicUrl } = await uploadBig(f, 'media', p => setPct(p.pct)); setMediaUrl(publicUrl) }
    catch (e) { setError(`Upload didn’t finish: ${e instanceof Error ? e.message : 'failed'}. You can still write from your context.`) }
    finally { setPct(null) }
  }
  const clearMedia = () => { setFile(null); setHandoff(null); setPreview(''); setMediaUrl(''); setFrames([]); if (inputRef.current) inputRef.current.value = '' }
  const reset = () => { clearMedia(); setContext(''); setRes(null); setError(''); setPosted(false); setStep('') }

  const mType = file?.type || handoff?.type || ''
  const run = async () => {
    setError(''); setRes(null); setPosted(false)
    try {
      let transcript = ''
      if (mType.startsWith('video') && mediaUrl) {
        setStep('Listening to your video…')
        const t = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audioUrl: mediaUrl }) }).then(r => r.json()).catch(() => ({}))
        transcript = typeof t?.transcript === 'string' ? t.transcript : ''
      }
      setStep('Cap checks the plan, Ed writes…')
      const r = await fetch('/api/quick-caption', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context, wants, mediaUrl: mediaUrl || undefined, mediaType: mType || undefined, frames: frames.length ? frames : undefined, transcript: transcript || undefined, accountId: accountId || undefined }) })
      const d = await r.json()
      if (!r.ok || d?.error) setError(d?.error || 'That didn’t work. Try again.')
      else { setRes(d); window.dispatchEvent(new Event('rise-data-changed')) }
    } catch { setError('That didn’t work. Try again.') }
    finally { setStep('') }
  }

  const patch = async (body: Partial<ContentPiece>) => {
    if (!res) return
    const r = await fetch('/api/content', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: res.card.id, ...body }) }).then(x => x.json()).catch(() => null)
    if (r && !r.error) setRes(v => v ? { ...v, card: r } : v)
  }
  const copy = async () => {
    if (!res) return
    try { await navigator.clipboard.writeText(res.card.description ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* no clipboard */ }
  }
  const postIt = async () => {
    if (!res) return
    const r = await fetch('/api/quick-caption', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'post', id: res.card.id }) }).then(x => x.json()).catch(() => null)
    if (r?.card) { setRes(v => v ? { ...v, card: r.card } : v); setPosted(true); window.dispatchEvent(new Event('rise-data-changed')) }
    else setError(r?.error || 'Couldn’t mark it posted. Try again.')
  }

  const busy = !!step
  const ready = (!!context.trim() || !!file || !!mediaUrl) && Object.values(wants).some(Boolean) && pct === null && !busy
  const isVideo = mType.startsWith('video')

  return (
    <section className="rp-card qc" aria-label="Quick Caption">
      <div className="qc-head">
        <h2>Quick Caption</h2>
        {res && <button type="button" className="rp-pill rp-quiet" onClick={reset}>Start over</button>}
      </div>

      {!res && (
        <>
          {/* 1. Media */}
          {!file && !handoff ? (
            <label className="qc-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) accept(f) }}>
              <UploadCloud size={26} aria-hidden />
              <span className="qc-drop-main">Add your photo or video</span>
              <span className="qc-drop-sub">Tap to pick or record · drop it here on a computer · a video gets transcribed</span>
              <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) accept(f) }} />
            </label>
          ) : (
            <div className="qc-media">
              {isVideo ? <video src={preview} muted playsInline controls /> : <img src={preview} alt="" />}
              <div className="qc-media-meta">
                <span>{file?.name ?? handoff?.name}</span>
                <span className="qc-sub">{pct !== null ? `Uploading ${Math.round(pct)}%` : mediaUrl ? 'Uploaded ✓' : 'Not uploaded'}{isVideo && frames.length ? ` · ${frames.length} frames read` : ''}</span>
                {pct !== null && <span className="qc-bar"><span style={{ width: `${pct}%` }} /></span>}
              </div>
              <button type="button" className="qc-x" aria-label="Remove media" onClick={clearMedia}><X size={16} /></button>
            </div>
          )}

          {/* 2. Context */}
          <textarea ref={taRef} className="qc-input" rows={2} value={context} onChange={e => setContext(e.target.value)}
            placeholder="What’s this about? A line or two in your words." aria-label="What's this about?" />

          {/* 3. What she needs */}
          <div className="qc-chips" role="group" aria-label="What do you need?">
            {CHIPS.map(c => (
              <label key={c.k} className={`qc-chip${wants[c.k] ? ' on' : ''}`}>
                <input type="checkbox" checked={wants[c.k]} onChange={e => setWants(w => ({ ...w, [c.k]: e.target.checked }))} />
                {wants[c.k] ? '✓ ' : ''}{c.label}
              </label>
            ))}
          </div>

          <div className="qc-row">
            <select className="qc-select" value={accountId} onChange={e => setAccountId(e.target.value)} aria-label="Account">
              <option value="">Cap picks the account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.handle}</option>)}
            </select>
          </div>

          <button type="button" className="qc-go" disabled={!ready} onClick={run}>
            {busy ? <><Loader2 size={16} className="qc-spin" /> {step}</> : 'Write it'}
          </button>
        </>
      )}

      {busy && <div className="qc-skel" aria-hidden><span /><span /><span /></div>}
      {error && <p className="qc-err" role="alert">{error}</p>}

      {/* Result, in the same card. Already saved as a ready card. */}
      {res && (
        <div className="qc-result">
          <p className="qc-sub">For <b>{res.account.handle}</b>{res.account.why ? ` · ${res.account.why}` : ''}</p>
          {wants.cta && <p className="qc-sub">CTA follows Cap’s plan: {res.cta_basis}</p>}
          {(res.card.onscreen_text ?? '') !== '' && (
            <div><p className="qc-label">On-screen text</p>
              <textarea className="qc-input qc-strong" defaultValue={res.card.onscreen_text} onBlur={e => e.target.value !== res.card.onscreen_text && patch({ onscreen_text: e.target.value })} rows={2} /></div>
          )}
          {(res.card.description ?? '') !== '' && (
            <div><p className="qc-label">Caption{res.card.hashtags ? ' + hashtags' : ''}</p>
              <textarea className="qc-input" defaultValue={res.card.description} onBlur={e => e.target.value !== res.card.description && patch({ description: e.target.value })} rows={6} /></div>
          )}
          {wants.sound && <MusicLine p={res.card} onSaved={c => setRes(v => v ? { ...v, card: c } : v)} />}
          <div className="qc-actions">
            {(res.card.description ?? '') !== '' && <button type="button" className="rp-pill rp-secondary" onClick={copy}>{copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy caption'}</button>}
            <button type="button" className="qc-go qc-post" disabled={posted} onClick={postIt}>{posted ? <><CheckCircle2 size={16} /> Posted · on today’s calendar</> : <><Send size={16} /> Post it</>}</button>
          </div>
          <p className="qc-sub">Saved as a ready card (#{res.card.id}). “Post it” marks it published and puts it on today’s calendar, so Cap counts it and checks how it does.</p>
        </div>
      )}
    </section>
  )
}
