'use client'
import { useState, useEffect } from 'react'

// THE MORNING BRIEF — a standalone, Dock-installable front door to RISE's brain.
// No nav, no card pile. Opens with HER (regulate), then the shape of the day, then
// at most ONE move per lane, then names what she does NOT have to carry. The feeling
// is relief, same as Quick Post. Shared brain (pulls live from RISE's APIs), separate
// surface. Add to Dock → its own icon → open first thing.

type YourMove = { title: string; why?: string; where?: string }
type InboxItem = { icon?: string; text: string; view_url?: string }
type Inbox = { items: InboxItem[]; checked_at: string; count_total?: number }
type Booking = { id: string; name: string; date: string; time: string; comm_method?: string; created_at: string }
type Signup = { name: string; email: string; tags: string[]; source: string; dateAdded: string }
type Build = { id: string; date: string; title: string; status: 'done' | 'doing' | 'todo'; detail?: string; source: 'claude' | 'rise' }

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
  const [inbox, setInbox] = useState<Inbox | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [signups, setSignups] = useState<Signup[]>([])
  const [build, setBuild] = useState<Build[]>([])
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)
  // When she last opened the brief — so "new signups" means new SINCE THEN, and the
  // brief always shows her what changed rather than repeating what she's already seen.
  const [prevSeen, setPrevSeen] = useState<string | null>(null)

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    document.title = `Brief · ${today}`
    let seen: string | null = null
    try { seen = localStorage.getItem('brief-last-viewed') } catch { /* private window */ }
    setPrevSeen(seen)
    Promise.allSettled([
      fetch('/api/brief/line').then(r => r.json()),  // Mandi Joy's line, tied to the current priority (the Reset)
      fetch('/api/commander/orders').then(r => r.json()),
      fetch('/api/inbox').then(r => r.json()),
      fetch('/api/podcast/schedule?admin=1').then(r => r.json()),
      fetch('/api/people').then(r => r.json()),   // RISE-native CRM (not GHL) — the complete list
      fetch('/api/buildlog').then(r => r.json()),  // the build journal: Claude + RISE work, merged
    ]).then(([l, m, i, b, s, bl]) => {
      // Mandi Joy's line for today, generated around the current priority (the Reset).
      if (l.status === 'fulfilled' && typeof l.value?.line === 'string' && l.value.line) setLine(l.value.line)
      if (m.status === 'fulfilled' && m.value?.orders?.your_move?.[0]) setMove(m.value.orders.your_move[0])
      if (i.status === 'fulfilled' && i.value?.inbox) setInbox(i.value.inbox)
      if (b.status === 'fulfilled' && Array.isArray(b.value?.bookings)) setBookings(b.value.bookings)
      // Signups now come from RISE's own People CRM (not GHL) — the complete list,
      // including people GHL dropped. Show the last few weeks; "new since last look" narrows it.
      if (s.status === 'fulfilled' && Array.isArray(s.value?.people)) {
        const cutoff = Date.now() - 21 * 86400000
        const recent = (s.value.people as { name?: string; email?: string; labels?: string[]; sources?: string[]; created_at: string }[])
          .filter(p => p.created_at && new Date(p.created_at).getTime() >= cutoff)
          .map(p => ({ name: p.name || p.email || 'New contact', email: p.email ?? '', tags: p.labels ?? [], source: (p.sources ?? []).join(', '), dateAdded: p.created_at }))
          .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
        setSignups(recent)
      }
      if (bl.status === 'fulfilled' && Array.isArray(bl.value?.entries)) setBuild(bl.value.entries as Build[])
    }).finally(() => {
      setLoaded(true)
      // Stamp "seen now" AFTER we captured the previous value, so this visit's new
      // items drop off next time.
      try { localStorage.setItem('brief-last-viewed', new Date().toISOString()) } catch { /* ignore */ }
    })
  }, [])

  // Signups that are new since she last opened the brief (first-ever open shows all).
  const newSignups = signups.filter(s => !prevSeen || (s.dateAdded && new Date(s.dateAdded) > new Date(prevSeen)))
  const fmtSignup = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return '' } }
  // Inbox is pushed by a daily Gmail scan; if that's gone quiet, don't show stale items.
  const inboxStale = !!inbox?.checked_at && (Date.now() - new Date(inbox.checked_at).getTime()) > 36 * 3600000

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
            <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#B5784E', marginBottom: '9px' }}>🎬 One line to film today</p>
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

        {/* 4 — Protect her from the noise (live inbox triage) */}
        <section style={{ borderRadius: '16px', padding: '16px 18px', background: 'rgba(168,147,126,0.12)', border: '1px solid rgba(168,147,126,0.3)' }}>
          <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A8937E', marginBottom: '10px' }}>📬 Your inbox {!inboxStale && inbox?.items?.length ? `· ${inbox.items.length} need you` : ''}</p>
          {inboxStale ? (
            <p style={{ fontSize: '13.5px', color: '#7A6A5B', lineHeight: 1.5 }}>Inbox sync has been quiet for a while, so I&apos;m not showing you an old pile. Reconnect the Gmail scan and fresh triage shows up here again. 🤍</p>
          ) : inbox && inbox.items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inbox.items.map((it, i) => (
                <p key={i} style={{ fontSize: '14.5px', color: '#3A2E26', lineHeight: 1.45 }}>
                  {it.icon ? `${it.icon} ` : ''}
                  {it.view_url
                    ? <a href={it.view_url} target="_blank" rel="noreferrer" style={{ color: '#6B4A30', textDecoration: 'underline' }}>{it.text}</a>
                    : it.text}
                </p>
              ))}
              <p style={{ fontSize: '12.5px', color: '#9A8676', marginTop: '2px' }}>Everything else{inbox.count_total ? ` (${inbox.count_total} threads)` : ''} is noise. Not your job this morning.</p>
            </div>
          ) : inbox ? (
            <p style={{ fontSize: '14px', color: '#5E5044', lineHeight: 1.5 }}>Nothing needs you this morning. I checked — it&apos;s all noise. 🤍</p>
          ) : (
            <p style={{ fontSize: '13.5px', color: '#7A6A5B', lineHeight: 1.5 }}>I&apos;ll stand between you and your inbox — this line shows only what actually needs you. Not your job this morning.</p>
          )}
        </section>

        {/* Signups — podcast guest bookings */}
        {(() => {
          const todayStr = new Date().toLocaleDateString('en-CA')
          const upcoming = bookings.filter(b => b.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
          const freshCount = bookings.filter(b => Date.now() - new Date(b.created_at).getTime() < 3 * 86400000).length
          if (!upcoming.length && !freshCount) return null
          const fmtd = (d: string) => new Date(d + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          return (
            <section style={{ borderRadius: '16px', padding: '16px 18px', background: 'rgba(107,74,48,0.06)', border: '1px solid rgba(184,166,126,0.3)' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8937E', marginBottom: '10px' }}>🎙️ Podcast guests{freshCount ? ` · ${freshCount} new` : ''}</p>
              {upcoming.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {upcoming.slice(0, 4).map(b => (
                    <p key={b.id} style={{ fontSize: '14px', color: '#3A2E26', lineHeight: 1.4 }}><strong>{b.name}</strong> · {fmtd(b.date)}{b.comm_method ? ` · reach via ${b.comm_method}` : ''}</p>
                  ))}
                  <a href="/book/manage" target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', color: '#6B4A30', textDecoration: 'underline', marginTop: '2px' }}>See all details →</a>
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: '#5E5044' }}>New booking(s) just came in — <a href="/book/manage" target="_blank" rel="noreferrer" style={{ color: '#6B4A30' }}>see details →</a></p>
              )}
            </section>
          )
        })()}

        {/* New signups — from RISE's own People CRM, only the ones since she last looked, with dates */}
        {newSignups.length > 0 && (
          <section style={{ borderRadius: '16px', padding: '16px 18px', background: 'rgba(61,170,124,0.07)', border: '1px solid rgba(61,170,124,0.25)' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#3d9a6e', marginBottom: '10px' }}>🌱 New signups since you last looked · {newSignups.length}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {newSignups.slice(0, 8).map((s, i) => (
                <p key={i} style={{ fontSize: '14px', color: '#3A2E26', lineHeight: 1.4 }}>
                  <strong>{s.name}</strong>
                  {s.dateAdded ? <span style={{ color: '#9A8676' }}> · {fmtSignup(s.dateAdded)}</span> : ''}
                  {s.tags.length ? ` · ${s.tags.slice(0, 2).join(', ')}` : s.source ? ` · ${s.source}` : ''}
                </p>
              ))}
            </div>
            <p style={{ fontSize: '11.5px', color: '#9A8676', marginTop: '8px' }}>In your People list, tagged and ready. 🤍</p>
          </section>
        )}

        {/* Build journal — just what's in motion and what's next (not a full activity log) */}
        {build.length > 0 && (() => {
          const todayStr = new Date().toLocaleDateString('en-CA')
          const doing = build.filter(b => b.status === 'doing')
          const todo = build.filter(b => b.status === 'todo')
          if (!doing.length && !todo.length) return null
          const tag = (s: string) => (s === 'rise' ? '▲' : '🤖')
          const Line = ({ b, today }: { b: Build; today?: boolean }) => (
            <p style={{ fontSize: '14px', color: '#3A2E26', lineHeight: 1.45 }}>
              <span style={{ color: '#B8A694', marginRight: 6 }} title={b.source === 'rise' ? 'In RISE' : 'With Claude'}>{tag(b.source)}</span>
              {b.title}{today && b.date === todayStr ? <span style={{ color: '#B5784E', fontWeight: 800 }}> · today</span> : ''}
              {b.detail ? <span style={{ color: '#9A8676', fontWeight: 400 }}> — {b.detail}</span> : ''}
            </p>
          )
          return (
            <section style={{ borderRadius: '18px', padding: '18px 20px', background: 'rgba(139,107,168,0.08)', border: '1px solid rgba(139,107,168,0.28)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A6BA8' }}>🛠 What we&apos;re building</p>
              {doing.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A6BA8', marginTop: '4px' }}>In progress</p>
                  {doing.map(b => <Line key={b.id} b={b} />)}
                </div>
              )}
              {todo.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#B5784E', marginTop: '4px' }}>To finish / address</p>
                  {todo.map(b => <Line key={b.id} b={b} today />)}
                </div>
              )}
            </section>
          )
        })()}

        {/* 5 — The close */}
        <footer style={{ textAlign: 'center', paddingTop: '6px' }}>
          <p style={{ fontSize: '15px', color: '#2E241D', fontWeight: 700 }}>That&apos;s it.</p>
          <p style={{ fontSize: '14px', color: '#7A6A5B', marginTop: '4px' }}>Everything else, I&apos;m holding. Go be with them.</p>
          <a href="/station" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginTop: '22px', padding: '11px 20px', borderRadius: '12px', background: '#2E241D', color: '#F7F1EA', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none' }}>
            ▲ Open RISE Station
          </a>
          <p style={{ fontSize: '11.5px', color: '#B8A694', marginTop: '8px' }}>the full workshop, when you&apos;re ready to work</p>
        </footer>
      </div>
    </main>
  )
}
