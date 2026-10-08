'use client'
import { useState, useEffect } from 'react'

// THE MORNING BRIEF — a standalone, Dock-installable front door to RISE's brain.
// No nav, no card pile. Opens with HER (regulate), then the shape of the day, then
// at most ONE move per lane, then names what she does NOT have to carry. The feeling
// is relief, same as Quick Post. Shared brain (pulls live from RISE's APIs), separate
// surface. Add to Dock → its own icon → open first thing.

type YourMove = { title: string; why?: string; where?: string }

// A gentle default rhythm (she doesn't keep a calendar — RISE holds the shape so she
// doesn't have to). Editable later; this is the starting rough routine.
const ROUTINE = [
  { when: 'Morning', what: 'Breakfast + the one learning thing' },
  { when: 'Midday', what: 'Nap window — your work slot', mine: true },
  { when: 'Afternoon', what: 'Out, play, low bar' },
  { when: 'Evening', what: 'Dinner → bedtime' },
  { when: '9pm', what: 'Your window — film one thing, or rest', mine: true },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Still dark out'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

export default function BriefPage() {
  const [line, setLine] = useState<string | null>(null)
  const [move, setMove] = useState<YourMove | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    document.title = `Brief · ${today}`
    Promise.allSettled([
      fetch('/api/lines?account=mandijoybeck').then(r => r.json()),
      fetch('/api/commander/orders').then(r => r.json()),
    ]).then(([l, m]) => {
      if (l.status === 'fulfilled' && Array.isArray(l.value?.lines) && l.value.lines[0]) setLine(l.value.lines[0].line)
      if (m.status === 'fulfilled' && m.value?.orders?.your_move?.[0]) setMove(m.value.orders.your_move[0])
    }).finally(() => setLoaded(true))
  }, [])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #F7F1EA 0%, #F2E9DF 100%)', color: '#3A2E26', fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif', padding: '0' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '44px 24px 64px', display: 'flex', flexDirection: 'column', gap: '30px' }}>

        {/* 1 — Regulate first */}
        <header>
          <p style={{ fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A8937E', fontWeight: 700 }}>{greeting()} · {today}</p>
          <h1 style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.18, marginTop: '10px', color: '#2E241D' }}>You&apos;re not behind.<br />Here&apos;s today.</h1>
          <p style={{ fontSize: '15px', color: '#7A6A5B', marginTop: '10px', lineHeight: 1.5 }}>One breath. You don&apos;t have to hold all of it — I am.</p>
        </header>

        {/* 2 — The shape of the day (rhythm, not a calendar) */}
        <section style={{ background: 'rgba(255,255,255,0.55)', borderRadius: '20px', padding: '18px 20px', border: '1px solid rgba(168,147,126,0.25)' }}>
          <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#A8937E', marginBottom: '12px' }}>The shape of today</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {ROUTINE.map(r => (
              <div key={r.when} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: r.mine ? '#B5784E' : '#B8A694', minWidth: '74px' }}>{r.when}</span>
                <span style={{ fontSize: '14.5px', color: r.mine ? '#2E241D' : '#5E5044', fontWeight: r.mine ? 700 : 500 }}>{r.what}{r.mine && ' ✦'}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 3 — One per lane */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Content */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid rgba(168,147,126,0.22)', boxShadow: '0 6px 24px -14px rgba(90,60,30,0.25)' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#B5784E', marginBottom: '9px' }}>🎬 Film this in your window</p>
            {!loaded ? <p style={{ color: '#B8A694', fontSize: '14px' }}>pulling your line…</p>
              : line ? (
                <>
                  <p style={{ fontSize: '17px', fontWeight: 600, lineHeight: 1.4, color: '#2E241D' }}>{line}</p>
                  <button onClick={async () => { try { await navigator.clipboard.writeText(line); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* ignore */ } }}
                    style={{ marginTop: '12px', border: 'none', background: copied ? '#E8DCCB' : '#F2E9DF', color: '#6B4A30', fontWeight: 700, fontSize: '13px', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer' }}>
                    {copied ? '✓ Copied' : 'Copy line'}
                  </button>
                </>
              ) : <p style={{ color: '#7A6A5B', fontSize: '14px' }}>No line waiting — open Quick Post in RISE and tap &quot;More like this.&quot;</p>}
          </div>

          {/* Needle-mover */}
          {move && (
            <div style={{ background: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid rgba(168,147,126,0.22)', boxShadow: '0 6px 24px -14px rgba(90,60,30,0.25)' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A6BA8', marginBottom: '9px' }}>💭 The one needle-mover</p>
              <p style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.35, color: '#2E241D' }}>{move.title}</p>
              {move.why && <p style={{ fontSize: '13.5px', color: '#7A6A5B', marginTop: '5px', lineHeight: 1.45 }}>{move.why}</p>}
            </div>
          )}

          {/* Homeschool — gentle default until she gives a source */}
          <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(168,147,126,0.22)' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5E8A6B', marginBottom: '9px' }}>🏠 Today&apos;s one learning thing</p>
            <p style={{ fontSize: '15px', color: '#4A3F35', lineHeight: 1.45 }}>Follow one of their questions for twenty minutes. That counts. That&apos;s the whole lesson.</p>
          </div>
        </section>

        {/* 4 — Protect her from the noise */}
        <section style={{ borderRadius: '16px', padding: '14px 18px', background: 'rgba(168,147,126,0.12)', border: '1px dashed rgba(168,147,126,0.4)' }}>
          <p style={{ fontSize: '13.5px', color: '#7A6A5B', lineHeight: 1.5 }}>📬 Your inbox: <strong style={{ color: '#5E5044' }}>I&apos;ll stand between you and it</strong> once you connect Gmail — then this line only shows what actually needs you. For now, it&apos;s not your job this morning.</p>
        </section>

        {/* 5 — The close */}
        <footer style={{ textAlign: 'center', paddingTop: '6px' }}>
          <p style={{ fontSize: '15px', color: '#2E241D', fontWeight: 700 }}>That&apos;s it.</p>
          <p style={{ fontSize: '14px', color: '#7A6A5B', marginTop: '4px' }}>Everything else, I&apos;m holding. Go be with them.</p>
        </footer>
      </div>
    </main>
  )
}
