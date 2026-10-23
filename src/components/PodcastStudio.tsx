'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Mic, Calendar, FileText, Link2, Copy, Check, Sparkles, X, ExternalLink } from 'lucide-react'

// PODCAST STUDIO — the robust podcast tab. Top: a scrollable weekly schedule (each
// week's shows with topic + recording time). Click a show for its teleprompter script
// + reference links. Bottom: a table of every episode. Sundays = solo (scripted),
// Wednesdays = guest (booked via /book).
type Ref = { label: string; url: string }
type Episode = { id: string; date: string; day: 'sun' | 'wed'; time?: string; title: string; topic: string; guest?: string; script: string; references: Ref[]; status: string }

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtTime = (t?: string) => { if (!t) return ''; const m = /^(\d{1,2}):(\d{2})/.exec(t); if (!m) return t; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}` }
const dObj = (d: string) => new Date(d + 'T00:00')
const fmtDate = (d: string) => { const x = dObj(d); return `${DOW[x.getDay()]} ${MON[x.getMonth()]} ${x.getDate()}` }
function weekStart(d: string): string { const x = dObj(d); x.setDate(x.getDate() - x.getDay()); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }

export default function PodcastStudio() {
  const [eps, setEps] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Episode | null>(null)
  const [gen, setGen] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    fetch('/api/podcast/episodes').then(r => r.json()).then(d => setEps(Array.isArray(d.episodes) ? d.episodes : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  // Group into weeks (Sunday-start), chronological.
  const weeks: { start: string; items: Episode[] }[] = []
  for (const e of eps) {
    const k = weekStart(e.date)
    const w = weeks.find(x => x.start === k)
    if (w) w.items.push(e); else weeks.push({ start: k, items: [e] })
  }
  weeks.forEach(w => w.items.sort((a, b) => a.date.localeCompare(b.date)))

  const generate = async (ep: Episode) => {
    setGen(true)
    try {
      const d = await fetch('/api/podcast/episodes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ generate_script: true, id: ep.id }) }).then(r => r.json())
      if (d.episode) { setOpen(d.episode); load() }
    } catch { /* ignore */ }
    setGen(false)
  }

  const tint = (e: Episode) => e.day === 'wed' ? '#C2477E' : '#5A4FCF'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.01em', background: 'linear-gradient(115deg, #5A4FCF, #C2477E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Podcast Studio</h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>Sundays — solo & scripted · Wednesdays — guests (they book at <strong>aiworksforher.com/book</strong>)</p>
        </div>
      </div>

      {/* Scrollable weekly schedule */}
      {loading ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading the schedule…</div>
      ) : eps.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-subtle)', padding: '24px', textAlign: 'center' }}>No episodes scheduled yet.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {weeks.map(w => (
              <div key={w.start} style={{ minWidth: '230px', flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '13px' }}>
                <p style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '9px', display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={11} /> Week of {MON[dObj(w.start).getMonth()]} {dObj(w.start).getDate()}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {w.items.map(e => (
                    <button key={e.id} onClick={() => setOpen(e)} style={{ textAlign: 'left', border: '1px solid var(--border)', borderLeft: `3px solid ${tint(e)}`, background: 'var(--bg)', borderRadius: '10px', padding: '9px 11px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: tint(e) }}>{fmtDate(e.date)}{e.time ? ` · ${fmtTime(e.time)}` : ''}</span>
                        {e.script ? <FileText size={11} style={{ color: 'var(--text-subtle)' }} /> : null}
                      </div>
                      <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginTop: '3px', lineHeight: 1.3 }}>{e.title}</p>
                      {e.day === 'wed' && <p style={{ fontSize: '10.5px', color: 'var(--text-subtle)', marginTop: '2px' }}>👤 {e.guest || 'guest TBD'}</p>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Episode table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 0.9fr 0.5fr', gap: '8px', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)' }}>
              <span>Title</span><span>Topic</span><span>Guest</span><span>Script</span>
            </div>
            {eps.map(e => (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 0.9fr 0.5fr', gap: '8px', padding: '11px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>{e.title}</span>
                <span style={{ color: 'var(--text-muted)' }}>{e.topic}</span>
                <span style={{ color: 'var(--text-subtle)' }}>{e.day === 'wed' ? (e.guest || 'TBD') : '—'}</span>
                <button onClick={() => setOpen(e)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: e.script ? 'var(--purple)' : 'var(--text-subtle)', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                  <FileText size={12} /> {e.script ? 'View' : 'Write'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail modal */}
      {open && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,40,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 18px', overflowY: 'auto' }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '18px', padding: '24px', maxWidth: '680px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: tint(open) }}>{fmtDate(open.date)}{open.time ? ` · ${fmtTime(open.time)} CT` : ''} · {open.day === 'wed' ? 'Guest' : 'Solo'}</span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '3px', lineHeight: 1.2 }}>{open.title}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{open.topic}{open.day === 'wed' && open.guest ? ` · with ${open.guest}` : ''}</p>
              </div>
              <button onClick={() => setOpen(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={18} /></button>
            </div>

            {/* References */}
            {open.references.length > 0 && (
              <div>
                <p style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}><Link2 size={11} /> Read / reference</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {open.references.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', color: 'var(--purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}><ExternalLink size={11} /> {r.label}</a>
                  ))}
                </div>
              </div>
            )}

            {/* Script */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '5px' }}><Mic size={11} /> Teleprompter script</p>
                {open.script && <button onClick={async () => { try { await navigator.clipboard.writeText(open.script); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* ignore */ } }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: copied ? 'var(--purple)' : 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>{copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}</button>}
              </div>
              {open.script ? (
                <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px 18px', maxHeight: '340px', overflowY: 'auto', fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{open.script}</div>
              ) : (
                <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-subtle)', marginBottom: '12px' }}>No script yet.</p>
                  <button onClick={() => generate(open)} disabled={gen} style={{ border: 'none', background: 'var(--purple)', color: '#fff', borderRadius: '10px', padding: '10px 18px', fontWeight: 800, fontSize: '13px', cursor: gen ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    {gen ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> writing…</> : <><Sparkles size={14} /> Write the script</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
