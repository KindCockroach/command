'use client'
import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import { Loader2, Mic, Calendar, FileText, Link2, Copy, Check, Sparkles, X, ExternalLink, Newspaper, Send, BookOpen, Pencil, Wand2 } from 'lucide-react'

// PODCAST STUDIO — the robust podcast tab. Top: a scrollable weekly schedule (each
// week's shows with topic + recording time). Click a show for its teleprompter script
// + reference links. Bottom: a table of every episode. Sundays = solo (scripted),
// Wednesdays = guest (booked via /book).
type Ref = { label: string; url: string }
type Episode = { id: string; date: string; day: 'sun' | 'wed'; time?: string; title: string; topic: string; guest?: string; script: string; references: Ref[]; status: string; number?: number; thread?: string; pushback?: string; note_id?: number }
type Turn = { role: 'user' | 'commander'; text: string }

const COLS = '0.45fr 1.3fr 1.3fr 0.7fr 0.9fr 1.1fr 0.6fr'
const btn = (bg: string): CSSProperties => ({ border: 'none', background: bg, color: '#fff', borderRadius: '10px', padding: '9px 14px', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' })
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
  const [chat, setChat] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [asking, setAsking] = useState(false)
  const [banked, setBanked] = useState<{ id: number; title: string; body: string } | null>(null)
  // Editing the final teleprompter script (View) + revising it from raw feedback.
  const [editing, setEditing] = useState(false)
  const [scriptDraft, setScriptDraft] = useState('')
  const [savingScript, setSavingScript] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [revising, setRevising] = useState(false)
  // Editing the banked raw note directly.
  const [bankedEditing, setBankedEditing] = useState(false)
  const [bankedDraft, setBankedDraft] = useState('')
  const [savingBanked, setSavingBanked] = useState(false)
  const [bankedCopied, setBankedCopied] = useState(false)

  const closeDetail = () => { setOpen(null); setEditing(false); setFeedback('') }
  const closeBanked = () => { setBanked(null); setBankedEditing(false) }

  // Save a hand-edited teleprompter script straight to the episode.
  const saveScript = async () => {
    if (!open || savingScript) return
    setSavingScript(true)
    try {
      const d = await fetch('/api/podcast/episodes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: open.id, script: scriptDraft }) }).then(r => r.json())
      if (d.episode) { setOpen(d.episode); load() }
      setEditing(false)
    } catch { /* keep editing */ }
    setSavingScript(false)
  }

  // Rewrite the FINAL script from raw feedback — keeps what she didn't flag.
  const reviseScript = async () => {
    if (!open || !feedback.trim() || revising) return
    setRevising(true)
    try {
      const d = await fetch('/api/podcast/episodes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revise_script: true, id: open.id, feedback }) }).then(r => r.json())
      if (d.episode) { setOpen(d.episode); load(); setFeedback('') }
    } catch { /* ignore */ }
    setRevising(false)
  }

  // Save an edit to the banked raw note.
  const saveBanked = async () => {
    if (!banked || savingBanked) return
    setSavingBanked(true)
    try {
      const d = await fetch('/api/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: banked.id, body: bankedDraft }) }).then(r => r.json())
      if (d && d.id) setBanked({ id: d.id, title: d.title, body: d.body })
      setBankedEditing(false)
    } catch { /* keep editing */ }
    setSavingBanked(false)
  }

  // Commander on the table: recommend the next episode, pull headlines, or talk.
  const askCommander = async (mode: 'chat' | 'recommend' | 'headlines', text: string) => {
    const said = text.trim() || (mode === 'recommend' ? 'Recommend the next episode.' : mode === 'headlines' ? "Pull this week's headlines." : '')
    if (!said || asking) return
    const history = [...chat, { role: 'user' as const, text: said }]
    setChat(history); setDraft(''); setAsking(true)
    try {
      const d = await fetch('/api/podcast/episodes/commander', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, message: text.trim(), history: chat }) }).then(r => r.json())
      if (Array.isArray(d.episodes)) setEps(d.episodes)
      const note = Array.isArray(d.applied) && d.applied.length ? `\n\n✓ ${d.applied.join(' · ')}` : ''
      setChat([...history, { role: 'commander', text: d.error ? `⚠ ${d.error}` : `${d.reply}${note}` }])
    } catch {
      setChat([...history, { role: 'commander', text: '⚠ Couldn\'t reach the Commander — try again.' }])
    }
    setAsking(false)
  }

  const openBanked = async (id: number) => {
    try {
      const notes = await fetch('/api/notes').then(r => r.json())
      const n = Array.isArray(notes) ? notes.find((x: { id: number }) => x.id === id) : null
      setBanked(n ? { id: n.id, title: n.title, body: n.body } : { id, title: `Note #${id}`, body: 'That note wasn\'t found.' })
    } catch { /* ignore */ }
  }

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
                      <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginTop: '3px', lineHeight: 1.3 }}>{e.number ? `Ep ${e.number} · ` : ''}{e.title}</p>
                      {e.day === 'wed' && <p style={{ fontSize: '10.5px', color: 'var(--text-subtle)', marginTop: '2px' }}>👤 {e.guest || 'guest TBD'}</p>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Episode table — scrollable, numbered */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ maxHeight: '440px', overflow: 'auto' }}>
              <div style={{ minWidth: '860px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: '8px', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                  <span>Ep</span><span>Title</span><span>Topic</span><span>Guest</span><span>Human thread</span><span>Pushback</span><span>Script</span>
                </div>
                {eps.map(e => (
                  <div key={e.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: '8px', padding: '11px 14px', borderBottom: '1px solid var(--border)', alignItems: 'start', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 800, color: tint(e) }}>{e.number ?? '—'}<span style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)' }}>{fmtDate(e.date)}</span></span>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{e.title}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{e.topic}</span>
                    <span style={{ color: 'var(--text-subtle)' }}>{e.day === 'wed' ? (e.guest || 'TBD') : 'Solo'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{e.thread || '—'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{e.pushback || '—'}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <button onClick={() => setOpen(e)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: e.script ? 'var(--purple)' : 'var(--text-subtle)', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                        <FileText size={12} /> {e.script ? 'View' : 'Write'}
                      </button>
                      {e.note_id ? (
                        <button onClick={() => openBanked(e.note_id!)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--purple)', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, textAlign: 'left' }}>
                          <BookOpen size={12} /> Banked
                        </button>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Commander on the table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => askCommander('recommend', draft)} disabled={asking} style={btn('var(--purple)')}><Sparkles size={13} /> Recommend next episode</button>
              <button onClick={() => askCommander('headlines', draft)} disabled={asking} style={btn('#C2477E')}><Newspaper size={13} /> Pull this week&rsquo;s headlines</button>
            </div>
            {chat.length > 0 && (
              <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chat.map((t, i) => (
                  <div key={i} style={{ alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', background: t.role === 'user' ? 'var(--purple)' : 'var(--bg)', color: t.role === 'user' ? '#fff' : 'var(--text)', borderRadius: '12px', padding: '9px 12px', fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{t.text}</div>
                ))}
                {asking && <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> thinking…</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea value={draft} onChange={ev => setDraft(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); askCommander('chat', draft) } }} rows={2} placeholder="Talk to the Commander: &quot;move the water pushback to Ep 9,&quot; &quot;add a guest for Nov 25,&quot; &quot;what should Ep 8 open with?&quot;" style={{ flex: 1, resize: 'vertical', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 11px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }} />
              <button onClick={() => askCommander('chat', draft)} disabled={asking || !draft.trim()} style={{ ...btn('var(--purple)'), alignSelf: 'stretch' }}><Send size={13} /></button>
            </div>
          </div>
        </>
      )}

      {/* Detail modal */}
      {open && (
        <div onClick={closeDetail} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,40,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 18px', overflowY: 'auto' }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '18px', padding: '24px', maxWidth: '680px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: tint(open) }}>{fmtDate(open.date)}{open.time ? ` · ${fmtTime(open.time)} CT` : ''} · {open.day === 'wed' ? 'Guest' : 'Solo'}</span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '3px', lineHeight: 1.2 }}>{open.number ? `Ep ${open.number}: ` : ''}{open.title}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{open.topic}{open.day === 'wed' && open.guest ? ` · with ${open.guest}` : ''}</p>
                {open.thread ? <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}><strong>Human thread:</strong> {open.thread}</p> : null}
                {open.pushback ? <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '2px' }}><strong>Pushback:</strong> {open.pushback}</p> : null}
                {open.note_id ? <button onClick={() => openBanked(open.note_id!)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--purple)', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0, marginTop: '6px' }}><BookOpen size={12} /> Banked script (Note #{open.note_id})</button> : null}
              </div>
              <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={18} /></button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                <p style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '5px' }}><Mic size={11} /> Teleprompter script</p>
                {open.script && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {editing ? (
                      <>
                        <button onClick={saveScript} disabled={savingScript} style={{ border: 'none', background: 'none', cursor: savingScript ? 'default' : 'pointer', color: 'var(--purple)', fontSize: '11.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>{savingScript ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> saving…</> : <><Check size={12} /> Save</>}</button>
                        <button onClick={() => setEditing(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700 }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setScriptDraft(open.script); setEditing(true) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Pencil size={12} /> Edit</button>
                        <button onClick={async () => { try { await navigator.clipboard.writeText(open.script); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* ignore */ } }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: copied ? 'var(--purple)' : 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>{copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}</button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {open.script ? (
                editing ? (
                  <textarea value={scriptDraft} onChange={e => setScriptDraft(e.target.value)} style={{ width: '100%', minHeight: '340px', resize: 'vertical', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px 18px', fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', fontFamily: 'inherit' }} />
                ) : (
                  <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px 18px', maxHeight: '340px', overflowY: 'auto', fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{open.script}</div>
                )
              ) : (
                <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-subtle)', marginBottom: '12px' }}>No script yet.</p>
                  <button onClick={() => generate(open)} disabled={gen} style={{ border: 'none', background: 'var(--purple)', color: '#fff', borderRadius: '10px', padding: '10px 18px', fontWeight: 800, fontSize: '13px', cursor: gen ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    {gen ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> writing…</> : <><Sparkles size={14} /> Write the script</>}
                  </button>
                </div>
              )}

              {/* Rewrite the FINAL script from raw feedback — not the raw banked input. */}
              {open.script && !editing && (
                <div style={{ marginTop: '10px', background: 'var(--surface-raised)', borderRadius: '12px', padding: '12px 13px' }}>
                  <p style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}><Wand2 size={11} /> Rewrite from your feedback</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reviseScript() } }} rows={2} placeholder="e.g. &quot;punch up the cold open, cut the middle story, make the close about the Sunday Reset&quot;" style={{ flex: 1, resize: 'vertical', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 11px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }} />
                    <button onClick={reviseScript} disabled={revising || !feedback.trim()} style={{ ...btn('var(--purple)'), alignSelf: 'stretch', opacity: feedback.trim() ? 1 : 0.5 }}>{revising ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> rewriting…</> : <><Wand2 size={13} /> Rewrite</>}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Banked script viewer */}
      {banked && (
        <div onClick={closeBanked} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,40,0.6)', zIndex: 110, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 18px', overflowY: 'auto' }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '18px', padding: '24px', maxWidth: '680px', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--purple)' }}>Banked · Note #{banked.id}</span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '3px', lineHeight: 1.25 }}>{banked.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {bankedEditing ? (
                  <>
                    <button onClick={saveBanked} disabled={savingBanked} style={{ border: 'none', background: 'none', cursor: savingBanked ? 'default' : 'pointer', color: 'var(--purple)', fontSize: '11.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>{savingBanked ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> saving…</> : <><Check size={12} /> Save</>}</button>
                    <button onClick={() => setBankedEditing(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700 }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setBankedDraft(banked.body); setBankedEditing(true) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Pencil size={12} /> Edit</button>
                    <button onClick={async () => { try { await navigator.clipboard.writeText(banked.body); setBankedCopied(true); setTimeout(() => setBankedCopied(false), 1400) } catch { /* ignore */ } }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: bankedCopied ? 'var(--purple)' : 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>{bankedCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}</button>
                  </>
                )}
                <button onClick={closeBanked} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={18} /></button>
              </div>
            </div>
            {bankedEditing ? (
              <textarea value={bankedDraft} onChange={e => setBankedDraft(e.target.value)} style={{ width: '100%', minHeight: '50vh', resize: 'vertical', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px 18px', fontSize: '14px', lineHeight: 1.65, color: 'var(--text)', fontFamily: 'inherit' }} />
            ) : (
              <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px 18px', maxHeight: '60vh', overflowY: 'auto', fontSize: '14px', lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{banked.body}</div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
