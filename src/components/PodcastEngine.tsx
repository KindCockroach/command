'use client'
import { useState } from 'react'
import { Loader2, Copy, CheckCircle2, ChevronDown, ChevronUp, Mic, Zap } from 'lucide-react'

interface Deliverables {
  title: string
  subtitle: string
  questions?: string[]
  headlines: string[]
  description: string
  seo_description: string
  keywords: string[]
  pull_quotes: string[]
  reels_scripts: { hook: string; body: string; cta: string; platform: string }[]
  newsletter_subject: string
  newsletter_body?: string
  medium_article: { title: string; subtitle: string; sections?: { heading: string; body: string }[]; closing?: string; body?: string }
  youtube_title: string
  youtube_tags: string[]
  episode_description?: string
  pinterest_pins: { title: string; description: string; image_prompt?: string }[]
  ad_reads: { pre_roll: string; mid_roll: string; post_roll: string }
  manychat_trigger: string
  manychat_dm: string
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

  // Drop episode audio → stored to Media library + transcribed → transcript box fills itself
  const handleAudio = async (file: File) => {
    setAudioState('working')
    setAudioMsg(`Uploading & transcribing ${file.name} (${(file.size / 1048576).toFixed(1)}MB)…`)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const d = await res.json()
      if (d.transcript) {
        setTranscript(d.transcript)
        setAudioState('done')
        setAudioMsg(`✓ Transcribed (${d.transcript.split(/\s+/).length.toLocaleString()} words)${d.publicUrl ? ' · audio saved to Media library' : ''} — hit Generate Everything below.`)
      } else {
        setAudioState('error')
        setAudioMsg(d.error || 'Transcription failed — paste the transcript manually.')
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

  const [kitSaved, setKitSaved] = useState(false)
  const [transcriptSaved, setTranscriptSaved] = useState(false)

  // The full episode kit persists to Notes (storage) so nothing is lost on click-away
  const saveKitToNotes = async (d: Deliverables) => {
    const body = [
      `# ${d.title}`,
      d.subtitle,
      `\n## Headlines\n${(d.headlines ?? []).map(h => `- ${h}`).join('\n')}`,
      `\n## SEO Description\n${d.seo_description}`,
      `\n## Keywords\n${(d.keywords ?? []).join(', ')}`,
      `\n## Show Notes\n${d.description}`,
      d.questions?.length ? `\n## Questions we explore\n${d.questions.map(q => `- ${q}`).join('\n')}` : '',
      `\n## Pull Quotes\n${(d.pull_quotes ?? []).map(q => `> "${q}"`).join('\n')}`,
      `\n## Reels Scripts\n${(d.reels_scripts ?? []).map((s, i) => `### Reel ${i + 1} (${s.platform})\nHOOK: ${s.hook}\nBODY: ${s.body}\nCTA: ${s.cta}`).join('\n\n')}`,
      `\n## Newsletter (Substack)\nSubject: ${d.newsletter_subject}\n\n${d.newsletter_body ?? ''}`,
      d.medium_article ? `\n## Medium Article\n# ${d.medium_article.title}\n*${d.medium_article.subtitle}*\n\n${mediumBody(d.medium_article)}` : '',
      `\n## Episode description (YouTube / Spotify / Apple — same everywhere)\n${d.episode_description ?? ''}`,
      d.youtube_title ? `\n## YouTube title + tags\n${d.youtube_title}\nTags: ${(d.youtube_tags ?? []).join(', ')}` : '',
      d.ad_reads ? `\n## Ad Reads\nPRE-ROLL: ${d.ad_reads.pre_roll}\n\nMID-ROLL: ${d.ad_reads.mid_roll}\n\nPOST-ROLL: ${d.ad_reads.post_roll}` : '',
      `\n## Pinterest Pins\n${(d.pinterest_pins ?? []).map(p => `- ${p.title}: ${p.description}`).join('\n')}`,
      d.manychat_trigger ? `\n## ManyChat\nTrigger: ${d.manychat_trigger}\nDM: ${d.manychat_dm}` : '',
      d.producer_feedback ? `\n## Producer Feedback\nGrade: ${d.producer_feedback.overall_grade}${d.producer_feedback.verdict ? ` — ${d.producer_feedback.verdict}` : ''}\nStrengths: ${(d.producer_feedback.strengths ?? []).join('; ')}\nTopic drift: ${d.producer_feedback.topic_drift}\nDepth gaps: ${d.producer_feedback.depth_gaps}\nBiggest win: ${d.producer_feedback.biggest_win}\nNext episode: ${d.producer_feedback.next_episode_suggestion}` : '',
    ].filter(Boolean).join('\n')
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `🎙 Ep ${episodeNumber || '?'} Deliverables Kit — ${d.title}`,
          body,
          category: 'script',
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
        body: JSON.stringify({ transcript, episodeNumber, guestName }),
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
          onDrop={e => { e.preventDefault(); setAudioDrag(false); const f = Array.from(e.dataTransfer.files).find(x => x.type.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg)$/i.test(x.name)); if (f) handleAudio(f) }}>
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '18px', borderRadius: '12px', border: `2px dashed ${audioDrag ? 'var(--purple)' : 'var(--border)'}`, cursor: audioState === 'working' ? 'default' : 'pointer', background: audioDrag ? 'rgba(107,45,110,0.05)' : 'var(--surface-raised)', transition: 'all 0.15s' }}>
            {audioState === 'working'
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--purple)' }}><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {audioMsg}</span>
              : <>
                  <Mic size={20} style={{ color: audioDrag ? 'var(--purple)' : 'var(--text-subtle)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Drop your episode audio here</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>MP3/M4A/WAV up to 25MB — saves to Media + transcribes automatically</span>
                </>}
            <input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" style={{ display: 'none' }} disabled={audioState === 'working'} onChange={e => { const f = e.target.files?.[0]; if (f) handleAudio(f); e.target.value = '' }} />
          </label>
          {audioState !== 'idle' && audioState !== 'working' && (
            <p style={{ fontSize: '12px', marginTop: '6px', fontWeight: 600, color: audioState === 'done' ? '#3DAA7C' : '#E05252' }}>{audioMsg}</p>
          )}
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Transcript</label>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
            placeholder="Paste your full episode transcript here. The station will generate show notes, SEO, 3 Reels scripts, newsletter, YouTube description, Pinterest pins, ad reads, ManyChat funnel, and more."
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', resize: 'vertical', minHeight: '180px', fontFamily: 'inherit', lineHeight: 1.6 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{transcript.length.toLocaleString()} characters · AI reads first ~8,000</p>
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
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>❓ Questions we explore</p>
                  <CopyBtn text={(result.questions ?? []).map(q => `• ${q}`).join('\n')} label="Copy all" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {result.questions!.map((q, i) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '6px 10px', background: 'var(--surface-raised)', borderRadius: '8px', borderLeft: '3px solid var(--purple)' }}>{q}</p>
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

          {/* Pull Quotes */}
          <Section title="💬 Pull Quotes (for graphics + social)">
            {result.pull_quotes?.map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.5 }}>"{q}"</p>
                <CopyBtn text={`"${q}"`} />
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
                  <CopyBtn text={`${s.hook}\n\n${s.body}\n\n${s.cta}`} />
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '3px' }}>Hook</p><p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{s.hook}</p></div>
                  <div><p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '3px' }}>Body</p><p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.body}</p></div>
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
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* Newsletter */}
          <Section title="📧 Newsletter (Substack)">
            <Field label="Subject Line" value={result.newsletter_subject} />
            {result.newsletter_body && <Field label="Full Issue" value={result.newsletter_body} />}
          </Section>

          {/* Pinterest */}
          <Section title="📌 Pinterest Pins">
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '2px' }}>Visual generation for these pins is coming — the image prompt is ready on each.</p>
            {result.pinterest_pins?.map((p, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{p.title}</p>
                  <CopyBtn text={`${p.title}\n\n${p.description}`} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.description}</p>
                {p.image_prompt && <p style={{ fontSize: '11px', color: 'var(--text-subtle)', lineHeight: 1.5, marginTop: '5px', fontStyle: 'italic' }}>🎨 {p.image_prompt}</p>}
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
