'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Copy, Check, ThumbsDown, Sparkles, Music, Clapperboard, Radio } from 'lucide-react'

// THE LINES FEED — the opposite of the content-card pile. Calm, text-first, lots of
// whitespace. One Line per row: the on-screen line and the caption, each with a
// one-tap Copy; the audio vibe and b-roll idea as quiet tags underneath. Filter by
// account, "More like this" to replenish, 👎 to dismiss. No media, no slides, no
// approve/schedule/status chrome. Just fast, copyable words. RISE never posts these.

type Line = { id: number; account_id: string; line: string; caption: string; audio_tone: string; broll_scene: string; created_at: string }
type Acct = { id: string; handle: string; status: string; brand_name?: string }
type Pulse = { title: string; best_bet: string; audio: string; when: string | null }

const DEFAULT_ACCOUNT = 'mandijoybeck'   // @theknowingis — her current focus

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400) } catch { /* ignore */ } }}
      title={`Copy ${label}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: done ? 'var(--purple)' : 'var(--text-subtle)', fontSize: '11px', fontWeight: 700, padding: '4px 6px', borderRadius: '7px', flexShrink: 0 }}>
      {done ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy {label}</>}
    </button>
  )
}

export default function LinesPanel() {
  const [accounts, setAccounts] = useState<Acct[]>([])
  const [account, setAccount] = useState<string>(DEFAULT_ACCOUNT)
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [pulse, setPulse] = useState<Pulse | null>(null)

  // Active accounts for the quiet filter.
  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(d => {
      const a: Acct[] = (Array.isArray(d) ? d : d.accounts ?? []).filter((x: Acct) => x.status === 'active' || x.status === 'restricted')
      setAccounts(a)
    }).catch(() => {})
  }, [])

  // This week's trend pulse — shown at the very top.
  useEffect(() => {
    fetch('/api/trends/latest').then(r => r.json())
      .then(d => { if (d.pulse && (d.pulse.best_bet || d.pulse.audio)) setPulse(d.pulse) })
      .catch(() => {})
  }, [])

  const load = useCallback((acct: string) => {
    setLoading(true)
    fetch(`/api/lines?account=${encodeURIComponent(acct)}`)
      .then(r => r.json())
      .then(d => setLines(Array.isArray(d.lines) ? d.lines : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load(account) }, [account, load])

  const dismiss = async (id: number) => {
    setLines(ls => ls.filter(l => l.id !== id))   // optimistic
    try {
      const d = await fetch('/api/lines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, dismiss: true }) }).then(r => r.json())
      if (Array.isArray(d.lines)) setLines(d.lines)
    } catch { /* keep optimistic */ }
  }

  const moreLikeThis = async () => {
    if (more) return
    setMore(true)
    try {
      const d = await fetch('/api/lines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account, more: true }) }).then(r => r.json())
      if (Array.isArray(d.lines)) setLines(d.lines)
    } catch { /* ignore */ }
    setMore(false)
  }

  const handleOf = (id: string) => accounts.find(a => a.id === id)?.handle ?? id

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px', padding: '4px 0 60px' }}>
      {/* Header — gentle */}
      <div>
        <h1 className="font-display" style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1, color: 'var(--text)' }}>Quick Post <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-subtle)' }}>for Edits</span></h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.5 }}>Copy-ready words for your next trial reel. Grab one, film it in Edits, post it yourself. That&apos;s the whole job.</p>
      </div>

      {/* This week's trend pulse — audio + best bet, right at the top */}
      {pulse && (
        <div style={{ borderRadius: '14px', padding: '13px 16px', background: 'linear-gradient(120deg, rgba(194,71,126,0.10), rgba(90,79,207,0.08))', border: '1px solid rgba(194,71,126,0.22)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Radio size={14} style={{ color: '#C2477E' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#C2477E' }}>Trending this week</span>
          </div>
          {pulse.audio && <p style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.45, display: 'flex', gap: '7px' }}><Music size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-subtle)' }} /> <span>{pulse.audio}</span></p>}
          {pulse.best_bet && <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}><strong style={{ color: 'var(--text)' }}>Best bet:</strong> {pulse.best_bet}</p>}
        </div>
      )}

      {/* Quiet account filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {[{ id: DEFAULT_ACCOUNT, handle: '@theknowingis' }, ...accounts.filter(a => a.id !== DEFAULT_ACCOUNT)].map(a => (
          <button key={a.id} onClick={() => setAccount(a.id)}
            style={{ border: 'none', background: account === a.id ? 'var(--purple)' : 'var(--surface-raised)', color: account === a.id ? '#fff' : 'var(--text-muted)', borderRadius: '999px', padding: '6px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>
            {('handle' in a && a.handle) ? a.handle : handleOf(a.id)}
          </button>
        ))}
      </div>

      {/* The feed */}
      {loading && lines.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0', justifyContent: 'center' }}>
          <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Writing you a few lines…
        </div>
      ) : lines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-subtle)' }}>
          <p style={{ fontSize: '13.5px', lineHeight: 1.6 }}>No lines here yet. Tap below and RISE will write you a fresh handful.</p>
          <button onClick={moreLikeThis} disabled={more} style={{ marginTop: '14px', border: '1px solid var(--purple)', background: 'var(--purple-light)', color: 'var(--purple)', borderRadius: '10px', padding: '10px 18px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            {more ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> writing…</> : <><Sparkles size={14} /> Write me some lines</>}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {lines.map(l => (
            <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* The on-screen line — the hero */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{l.line}</p>
                <CopyBtn text={l.line} label="line" />
              </div>

              {/* The caption */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-subtle)' }}>Caption</span>
                  <CopyBtn text={l.caption} label="caption" />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{l.caption}</p>
              </div>

              {/* Quiet pairing tags + dismiss */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                {l.audio_tone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-subtle)', background: 'var(--surface-raised)', borderRadius: '999px', padding: '4px 10px' }}><Music size={11} /> {l.audio_tone}</span>}
                {l.broll_scene && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-subtle)', background: 'var(--surface-raised)', borderRadius: '999px', padding: '4px 10px' }}><Clapperboard size={11} /> {l.broll_scene}</span>}
                <button onClick={() => dismiss(l.id)} title="Not this one" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', padding: '4px 6px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                  <ThumbsDown size={12} />
                </button>
              </div>
            </div>
          ))}

          {/* More like this */}
          <button onClick={moreLikeThis} disabled={more}
            style={{ alignSelf: 'center', marginTop: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', borderRadius: '11px', padding: '11px 20px', fontWeight: 800, fontSize: '13px', cursor: more ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {more ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> writing more…</> : <><Sparkles size={14} /> More like this</>}
          </button>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
