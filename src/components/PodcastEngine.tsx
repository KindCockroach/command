'use client'
import { useState } from 'react'
import { Loader2, Copy, CheckCircle2, ChevronDown, ChevronUp, Mic, Zap } from 'lucide-react'

interface Deliverables {
  title: string
  subtitle: string
  headlines: string[]
  description: string
  seo_description: string
  keywords: string[]
  chapters: { time: string; title: string }[]
  pull_quotes: string[]
  reels_scripts: { hook: string; body: string; cta: string; platform: string }[]
  newsletter_angle: string
  newsletter_subject: string
  medium_article: { title: string; subtitle: string; body: string }
  youtube_title: string
  youtube_description: string
  youtube_tags: string[]
  pinterest_pins: { title: string; description: string }[]
  spotify_description: string
  apple_description: string
  ad_reads: { pre_roll: string; mid_roll: string; post_roll: string }
  guest_share_kit: { dm_message: string; suggested_caption: string; quote_graphic_text: string }
  manychat_trigger: string
  manychat_dm: string
  producer_feedback: {
    overall_grade: string
    strengths: string[]
    topic_drift: string
    depth_gaps: string
    too_many_directions: string
    biggest_win: string
    next_episode_suggestion: string
  }
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
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Deliverables | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [riverStatus, setRiverStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [riverMsg, setRiverMsg] = useState('')

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
          body: JSON.stringify({ input, source: 'podcast' }),
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

  const generate = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, episodeNumber, guestName }),
      })
      const data = await res.json()
      if (data.deliverables) setResult(data.deliverables)
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

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Transcript</label>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
            placeholder="Paste your full episode transcript here. The station will generate show notes, SEO, 3 Reels scripts, newsletter, YouTube description, Pinterest pins, ad reads, ManyChat funnel, and more."
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', resize: 'vertical', minHeight: '180px', fontFamily: 'inherit', lineHeight: 1.6 }} />
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>{transcript.length.toLocaleString()} characters · AI reads first ~8,000</p>
        </div>

        <button onClick={generate} disabled={loading || !transcript.trim()}
          style={{ padding: '12px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: !transcript.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating all deliverables...</> : <><Zap size={15} /> Generate Everything</>}
        </button>
      </div>

      {error && <div style={{ padding: '14px', background: '#FEF5EA', borderRadius: '10px', fontSize: '13px', color: '#F2A65A', fontWeight: 600 }}>⚠ {error}</div>}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

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

          {/* Episode Identity */}
          <Section title="📌 Episode Identity" defaultOpen>
            <Field label="Title" value={result.title} />
            <Field label="Subtitle" value={result.subtitle} />
            <Field label="SEO Description (150 chars)" value={result.seo_description} />
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Keywords</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {result.keywords?.map((k, i) => <span key={i} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: 'var(--purple-light)', color: 'var(--purple)', fontWeight: 600 }}>{k}</span>)}
              </div>
            </div>
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

          {/* Show Notes */}
          <Section title="📝 Show Notes">
            <Field label="Full Show Notes" value={result.description} />
          </Section>

          {/* Chapter Markers */}
          <Section title="⏱ Chapter Markers">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {result.chapters?.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 12px', background: 'var(--surface-raised)', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--purple)', minWidth: '40px' }}>{c.time}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{c.title}</span>
                </div>
              ))}
              <CopyBtn text={result.chapters?.map(c => `${c.time} ${c.title}`).join('\n')} label="Copy all chapters" />
            </div>
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

          {/* Medium Article */}
          <Section title="✍️ Medium Article">
            {result.medium_article && (
              <>
                <Field label="Article Title" value={result.medium_article.title} />
                <Field label="Subtitle / Deck" value={result.medium_article.subtitle} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Article Body</p>
                    <CopyBtn text={`# ${result.medium_article.title}\n\n*${result.medium_article.subtitle}*\n\n${result.medium_article.body}`} label="Copy full article" />
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, background: 'var(--surface-raised)', padding: '14px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>{result.medium_article.body}</p>
                </div>
              </>
            )}
          </Section>

          {/* Newsletter */}
          <Section title="📧 Newsletter (Substack)">
            <Field label="Subject Line" value={result.newsletter_subject} />
            <Field label="Angle + Outline" value={result.newsletter_angle} />
          </Section>

          {/* YouTube */}
          <Section title="▶️ YouTube">
            <Field label="YouTube Title" value={result.youtube_title} />
            <Field label="YouTube Description" value={result.youtube_description} />
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Tags</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {result.youtube_tags?.map((t, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'var(--surface-raised)', color: 'var(--text-subtle)' }}>{t}</span>)}
              </div>
            </div>
          </Section>

          {/* Platform Descriptions */}
          <Section title="🎵 Spotify + Apple">
            <Field label="Spotify Description" value={result.spotify_description} />
            <Field label="Apple Podcasts Description" value={result.apple_description} />
          </Section>

          {/* Pinterest */}
          <Section title="📌 Pinterest Pins">
            {result.pinterest_pins?.map((p, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{p.title}</p>
                  <CopyBtn text={`${p.title}\n\n${p.description}`} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.description}</p>
              </div>
            ))}
          </Section>

          {/* Ad Reads */}
          <Section title="📣 Ad Reads (aiworksforyou.co)">
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

          {/* Guest Share Kit */}
          {result.guest_share_kit?.dm_message && (
            <Section title="🤝 Guest Share Kit">
              <Field label="DM to Guest" value={result.guest_share_kit.dm_message} />
              <Field label="Guest Caption (copy-paste)" value={result.guest_share_kit.suggested_caption} />
              <Field label="Quote Graphic Text" value={result.guest_share_kit.quote_graphic_text} />
            </Section>
          )}

          {/* Producer Feedback */}
          {result.producer_feedback && (
            <Section title="🎙 Producer Feedback">
              <div style={{ padding: '12px 14px', background: 'var(--surface-raised)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--purple)' }}>{result.producer_feedback.overall_grade?.split('/')[0]}</span>
                <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>{result.producer_feedback.overall_grade}</p>
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
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
