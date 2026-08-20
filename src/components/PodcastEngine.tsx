'use client'
import { useState, useEffect, useRef } from 'react'
import { Loader2, Copy, CheckCircle2, ChevronDown, ChevronUp, Mic, Zap, Save, ImageIcon, PenLine, Sparkles } from 'lucide-react'

interface Deliverables {
  core_takeaway?: string
  emotional_spine?: string
  title: string
  subtitle: string
  questions?: string[]
  chapters?: string[]
  headlines: string[]
  description: string
  seo_description: string
  keywords: string[]
  pull_quotes: string[]
  reels_scripts: { hook: string; script?: string; body: string; cta: string; platform: string }[]
  newsletter_subject: string
  newsletter_body?: string
  medium_article: { title: string; subtitle: string; sections?: { heading: string; body: string }[]; closing?: string; body?: string; sources?: string[] }
  youtube_title: string
  youtube_tags: string[]
  episode_description?: string
  pinterest_pins: { title: string; description: string; image_prompt?: string }[]
  ad_reads: { pre_roll: string; mid_roll: string; post_roll: string }
  manychat_trigger: string
  manychat_dm: string
  share_prompt?: string
  links_footer?: string
  resources?: { name: string; url: string; note: string }[]
  show_links?: { apple: string; spotify: string; youtube: string }
  opt_in?: string
  producer_feedback: {
    overall_grade: string
    verdict?: string
    strengths: string[]
    topic_drift: string
    depth_gaps: string
    too_many_directions: string
    biggest_win: string
    next_episode_suggestion: string
  }
}

// The copy-paste share block — rate/review CTA + where to find the show.
// Rendered at the top (before scroll) and again at the bottom.
const SHOW_LINKS = {
  apple: 'https://podcasts.apple.com/us/podcast/ai-mom/id6786440414',
  spotify: 'https://open.spotify.com/show/033I8hRPjXiKlCHhaq5YYc',
  youtube: 'https://youtube.com/playlist?list=PLZ5DeAJ0I0WI',
}
function shareBlock(links = SHOW_LINKS): string {
  return `⭐ If this episode gave you something, take 10 seconds to rate & review — it's how more moms find the show. Loved it? Share it. Didn't? Comment and tell me why. Either way, join the conversation. 💛

🎧 Listen & follow the AI Mom Podcast:
Apple: ${links.apple}
Spotify: ${links.spotify}
YouTube: ${links.youtube}`
}
// Flatten the structured Medium article into clean copy-ready text (no raw ### symbols).
function mediumBody(m: { sections?: { heading: string; body: string }[]; closing?: string; body?: string }): string {
  if (m.sections?.length) {
    const secs = m.sections.map(s => `${s.heading}\n\n${s.body}`).join('\n\n')
    return m.closing ? `${secs}\n\n${m.closing}` : secs
  }
  return m.body ?? ''
}

// Where people connect with Mandi — shown at the bottom of Episode Identity.
const CONNECT_LINKS: { label: string; url: string }[] = [
  { label: 'Instagram — @mandij0y', url: 'https://instagram.com/mandij0y' },
  { label: 'AI Mom at Work — @aimomatwork', url: 'https://instagram.com/aimomatwork' },
  { label: 'Join the list — aimomeducation.com', url: 'https://aimomeducation.com' },
]
function connectBlock(): string {
  return `💛 Connect with Mandi:\n${CONNECT_LINKS.map(l => `${l.label}: ${l.url}`).join('\n')}`
}

function ShareCard({ links }: { links?: { apple: string; spotify: string; youtube: string } }) {
  const text = shareBlock(links ?? SHOW_LINKS)
  return (
    <div style={{ border: '1px solid var(--purple)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--purple)' }}>⭐ Rate, review & share — paste this everywhere</span>
        <CopyBtn text={text} />
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, padding: '14px', whiteSpace: 'pre-wrap' }}>{text}</p>
    </div>
  )
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-raised)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: copied ? '#3DAA7C' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
      {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
      {label ?? (copied ? 'Copied!' : 'Copy')}
    </button>
  )
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '12px 16px', background: 'var(--surface-raised)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>}
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        <CopyBtn text={value} />
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, fontFamily: mono ? 'monospace' : 'inherit', background: 'var(--surface-raised)', padding: '10px 12px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  )
}

// A generated caption + Copy + Save to Notes. Saved notes are tagged `caption`
// (and `podcast` + the episode) so they're findable via Notes search for "caption".
function CaptionBox({ caption, saveTitle, saveTags }: { caption: string; saveTitle: string; saveTags: string[] }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: saveTitle, body: caption, category: 'script', source: 'rise', tags: saveTags }),
      })
      setSaved(true)
    } catch { /* best-effort */ } finally { setSaving(false) }
  }
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-raised)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{caption}</p>
      <div style={{ display: 'flex', gap: '6px' }}>
        <CopyBtn text={caption} />
        <button onClick={save} disabled={saving || saved}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: saved ? '#EAF7F0' : 'var(--surface)', cursor: saved ? 'default' : 'pointer', fontSize: '11px', fontWeight: 600, color: saved ? '#2E8B60' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {saved ? <CheckCircle2 size={11} /> : <Save size={11} />}
          {saved ? 'Saved to Notes' : saving ? 'Saving…' : 'Save to Notes'}
        </button>
      </div>
    </div>
  )
}

export default function PodcastEngine() {
  const [transcript, setTranscript] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [guestName, setGuestName] = useState('')
  const [timestamps, setTimestamps] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Deliverables | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [riverStatus, setRiverStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [riverMsg, setRiverMsg] = useState('')
  const [audioState, setAudioState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [audioMsg, setAudioMsg] = useState('')
  const [audioDrag, setAudioDrag] = useState(false)
  const [reelState, setReelState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [reelMsg, setReelMsg] = useState('')
  const [reelKey, setReelKey] = useState<string | null>(null)
  const [packState, setPackState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [packMsg, setPackMsg] = useState('')

  // One transcript → faceless + avatar clip + trending (with DIY to-do)
  const threePack = async () => {
    if (!transcript.trim()) return
    setPackState('working')
    try {
      const res = await fetch('/api/podcast/threepack', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, episodeTitle: episodeNumber ? `Episode ${episodeNumber}` : undefined }),
      })
      const d = await res.json()
      if (d.created) {
        setPackState('done')
        setPackMsg(`✓ ${d.created.map((c: { kind: string; account: string }) => `${c.kind} → ${c.account}`).join(' · ')} — review on the account cards. The trending post's to-do is on your task list.`)
      } else { setPackState('error'); setPackMsg(d.error || 'Failed — try again') }
    } catch { setPackState('error'); setPackMsg('Connection failed') }
  }

  // Drop episode audio → stored to Media first (short upload), THEN transcribed from
  // its URL (server compresses big episodes; no giant body + long processing in one
  // request, which is what failed for full-length episodes).
  const handleAudio = async (file: File) => {
    setAudioState('working')
    const mb = (file.size / 1048576).toFixed(1)
    setAudioMsg(`Saving ${file.name} (${mb}MB) to your Media library…`)
    try {
      // 1) Store the episode to Media (R2). Prefer a PRESIGNED direct-to-R2 PUT so
      // big episodes bypass the server's request-body limit; fall back to a
      // through-server multipart upload if the direct PUT can't be used.
      let publicUrl = ''
      let presignNote = '' // why the fast direct-to-R2 path didn't take, for diagnostics
      try {
        const pre = await fetch('/api/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type || 'audio/mpeg', folder: 'audio' }),
        })
        const pd = await pre.json().catch(() => ({}))
        if (pre.ok && pd.uploadUrl && pd.publicUrl) {
          const put = await fetch(pd.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'audio/mpeg' }, body: file })
          if (put.ok) publicUrl = pd.publicUrl
          else presignNote = `direct upload returned ${put.status}`
        } else {
          presignNote = pd.error || `presign returned ${pre.status}`
        }
      } catch (e) {
        // A CORS block surfaces here as a TypeError — the direct PUT never lands.
        presignNote = `direct upload blocked (${e instanceof Error ? e.message : 'network/CORS'})`
      }

      if (!publicUrl) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'audio')
        const up = await fetch('/api/upload', { method: 'POST', body: fd }).catch(() => null)
        const upd = up ? await up.json().catch(() => ({})) : {}
        if (!up || !up.ok || !upd.publicUrl) {
          setAudioState('error')
          const tooBig = file.size > 40 * 1048576
          const sizeHint = tooBig ? ` This episode is ${mb}MB — likely too big for the server fallback; the direct-to-R2 path needs to work.` : ''
          const why = presignNote ? ` (${presignNote}${up ? `; server path ${up.status}` : '; server path unreachable'})` : ''
          setAudioMsg(upd.error || `Upload failed${why}.${sizeHint} Try again, or use “Pull from Media” if it saved.`)
          return
        }
        publicUrl = upd.publicUrl
      }
      const upd = { publicUrl }
      // 2) Transcribe from the stored URL — server fetches + compresses big files itself.
      setAudioMsg(`Saved to Media ✓  Transcribing ${mb}MB — a full episode can take a few minutes…`)
      const res = await fetch('/api/transcribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: upd.publicUrl }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.transcript) {
        setTranscript(d.transcript)
        setAudioState('done')
        setAudioMsg(`✓ Transcribed (${d.transcript.split(/\s+/).length.toLocaleString()} words) · audio saved to Media — hit Generate Everything below.`)
      } else {
        setAudioState('error')
        setAudioMsg(d.error || 'Saved to Media, but transcription failed — paste the transcript manually or use “Pull from Media.”')
      }
    } catch {
      setAudioState('error')
      setAudioMsg('Upload failed — try again or paste the transcript manually.')
    }
  }

  const fileUnderAccounts = async () => {
    if (!result) return
    setRiverStatus('sending')
    const filed: string[] = []
    try {
      // Each reel script becomes its own post-card, sorted to the right account
      for (const [i, s] of (result.reels_scripts ?? []).entries()) {
        setRiverMsg(`Filing reel ${i + 1} of ${result.reels_scripts.length}…`)
        const input = `PODCAST EPISODE${episodeNumber ? ` ${episodeNumber}` : ''}: ${result.title}\n\nREEL SCRIPT (${s.platform}):\nHOOK: ${s.hook}\nBODY: ${s.body}\nCTA: ${s.cta}\n\nEPISODE CONTEXT: ${result.seo_description}\nPULL QUOTE: ${result.pull_quotes?.[i] ?? result.pull_quotes?.[0] ?? ''}`
        const res = await fetch('/api/river', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          // podcast reels belong to the podcast — don't let the sorter scatter them
          body: JSON.stringify({ input, source: 'podcast', accountId: 'aimompodcast' }),
        })
        const d = await res.json()
        if (d.account) filed.push(`${d.account.emoji} ${d.account.handle}`)
      }
      setRiverMsg(filed.length ? `✓ ${filed.length} post-cards filed under: ${[...new Set(filed)].join(', ')} — flip their cards in Accounts to approve.` : 'No reels to file.')
      setRiverStatus('done')
    } catch {
      setRiverMsg('River connection failed — deliverables are still available above.')
      setRiverStatus('done')
    }
  }

  const [deepBusy, setDeepBusy] = useState<null | 'medium' | 'newsletter'>(null)
  const [deepErr, setDeepErr] = useState('')
  const [kitSaved, setKitSaved] = useState(false)
  const [transcriptSaved, setTranscriptSaved] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [audioLib, setAudioLib] = useState<{ key: string; name: string; url: string; size: number; lastModified: string }[]>([])
  const [pullingKey, setPullingKey] = useState<string | null>(null)
  const [pullErr, setPullErr] = useState('')

  // Captions + per-quote actions + pin images (kept out of the big kit so they can be
  // regenerated freely). epCaption = the whole-episode "why you'd listen" caption.
  const [epCaption, setEpCaption] = useState('')
  const [epCapBusy, setEpCapBusy] = useState(false)
  const [epVariety, setEpVariety] = useState(0)
  const [quoteCap, setQuoteCap] = useState<Record<number, string>>({})
  const [quoteCapBusy, setQuoteCapBusy] = useState<number | null>(null)
  const [quotePost, setQuotePost] = useState<Record<number, string>>({})
  const [quotePostBusy, setQuotePostBusy] = useState<number | null>(null)
  const [pinImg, setPinImg] = useState<Record<number, string>>({})
  const [pinBusy, setPinBusy] = useState<number | null>(null)
  const [pinErr, setPinErr] = useState<Record<number, string>>({})

  const epTag = episodeNumber ? `ep-${episodeNumber}` : 'unnumbered'

  // Whole-episode caption: short "why you'd listen" + a rotating tune-in CTA. Each
  // press gives a fresh variation (epVariety bumps the CTA + reroll).
  const genEpisodeCaption = async () => {
    if (!result) return
    setEpCapBusy(true)
    try {
      const r = await fetch('/api/podcast/caption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'episode', title: result.title, takeaway: result.core_takeaway ?? result.subtitle ?? '', variety: epVariety }),
      })
      const d = await r.json()
      if (d.caption) { setEpCaption(d.caption); setEpVariety(v => v + 1) }
    } catch { /* leave prior caption in place */ } finally { setEpCapBusy(false) }
  }

  // A quote is already a great hook — turn it into a caption on tap.
  const writeQuoteCaption = async (i: number, quote: string) => {
    setQuoteCapBusy(i)
    try {
      const r = await fetch('/api/podcast/caption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'quote', quote, title: result?.title ?? '' }),
      })
      const d = await r.json()
      if (d.caption) setQuoteCap(m => ({ ...m, [i]: d.caption }))
    } catch { /* ignore */ } finally { setQuoteCapBusy(null) }
  }

  // …or send the quote (verbatim hook) through the River to become a post-card.
  const makePostFromQuote = async (i: number, quote: string) => {
    setQuotePostBusy(i)
    setQuotePost(m => ({ ...m, [i]: '…' }))
    try {
      const input = `PODCAST QUOTE — use this VERBATIM line as the hook (it's Mandi's own words, already a great hook):\n"${quote}"\n\nEPISODE: ${result?.title ?? ''}\nCONTEXT: ${result?.core_takeaway ?? result?.seo_description ?? ''}`
      const r = await fetch('/api/river', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, accountId: 'aimompodcast', source: 'podcast-quote' }),
      })
      const d = await r.json()
      setQuotePost(m => ({ ...m, [i]: r.ok && d.piece ? `✓ Post drafted for ${d.account?.handle ?? '@aimompodcast'} — approve in Accounts` : (d.error || 'couldn\'t draft') }))
    } catch { setQuotePost(m => ({ ...m, [i]: 'failed — try again' })) } finally { setQuotePostBusy(null) }
  }

  const genPinImage = async (i: number, p: { title: string; description: string; image_prompt?: string }) => {
    setPinBusy(i); setPinErr(m => ({ ...m, [i]: '' }))
    try {
      const r = await fetch('/api/podcast/pin-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p.image_prompt || p.description, title: p.title }),
      })
      const d = await r.json()
      if (d.url) setPinImg(m => ({ ...m, [i]: d.url })); else setPinErr(m => ({ ...m, [i]: d.error || 'failed' }))
    } catch { setPinErr(m => ({ ...m, [i]: 'failed' })) } finally { setPinBusy(null) }
  }

  // ── Persistence: keep the last kit + inputs so she can leave and come back
  // without regenerating. Restore once on mount; skip the first save so we never
  // clobber stored data with the empty initial state before restore lands.
  const STORE_KEY = 'rise-podcast-engine-v1'
  const firstPersist = useRef(true)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      if (s.result) setResult(s.result)
      if (typeof s.transcript === 'string') setTranscript(s.transcript)
      if (typeof s.episodeNumber === 'string') setEpisodeNumber(s.episodeNumber)
      if (typeof s.guestName === 'string') setGuestName(s.guestName)
      if (typeof s.timestamps === 'string') setTimestamps(s.timestamps)
      if (typeof s.epCaption === 'string') setEpCaption(s.epCaption)
      if (s.quoteCap && typeof s.quoteCap === 'object') setQuoteCap(s.quoteCap)
      if (s.pinImg && typeof s.pinImg === 'object') setPinImg(s.pinImg)
    } catch { /* corrupt/absent — start fresh */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (firstPersist.current) { firstPersist.current = false; return }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ result, transcript, episodeNumber, guestName, timestamps, epCaption, quoteCap, pinImg }))
    } catch { /* quota or private mode — non-fatal */ }
  }, [result, transcript, episodeNumber, guestName, timestamps, epCaption, quoteCap, pinImg])

  const clearKit = () => {
    if (typeof window !== 'undefined' && !window.confirm('Clear this episode and its deliverables from the page? Anything you saved to Notes stays.')) return
    setResult(null); setTranscript(''); setEpisodeNumber(''); setGuestName(''); setTimestamps('')
    setEpCaption(''); setEpVariety(0); setQuoteCap({}); setQuotePost({}); setPinImg({}); setPinErr({}); setError(null); setKitSaved(false)
    try { localStorage.removeItem(STORE_KEY) } catch { /* ignore */ }
  }

  const loadAudioLib = async () => {
    setShowMedia(v => !v)
    if (audioLib.length) return
    const d = await fetch('/api/media/list').then(r => r.json()).catch(() => null)
    setAudioLib((d?.files ?? []).filter((f: { type: string }) => f.type === 'audio'))
  }

  // Pull a transcript from an audio file already in Media (Whisper), drop it in the box.
  const transcribeFromMedia = async (f: { key: string; url: string }) => {
    setPullingKey(f.key); setPullErr('')
    try {
      const d = await fetch('/api/transcribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: f.url }),
      }).then(r => r.json()).catch(() => ({ error: 'connection failed' }))
      if (d.transcript) { setTranscript(d.transcript); setShowMedia(false) }
      else setPullErr(d.error || 'Could not transcribe')
    } finally { setPullingKey(null) }
  }

  // Upload an audio file to Media (R2), returning its public URL. Presigned direct
  // PUT first (bypasses the request-body limit), multipart fallback.
  const uploadAudioToMedia = async (file: File): Promise<{ url: string; error?: string }> => {
    let note = ''
    try {
      const pre = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'audio/mpeg', folder: 'audio' }),
      })
      const pd = await pre.json().catch(() => ({}))
      if (pre.ok && pd.uploadUrl && pd.publicUrl) {
        const put = await fetch(pd.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'audio/mpeg' }, body: file })
        if (put.ok) return { url: pd.publicUrl }
        note = `direct upload ${put.status}`
      } else note = pd.error || `presign ${pre.status}`
    } catch (e) { note = `direct upload blocked (${e instanceof Error ? e.message : 'CORS'})` }
    const fd = new FormData(); fd.append('file', file); fd.append('folder', 'audio')
    const up = await fetch('/api/upload', { method: 'POST', body: fd }).catch(() => null)
    const upd = up ? await up.json().catch(() => ({})) : {}
    if (up && up.ok && upd.publicUrl) return { url: upd.publicUrl }
    return { url: '', error: `${note}${up ? `; server ${up.status}` : '; server unreachable'}` }
  }

  // ONE-TAP QUICK REEL — audio → /api/clip does it all: transcribe, write the post
  // (Sonnet 5, account voice), create the card with the audio attached, and fire the
  // captioned HeyGen avatar render. Lands as a card in Accounts.
  const quickReel = async (audioUrl: string, key: string) => {
    setReelKey(key); setReelState('working'); setReelMsg('Transcribing → writing the post → starting your avatar video…')
    try {
      const res = await fetch('/api/clip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl, accountId: 'aimompodcast' }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.piece) {
        setReelState('done')
        const started = d.heygen?.started
        setReelMsg(`✓ Reel #${d.piece.id} created for @aimompodcast — post written${started ? ', avatar video rendering now (it lands on the card in Accounts)' : ' · tap 🎬 Make avatar video on the card to render'}.`)
      } else { setReelState('error'); setReelMsg(d.error || 'Quick Reel failed — try again.') }
    } catch { setReelState('error'); setReelMsg('Connection error — try again.') }
    finally { setReelKey(null) }
  }
  const quickReelFromFile = async (file: File) => {
    setReelKey('drop'); setReelState('working'); setReelMsg(`Uploading ${file.name}…`)
    const { url, error } = await uploadAudioToMedia(file)
    if (!url) { setReelState('error'); setReelMsg(`Upload failed${error ? ` (${error})` : ''} — try again.`); setReelKey(null); return }
    await quickReel(url, 'drop')
  }

  // The full episode kit persists to Notes (storage) so nothing is lost on click-away
  const saveKitToNotes = async (d: Deliverables) => {
    const body = [
      `# ${d.title}`,
      d.subtitle,
      `\n## Headlines\n${(d.headlines ?? []).map(h => `- ${h}`).join('\n')}`,
      `\n## SEO Description\n${d.seo_description}`,
      `\n## Keywords\n${(d.keywords ?? []).join(', ')}`,
      `\n## Show Notes\n${d.description}`,
      d.questions?.length ? `\n## Key questions we ask\n${d.questions.map(q => `- ${q}`).join('\n')}` : '',
      d.chapters?.length ? `\n## Chapters / timestamps\n${d.chapters.join('\n')}` : '',
      `\n## Pull Quotes\n${(d.pull_quotes ?? []).map(q => `> "${q}"`).join('\n')}`,
      `\n## Reels Scripts\n${(d.reels_scripts ?? []).map((s, i) => `### Reel ${i + 1} (${s.platform})\nHOOK: ${s.hook}${s.script ? `\nSCRIPT (record word-for-word): ${s.script}` : ''}\nVISUAL/BODY: ${s.body}\nCTA: ${s.cta}`).join('\n\n')}`,
      `\n## Newsletter (Substack)\nSubject: ${d.newsletter_subject}\n\n${d.newsletter_body ?? ''}`,
      d.medium_article ? `\n## Medium Article\n# ${d.medium_article.title}\n*${d.medium_article.subtitle}*\n\n${mediumBody(d.medium_article)}` : '',
      `\n## Episode description (YouTube / Spotify / Apple — same everywhere)\n${d.episode_description ?? ''}`,
      d.youtube_title ? `\n## YouTube title + tags\n${d.youtube_title}\nTags: ${(d.youtube_tags ?? []).join(', ')}` : '',
      d.ad_reads ? `\n## Ad Reads\nPRE-ROLL: ${d.ad_reads.pre_roll}\n\nMID-ROLL: ${d.ad_reads.mid_roll}\n\nPOST-ROLL: ${d.ad_reads.post_roll}` : '',
      `\n## Pinterest Pins\n${(d.pinterest_pins ?? []).map(p => `- ${p.title}: ${p.description}`).join('\n')}`,
      d.manychat_trigger ? `\n## ManyChat\nTrigger: ${d.manychat_trigger}\nDM: ${d.manychat_dm}` : '',
      d.share_prompt ? `\n## Rate, review & share\n${d.share_prompt}` : '',
      d.producer_feedback ? `\n## Producer Feedback\nGrade: ${d.producer_feedback.overall_grade}${d.producer_feedback.verdict ? ` — ${d.producer_feedback.verdict}` : ''}\nStrengths: ${(d.producer_feedback.strengths ?? []).join('; ')}\nTopic drift: ${d.producer_feedback.topic_drift}\nDepth gaps: ${d.producer_feedback.depth_gaps}\nBiggest win: ${d.producer_feedback.biggest_win}\nNext episode: ${d.producer_feedback.next_episode_suggestion}` : '',
      d.links_footer ? `\n## Follow / find us (paste-ready)\n${d.links_footer}` : '',
    ].filter(Boolean).join('\n')
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `🎙 Ep ${episodeNumber || '?'} Deliverables Kit — ${d.title}`,
          body,
          category: 'script',
          source: 'rise',
          tags: ['podcast', 'episode-kit', episodeNumber ? `ep-${episodeNumber}` : 'unnumbered'],
          pinned: false,
        }),
      })
      setKitSaved(true)
    } catch { /* kit save is best-effort; content stays on screen */ }
  }

  // Second note: the raw transcript on its own, so it's kept + searchable apart from the kit.
  const saveTranscriptToNotes = async (episodeTitle: string) => {
    if (!transcript.trim()) return
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `📄 Ep ${episodeNumber || '?'} Transcript — ${episodeTitle}`,
          body: transcript,
          category: 'idea',
          tags: ['podcast', 'transcript', episodeNumber ? `ep-${episodeNumber}` : 'unnumbered'],
          pinned: false,
        }),
      })
    } catch { /* best-effort */ }
  }

  const generate = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setKitSaved(false)
    try {
      const res = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, episodeNumber, guestName, timestamps }),
      })
      const data = await res.json()
      if (data.deliverables) {
        setResult(data.deliverables)
        saveKitToNotes(data.deliverables)
        saveTranscriptToNotes(data.deliverables.title ?? `Episode ${episodeNumber || ''}`.trim())
      }
      else setError(data.error ?? 'Something went wrong')
    } catch {
      setError('Connection error — check Railway is running')
    } finally {
      setLoading(false)
    }
  }

  // Deep, on-demand regeneration of the two heavy deliverables:
  //  • medium  — runs live web research → journalism with real numbers + her stories
  //  • newsletter — pulls her past episodes → weaves the bigger picture
  const regenDeep = async (kind: 'medium' | 'newsletter') => {
    if (!transcript.trim() || !result) return
    setDeepBusy(kind); setDeepErr('')
    try {
      const res = await fetch('/api/podcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: kind, transcript, episodeNumber, guestName, title: result.title, core_takeaway: result.core_takeaway }),
      })
      const d = await res.json()
      if (kind === 'medium' && d.medium_article) setResult(r => (r ? { ...r, medium_article: d.medium_article } : r))
      else if (kind === 'newsletter' && (d.newsletter_body || d.newsletter_subject)) setResult(r => (r ? { ...r, newsletter_subject: d.newsletter_subject ?? r.newsletter_subject, newsletter_body: d.newsletter_body ?? r.newsletter_body } : r))
      else setDeepErr(d.error ?? 'Came back empty — try again')
    } catch {
      setDeepErr('Connection error — try again')
    } finally {
      setDeepBusy(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Podcast Engine</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Paste your transcript → get every deliverable you need to publish and promote the episode.</p>
      </div>

      {/* Input */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Episode Number</label>
            <input value={episodeNumber} onChange={e => setEpisodeNumber(e.target.value)} placeholder="e.g. 12"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Guest Name (if any)</label>
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Leave blank for solo episode"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px' }} />
          </div>
        </div>

        {/* Audio dropbox — episode file in, transcript out */}
        <div
          onDragOver={e => { e.preventDefault(); setAudioDrag(true) }}
          onDragLeave={() => setAudioDrag(false)}
          onDrop={e => { e.preventDefault(); setAudioDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleAudio(f); else { setAudioState('error'); setAudioMsg('No file detected in that drop — try again, or click to browse.') } }}>
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '18px', borderRadius: '12px', border: `2px dashed ${audioDrag ? 'var(--purple)' : 'var(--border)'}`, cursor: audioState === 'working' ? 'default' : 'pointer', background: audioDrag ? 'rgba(107,45,110,0.05)' : 'var(--surface-raised)', transition: 'all 0.15s' }}>
            {audioState === 'working'
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--purple)' }}><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {audioMsg}</span>
              : <>
                  <Mic size={20} style={{ color: audioDrag ? 'var(--purple)' : 'var(--text-subtle)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Drop your episode audio here</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>MP3/M4A/WAV — full episodes welcome; saved to Media, then auto-compressed &amp; transcribed</span>
                </>}
            <input type="file" accept="audio/*,video/*,.mp3,.m4a,.wav,.aac,.ogg,.mp4,.mov,.m4v,.webm" style={{ display: 'none' }} disabled={audioState === 'working'} onChange={e => { const f = e.target.files?.[0]; if (f) handleAudio(f); e.target.value = '' }} />
          </label>
          {audioState !== 'idle' && audioState !== 'working' && (
            <p style={{ fontSize: '12px', marginTop: '6px', fontWeight: 600, color: audioState === 'done' ? '#3DAA7C' : '#E05252' }}>{audioMsg}</p>
          )}
          <button onClick={loadAudioLib}
            style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>
            🎧 {showMedia ? 'Hide' : 'Or pull an old episode from Media →'}
          </button>
          {showMedia && (
            <div style={{ marginTop: '8px', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '260px', overflowY: 'auto' }}>
              {audioLib.length === 0 && <p style={{ fontSize: '11px', color: 'var(--text-subtle)', padding: '6px' }}>No audio in Media, or still loading…</p>}
              {audioLib.map(f => {
                const mb = f.size / 1048576
                const tooBig = mb > 25
                return (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 9px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>{mb.toFixed(1)} MB · {f.lastModified ? new Date(f.lastModified).toLocaleDateString() : ''}{tooBig ? ' · over 25MB — use Riverside' : ''}</p>
                    </div>
                    <button onClick={() => transcribeFromMedia(f)} disabled={pullingKey !== null || tooBig}
                      style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '6px', border: 'none', background: tooBig ? 'var(--border)' : 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: tooBig ? 'not-allowed' : 'pointer', opacity: tooBig ? 0.6 : 1 }}>
                      {pullingKey === f.key ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Transcribe'}
                    </button>
                    <button onClick={() => quickReel(f.url, f.key)} disabled={reelKey !== null} title="Turn this clip into a captioned avatar reel + post for @aimompodcast"
                      style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--hot-pink)', background: 'transparent', color: 'var(--hot-pink)', fontWeight: 700, fontSize: '11px', cursor: reelKey !== null ? 'default' : 'pointer' }}>
                      {reelKey === f.key ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : '🎬 Reel'}
                    </button>
                  </div>
                )
              })}
              {pullErr && <p style={{ fontSize: '11px', color: '#E05252', padding: '4px 6px' }}>⚠ {pullErr}</p>}
            </div>
          )}

          {/* ONE-TAP QUICK REEL — drop a short clip, get a captioned avatar video + post */}
          <div style={{ marginTop: '12px', border: '1px solid var(--hot-pink)', borderRadius: '12px', padding: '12px', background: 'rgba(232,68,138,0.05)' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--hot-pink)', margin: 0 }}>🎬 Quick Reel — 30-sec episode post, one tap</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 9px' }}>Drop a short voice clip → RISE transcribes it, writes the post in @aimompodcast&apos;s voice, and renders a captioned avatar video in your voice. Lands as a card in Accounts.</p>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: 'none', background: reelState === 'working' ? 'var(--border)' : 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: reelState === 'working' ? 'default' : 'pointer' }}>
              {reelState === 'working' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Building your reel…</> : '🎬 Drop a clip → make my reel'}
              <input type="file" accept="audio/*,video/*,.mp3,.m4a,.wav,.aac,.ogg,.mp4,.mov,.m4v,.webm" style={{ display: 'none' }} disabled={reelState === 'working'} onChange={e => { const f = e.target.files?.[0]; if (f) quickReelFromFile(f); e.target.value = '' }} />
            </label>
            {reelMsg && <p style={{ fontSize: '11.5px', marginTop: '8px', fontWeight: 600, lineHeight: 1.5, color: reelState === 'done' ? '#3DAA7C' : reelState === 'error' ? '#E05252' : 'var(--text-muted)' }}>{reelMsg}</p>}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Transcript</label>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
            placeholder="Paste your full episode transcript here. The station will generate show notes, SEO, 3 Reels scripts, newsletter, YouTube description, Pinterest pins, ad reads, ManyChat funnel, and more."
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', resize: 'vertical', minHeight: '180px', fontFamily: 'inherit', lineHeight: 1.6 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{transcript.length.toLocaleString()} characters · Fable reads the whole episode</p>
            {transcript.trim() && (
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                <CopyBtn text={transcript} label="Copy transcript" />
                <button onClick={async () => { await saveTranscriptToNotes(`Episode ${episodeNumber || ''}`.trim()); setTranscriptSaved(true); setTimeout(() => setTranscriptSaved(false), 2500) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: transcriptSaved ? '#EAF7F0' : 'var(--surface-raised)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: transcriptSaved ? '#3DAA7C' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {transcriptSaved ? <><CheckCircle2 size={11} /> Saved to Notes</> : <><Mic size={11} /> Save transcript</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={generate} disabled={loading || !transcript.trim()}
          style={{ padding: '12px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: !transcript.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating all deliverables...</> : <><Zap size={15} /> Generate Everything</>}
        </button>
        <button onClick={threePack} disabled={packState === 'working' || !transcript.trim()}
          style={{ padding: '12px', background: 'transparent', color: 'var(--purple)', border: '2px solid var(--purple)', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: packState === 'working' ? 'not-allowed' : 'pointer', opacity: !transcript.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {packState === 'working' ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Building the 3-pack…</> : <>🎁 3-Post Pack — faceless · avatar clip · trending + to-do</>}
        </button>
        {packState !== 'idle' && packState !== 'working' && (
          <p style={{ fontSize: '12px', fontWeight: 600, color: packState === 'done' ? '#3DAA7C' : '#E05252' }}>{packMsg}</p>
        )}
      </div>

      {error && <div style={{ padding: '14px', background: '#FEF5EA', borderRadius: '10px', fontSize: '13px', color: '#F2A65A', fontWeight: 600 }}>⚠ {error}</div>}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* This kit is restored automatically on return — no re-generating. Start fresh when you're done. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>💾 This episode stays here when you leave — come back anytime to keep working. No re-generating.</span>
            <button onClick={clearKit}
              style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🆕 Start new episode
            </button>
          </div>

          {/* Kit saved confirmation */}
          {kitSaved && (
            <div style={{ background: 'rgba(61,170,124,0.08)', border: '1px solid rgba(61,170,124,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#3DAA7C', fontWeight: 600 }}>
              💾 Full episode kit saved to <strong>Notes</strong> — everything on this screen is stored there permanently, even after you click away.
            </div>
          )}

          {/* Send reels through the river */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--purple)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--purple)' }}>🌊 File under accounts</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{riverMsg || `Send the ${result.reels_scripts?.length ?? 0} reel scripts through the River — each becomes a post-card under the best account, ready for approval.`}</p>
            </div>
            <button onClick={fileUnderAccounts} disabled={riverStatus === 'sending'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: riverStatus === 'done' ? '#3DAA7C' : 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
              {riverStatus === 'sending' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Filing…</> : riverStatus === 'done' ? <><CheckCircle2 size={13} /> Filed</> : <><Zap size={13} /> Compose & File</>}
            </button>
          </div>

          {/* 🎯 What RISE heard — the extracted takeaway (quality check: did it get the episode?) */}
          {(result.core_takeaway || result.emotional_spine) && (
            <div style={{ border: '1px solid var(--border)', borderLeft: '3px solid #3DAA7C', borderRadius: '10px', padding: '12px 14px', background: 'var(--surface-raised)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>🎯 What RISE heard in this episode</span>
              {result.core_takeaway && <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.55 }}><strong style={{ color: '#2E8B60' }}>Takeaway:</strong> {result.core_takeaway}</p>}
              {result.emotional_spine && <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.55 }}><strong style={{ color: 'var(--text)' }}>Heart:</strong> {result.emotional_spine}</p>}
              <p style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>If this misses the point, regenerate — everything below is built from this.</p>
            </div>
          )}

          {/* ✍️ Episode caption — short "why you'd listen" + a tune-in CTA. Regenerate for variations. */}
          <div style={{ border: '1px solid var(--purple)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--purple)' }}>✍️ Episode caption — short, why you&rsquo;d listen + tune-in CTA</span>
              <button onClick={genEpisodeCaption} disabled={epCapBusy}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'var(--purple)', cursor: epCapBusy ? 'default' : 'pointer', fontSize: '11px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                {epCapBusy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <PenLine size={12} />}
                {epCapBusy ? 'Writing…' : epCaption ? 'Regenerate caption' : 'Write caption'}
              </button>
            </div>
            <div style={{ padding: '12px 14px' }}>
              {epCaption
                ? <CaptionBox caption={epCaption} saveTitle={`📝 Caption — ${result.title}`} saveTags={['caption', 'captions', 'podcast', epTag]} />
                : <p style={{ fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>A short caption that paraphrases why someone would want this episode, ending in a rotating &ldquo;tune in / follow along / on Spotify, YouTube &amp; Apple — link in bio&rdquo; CTA. Hit <strong>Write caption</strong>, then <strong>Regenerate</strong> for a fresh variation. Save any you like to Notes (search &ldquo;caption&rdquo;).</p>}
            </div>
          </div>

          {/* ⭐ TOP — listen, rate & review (before she scrolls) */}
          <ShareCard links={result.show_links} />

          {/* Episode Identity — now holds show notes, questions, and connect links */}
          <Section title="📌 Episode Identity" defaultOpen>
            <Field label="Title" value={result.title} />
            <Field label="Subtitle" value={result.subtitle} />
            <Field label="📝 Show Notes" value={result.description} />
            {(result.questions?.length ?? 0) > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>❓ Key questions we ask</p>
                  <CopyBtn text={(result.questions ?? []).map(q => `• ${q}`).join('\n')} label="Copy all" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {result.questions!.map((q, i) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '6px 10px', background: 'var(--surface-raised)', borderRadius: '8px', borderLeft: '3px solid var(--purple)' }}>{q}</p>
                  ))}
                </div>
              </div>
            )}
            {(result.chapters?.length ?? 0) > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⏱ Chapters (tied to the title)</p>
                  <CopyBtn text={(result.chapters ?? []).join('\n')} label="Copy all" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {result.chapters!.map((c, i) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '5px 10px', background: 'var(--surface-raised)', borderRadius: '8px', fontVariantNumeric: 'tabular-nums' }}>{c}</p>
                  ))}
                </div>
              </div>
            )}
            <Field label="SEO Description (150 chars)" value={result.seo_description} />
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Keywords</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {result.keywords?.map((k, i) => <span key={i} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: 'var(--purple-light)', color: 'var(--purple)', fontWeight: 600 }}>{k}</span>)}
              </div>
            </div>
            <Field label="💛 Connect with Mandi (episode footer)" value={connectBlock()} />
          </Section>

          {/* Headlines */}
          <Section title="🔥 Scroll-Stopping Headlines" defaultOpen>
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '6px' }}>5 options — pick one or mix and match for different platforms</p>
            {result.headlines?.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: '8px', borderLeft: '3px solid var(--purple)' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>{h}</p>
                <CopyBtn text={h} />
              </div>
            ))}
          </Section>

          {/* Pull Quotes — your own words are your best hooks */}
          <Section title="💬 Pull Quotes (your words = your best hooks)">
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '2px' }}>These are lifted verbatim from your episode. Write a caption around one, or send it through the River as a post — the quote becomes the hook.</p>
            {result.pull_quotes?.map((q, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.5 }}>&ldquo;{q}&rdquo;</p>
                  <CopyBtn text={`"${q}"`} />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={() => writeQuoteCaption(i, q)} disabled={quoteCapBusy === i}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--purple)', background: 'var(--surface)', cursor: quoteCapBusy === i ? 'default' : 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--purple)' }}>
                    {quoteCapBusy === i ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <PenLine size={11} />}
                    {quoteCapBusy === i ? 'Writing…' : 'Write caption'}
                  </button>
                  <button onClick={() => makePostFromQuote(i, q)} disabled={quotePostBusy === i}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: 'none', background: 'var(--purple)', cursor: quotePostBusy === i ? 'default' : 'pointer', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
                    {quotePostBusy === i ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
                    {quotePostBusy === i ? 'Drafting…' : 'Generate post'}
                  </button>
                  {quotePost[i] && quotePost[i] !== '…' && (
                    <span style={{ fontSize: '11px', color: quotePost[i].startsWith('✓') ? '#2E8B60' : '#C0392B', alignSelf: 'center' }}>{quotePost[i]}</span>
                  )}
                </div>
                {quoteCap[i] && (
                  <CaptionBox caption={quoteCap[i]} saveTitle={`📝 Caption — ${result.title} (quote ${i + 1})`} saveTags={['caption', 'captions', 'podcast', epTag]} />
                )}
              </div>
            ))}
          </Section>

          {/* Timestamps — pasted from Riverside */}
          <Section title="⏱ Timestamps (paste from Riverside)">
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '6px' }}>Riverside gives you the chapter timestamps — paste them here and they ride along in the full copy.</p>
            <textarea value={timestamps} onChange={e => setTimestamps(e.target.value)}
              placeholder={"00:02 - Mom brain stories\n04:23 - AI as a reflection of consciousness\n…"}
              style={{ width: '100%', minHeight: '110px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical' }} />
            {timestamps.trim() && <CopyBtn text={timestamps} label="Copy timestamps" />}
          </Section>

          {/* Reels Scripts */}
          <Section title="🎬 3 Reels Scripts (ready to record)">
            {result.reels_scripts?.map((s, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: 'var(--purple-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)' }}>{s.platform}</span>
                  <CopyBtn text={`${s.hook}\n\n${s.script ?? s.body}\n\n${s.cta}`} />
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '3px' }}>Hook (on-screen)</p><p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{s.hook}</p></div>
                  {s.script && (
                    <div style={{ border: '1px solid var(--purple)', borderRadius: '8px', padding: '9px 11px', background: 'var(--surface-raised)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎙 Script — record this, word for word</p>
                        <CopyBtn text={s.script} />
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.script}</p>
                    </div>
                  )}
                  <div><p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '3px' }}>{s.script ? 'Visual / framing' : 'Body'}</p><p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.body}</p></div>
                  <div style={{ padding: '8px 10px', background: 'var(--purple-light)', borderRadius: '6px' }}><p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--purple)', marginBottom: '2px' }}>CTA</p><p style={{ fontSize: '12px', color: 'var(--text)' }}>{s.cta}</p></div>
                </div>
              </div>
            ))}
          </Section>

          {/* 📻 The one episode description — paste to YouTube / Spotify / Apple. Hard 4000-char cap. */}
          {(() => {
            const links = result.show_links ?? SHOW_LINKS
            const resourceLines = (result.resources ?? []).filter(r => r.name).map(r => `• ${r.name}${r.url ? ` — ${r.url}` : ''}`).join('\n')
            const full = [
              (result.episode_description ?? result.description ?? '').trim(),
              '⭐ Rate, review & share if this gave you something — comment if it didn\'t. Join the conversation. 💛',
              timestamps.trim() ? `TIMESTAMPS:\n${timestamps.trim()}` : '',
              resourceLines ? `RESOURCES & LINKS:\n${resourceLines}` : '',
              `LISTEN & FOLLOW:\nApple: ${links.apple}\nSpotify: ${links.spotify}\nYouTube: ${links.youtube}`,
              connectBlock(),
            ].filter(Boolean).join('\n\n')
            const over = full.length > 4000
            return (
              <Section title="📻 Episode description — YouTube / Spotify / Apple (same everywhere)" defaultOpen>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: over ? '#E05252' : '#3DAA7C' }}>{full.length.toLocaleString()} / 4,000 characters {over ? '— over the limit, trim it' : '✓ fits'}</span>
                  <CopyBtn text={full} label="Copy full description" />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, background: 'var(--surface-raised)', padding: '14px', borderRadius: '8px', whiteSpace: 'pre-wrap', border: over ? '1px solid #E05252' : '1px solid var(--border)' }}>{full}</p>
                {result.youtube_title && (
                  <>
                    <Field label="YouTube title (SEO)" value={result.youtube_title} />
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>YouTube tags</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {result.youtube_tags?.map((t, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'var(--surface-raised)', color: 'var(--text-subtle)' }}>{t}</span>)}
                      </div>
                    </div>
                  </>
                )}
              </Section>
            )
          })()}

          {/* Resources & Links mentioned in the episode */}
          {(result.resources?.length ?? 0) > 0 && (
            <Section title="🔗 Resources & Links (mentioned in the episode)">
              {result.resources!.filter(r => r.name).map((r, i) => (
                <div key={i} style={{ padding: '9px 12px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple)' }}>{r.name}</a> : r.name}</p>
                  {r.note && <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.note}</p>}
                </div>
              ))}
            </Section>
          )}

          {/* Medium Article — formatted from sections (no raw ### symbols) */}
          <Section title="✍️ Medium Article (researched + long-form)">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => regenDeep('medium')} disabled={deepBusy === 'medium'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: 'none', background: deepBusy === 'medium' ? 'var(--border)' : 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: deepBusy === 'medium' ? 'default' : 'pointer' }}>
                {deepBusy === 'medium' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Researching + writing (~2 min)…</> : '📰 Write the deep researched article'}
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Runs live research → real numbers + your stories, journalism-style.</span>
            </div>
            {deepErr && deepBusy !== 'medium' && <p style={{ fontSize: '12px', color: 'var(--hot-pink)', marginBottom: '8px' }}>{deepErr}</p>}
            {result.medium_article && (
              <>
                <Field label="Article Title" value={result.medium_article.title} />
                <Field label="Subtitle / Deck" value={result.medium_article.subtitle} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Article Body</p>
                    <CopyBtn text={`# ${result.medium_article.title}\n\n*${result.medium_article.subtitle}*\n\n${mediumBody(result.medium_article)}`} label="Copy full article" />
                  </div>
                  <div style={{ background: 'var(--surface-raised)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.medium_article.sections?.length ? (
                      <>
                        {result.medium_article.sections.map((sec, i) => (
                          <div key={i}>
                            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>{sec.heading}</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{sec.body}</p>
                          </div>
                        ))}
                        {result.medium_article.closing && <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.medium_article.closing}</p>}
                      </>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.medium_article.body}</p>
                    )}
                    {!!result.medium_article.sources?.length && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Sources</p>
                        {result.medium_article.sources.map((s, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, wordBreak: 'break-word' }}>{i + 1}. {s}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* Newsletter */}
          <Section title="📧 Newsletter (Substack)">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => regenDeep('newsletter')} disabled={deepBusy === 'newsletter'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: 'none', background: deepBusy === 'newsletter' ? 'var(--border)' : 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: deepBusy === 'newsletter' ? 'default' : 'pointer' }}>
                {deepBusy === 'newsletter' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Writing…</> : '✉️ Write the newsletter (weaves past episodes)'}
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Pulls your past episodes to connect the bigger picture.</span>
            </div>
            {deepErr && deepBusy !== 'newsletter' && <p style={{ fontSize: '12px', color: 'var(--hot-pink)', marginBottom: '8px' }}>{deepErr}</p>}
            <Field label="Subject Line" value={result.newsletter_subject} />
            {result.newsletter_body && <Field label="Full Issue" value={result.newsletter_body} />}
          </Section>

          {/* Rate/review/share + paste-ready social footer */}
          {(result.share_prompt || result.links_footer) && (
            <Section title="🔗 Share + Links (paste-ready for Riverside)">
              {result.share_prompt && <Field label="Rate, review & send to a friend" value={result.share_prompt} />}
              {result.links_footer && <Field label="Follow / find us (bare URLs — auto-link on paste)" value={result.links_footer} />}
            </Section>
          )}

          {/* Pinterest */}
          <Section title="📌 Pinterest Pins">
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '2px' }}>Each pin has a suggested image. Hit <strong>Generate image</strong> to make a tall 2:3 pin visual (saved to Media).</p>
            {result.pinterest_pins?.map((p, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{p.title}</p>
                  <CopyBtn text={`${p.title}\n\n${p.description}`} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.description}</p>
                {p.image_prompt && <p style={{ fontSize: '11px', color: 'var(--text-subtle)', lineHeight: 1.5, marginTop: '5px', fontStyle: 'italic' }}>🎨 Suggested image: {p.image_prompt}</p>}
                {pinImg[i] ? (
                  <div style={{ marginTop: '8px' }}>
                    <img src={pinImg[i]} alt={p.title} style={{ width: '140px', borderRadius: '8px', border: '1px solid var(--border)', display: 'block' }} />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
                      <CopyBtn text={pinImg[i]} label="Copy image URL" />
                      <button onClick={() => genPinImage(i, p)} disabled={pinBusy === i}
                        style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', cursor: pinBusy === i ? 'default' : 'pointer' }}>
                        {pinBusy === i ? 'Regenerating…' : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => genPinImage(i, p)} disabled={pinBusy === i}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '7px', border: '1px solid var(--purple)', background: 'var(--surface)', cursor: pinBusy === i ? 'default' : 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--purple)' }}>
                      {pinBusy === i ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ImageIcon size={12} />}
                      {pinBusy === i ? 'Generating…' : 'Generate image'}
                    </button>
                    {pinErr[i] && <span style={{ fontSize: '11px', color: '#C0392B' }}>{pinErr[i]}</span>}
                  </div>
                )}
              </div>
            ))}
          </Section>

          {/* Ad Reads */}
          <Section title="📣 Ad Reads (→ aimomeducation.com)">
            <Field label="Pre-Roll (15 sec)" value={result.ad_reads?.pre_roll} />
            <Field label="Mid-Roll (30 sec)" value={result.ad_reads?.mid_roll} />
            <Field label="Post-Roll (10 sec)" value={result.ad_reads?.post_roll} />
          </Section>

          {/* ManyChat */}
          <Section title="💬 ManyChat Funnel">
            <div style={{ padding: '10px 12px', background: 'var(--purple-light)', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--purple)', marginBottom: '3px' }}>Trigger Word</p>
              <p style={{ fontSize: '16px', fontWeight: 900, color: 'var(--purple)' }}>{result.manychat_trigger}</p>
            </div>
            <Field label="Auto-DM Message" value={result.manychat_dm} />
          </Section>

          {/* Producer Feedback */}
          {result.producer_feedback && (
            <Section title="🎙 Producer Feedback">
              <div style={{ padding: '14px', background: 'var(--surface-raised)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '40px', fontWeight: 900, color: 'var(--purple)', lineHeight: 1, minWidth: '54px', textAlign: 'center' }}>{result.producer_feedback.overall_grade}</span>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Episode grade</p>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, fontWeight: 600 }}>{result.producer_feedback.verdict ?? ''}</p>
                </div>
              </div>

              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>What worked</p>
                {result.producer_feedback.strengths?.map((s, i) => (
                  <div key={i} style={{ padding: '7px 12px', marginBottom: '4px', background: '#F0FAF5', borderRadius: '8px', borderLeft: '3px solid #3DAA7C', fontSize: '13px', color: '#2D6B4F' }}>✓ {s}</div>
                ))}
              </div>

              <div style={{ padding: '12px 14px', background: '#FFF8EE', borderRadius: '10px', borderLeft: '3px solid #F2A65A' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#C47A1A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Topic Drift</p>
                <p style={{ fontSize: '13px', color: '#7A4A00', lineHeight: 1.5 }}>{result.producer_feedback.topic_drift}</p>
              </div>

              <div style={{ padding: '12px 14px', background: '#FFF3F3', borderRadius: '10px', borderLeft: '3px solid #E57373' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#C62828', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Depth Gaps — listeners wanted more</p>
                <p style={{ fontSize: '13px', color: '#7A0000', lineHeight: 1.5 }}>{result.producer_feedback.depth_gaps}</p>
              </div>

              {result.producer_feedback.too_many_directions && (
                <div style={{ padding: '12px 14px', background: '#F5F0FF', borderRadius: '10px', borderLeft: '3px solid var(--purple)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Too many directions</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{result.producer_feedback.too_many_directions}</p>
                </div>
              )}

              <div style={{ padding: '12px 14px', background: 'var(--purple-light)', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Biggest Win</p>
                <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>⭐ {result.producer_feedback.biggest_win}</p>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--surface-raised)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Next Episode Idea</p>
                <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>🎙 {result.producer_feedback.next_episode_suggestion}</p>
              </div>
            </Section>
          )}

          {/* ⭐ BOTTOM — rate & review again on the way out */}
          <ShareCard links={result.show_links} />
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
