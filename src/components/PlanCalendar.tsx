'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, UserPlus } from 'lucide-react'
import { GuestKitModal, InviteModal, handleUrl, HANDLE_ICON, type Kit } from './GuestKit'

// The calendar for Cap's plan: Month / Week / Day, Google-Calendar style.
// Drag any piece to another day (or hour, in Week and Day). Only the calendar item
// moves; the content card it points at stays the one Content Day shows.
// Tap a piece to open it: move it by date/time there (works on phones), or jump to Content Day.

type Item = {
  id: string; date: string; time?: string | null; branch_id: 'joyful_media' | 'wfh'; slot: 'reset' | 'podcast' | 'post'
  handle: string; title: string; status: string; has_script: boolean; has_media: boolean; content_id: number
}
type View = 'month' | 'week' | 'day'
type Filter = 'all' | 'joyful_media' | 'wfh'

const BRANCH = {
  joyful_media: { name: 'Joyful Media', color: '#C2693F', soft: 'rgba(194,105,63,0.12)' },
  wfh: { name: 'WFH', color: '#5A4FCF', soft: 'rgba(90,79,207,0.12)' },
} as const
const STATUS: Record<string, { text: string; color: string }> = {
  idea: { text: 'To make', color: '#8A8CA3' }, in_progress: { text: 'In progress', color: '#D98C2B' },
  ready: { text: 'Ready', color: '#2F6FD9' }, approved: { text: 'Approved', color: '#2F6FD9' },
  scheduled: { text: 'Scheduled', color: '#7C4DDB' }, published: { text: 'Posted', color: '#2F7D5B' },
  held: { text: 'Held', color: '#8A8CA3' }, archived: { text: 'Archived', color: '#8A8CA3' }, missing: { text: 'Card missing', color: '#B23A48' },
}
const HOUR_FIRST = 6, HOUR_LAST = 23, HOUR_PX = 52

// ── plain date helpers (YYYY-MM-DD, UTC math so nothing drifts) ──
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`)
const add = (d: string, n: number) => new Date(ms(d) + n * 86400000).toISOString().slice(0, 10)
const localToday = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10) }
const dow = (d: string) => new Date(ms(d)).getUTCDay()
const startOfWeek = (d: string) => add(d, -dow(d))
const startOfMonth = (d: string) => `${d.slice(0, 7)}-01`
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(ms(d)).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' })
const hourLabel = (h: number) => (h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`)
const timeLabel = (t: string) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 || 12; return m ? `${hh}:${String(m).padStart(2, '0')} ${ap}` : `${hh} ${ap}` }
const slotIcon = (s: Item['slot']) => (s === 'reset' ? '🌙 ' : s === 'podcast' ? '🎙 ' : '')

function rangeFor(view: View, anchor: string): [string, string] {
  if (view === 'day') return [anchor, anchor]
  if (view === 'week') { const s = startOfWeek(anchor); return [s, add(s, 6)] }
  const s = startOfWeek(startOfMonth(anchor)); return [s, add(s, 41)]
}

export default function PlanCalendar({ refreshKey = 0 }: { refreshKey?: number }) {
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(localToday())
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Item | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [guests, setGuests] = useState<Kit[]>([])
  const [guestOpen, setGuestOpen] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [gcfg, setGcfg] = useState<{ auto_questionnaire: boolean; questionnaire_days_before: number } | null>(null)
  const today = localToday()
  const [from, to] = rangeFor(view, anchor)

  // Phones open on Day (a 7-column week is too tight to read there).
  useEffect(() => { if (typeof window !== 'undefined' && window.innerWidth < 640) setView('day') }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [d, g] = await Promise.all([
      fetch(`/api/plan?from=${from}&to=${to}`).then(r => r.json()).catch(() => null),
      fetch(`/api/guests/kit?from=${from}&to=${to}`).then(r => r.json()).catch(() => null),
    ])
    setItems(d?.calendar ?? []); setGuests(g?.guests ?? []); setGcfg(g?.config ?? null); setLoading(false)
    if (g?.auto?.sent?.length) flash(`Questionnaire sent automatically to ${g.auto.sent.join(', ')}`)
    if (g?.auto?.failed?.length) flash(`Questionnaire didn’t send: ${g.auto.failed.join('; ')}`)
  }, [from, to])
  useEffect(() => { load() }, [load, refreshKey])

  const shown = useMemo(() => items.filter(i => filter === 'all' || i.branch_id === filter), [items, filter])
  const byDay = useMemo(() => {
    const m: Record<string, Item[]> = {}
    // Joyful Media first inside a day (it wins ties), then by time
    for (const i of [...shown].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || (a.branch_id === 'joyful_media' ? -1 : 1) - (b.branch_id === 'joyful_media' ? -1 : 1))) (m[i.date] ??= []).push(i)
    return m
  }, [shown])

  const guestsByDay = useMemo(() => {
    const m: Record<string, Kit[]> = {}
    if (filter === 'joyful_media') return m   // guests are WFH (podcast) work
    for (const g of guests) if (g.date) (m[g.date] ??= []).push(g)
    return m
  }, [guests, filter])

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2600) }

  async function move(id: string, date: string, time: string | null) {
    const before = items.find(i => i.id === id); if (!before) return
    if (before.date === date && (before.time ?? null) === time) return
    setItems(xs => xs.map(i => (i.id === id ? { ...i, date, time } : i)))   // feels instant
    setOpen(o => (o && o.id === id ? { ...o, date, time } : o))
    const r = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move', id, date, time }) }).then(x => x.json()).catch(() => ({ error: 'Connection hiccup.' }))
    if (r.error) { setItems(xs => xs.map(i => (i.id === id ? before : i))); flash(`Didn’t move: ${r.error}`) }
    else flash(`Moved to ${fmt(date, { weekday: 'short', month: 'short', day: 'numeric' })}${time ? `, ${timeLabel(time)}` : ''}`)
  }

  // drag + drop (desktop). The drop key says where: "YYYY-MM-DD" (keep time) / "YYYY-MM-DD@" (any time) / "YYYY-MM-DD@HH:00".
  const dragProps = (it: Item) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', it.id); e.dataTransfer.effectAllowed = 'move'; setDragId(it.id) },
    onDragEnd: () => { setDragId(null); setOver(null) },
  })
  const dropProps = (key: string) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== key) setOver(key) },
    onDragLeave: () => setOver(o => (o === key ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); setOver(null)
      const id = e.dataTransfer.getData('text/plain') || dragId; if (!id) return
      const [date, t] = key.split('@')
      const keep = items.find(i => i.id === id)?.time ?? null
      move(id, date, key.includes('@') ? (t || null) : keep)
    },
  })

  const step = (n: number) => setAnchor(a => (view === 'day' ? add(a, n) : view === 'week' ? add(a, 7 * n) : (() => { const d = new Date(ms(startOfMonth(a))); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10) })()))
  const title = view === 'month' ? fmt(anchor, { month: 'long', year: 'numeric' })
    : view === 'week' ? (from.slice(0, 7) === to.slice(0, 7) ? `${fmt(from, { month: 'long', day: 'numeric' })} – ${fmt(to, { day: 'numeric' })}, ${from.slice(0, 4)}` : `${fmt(from, { month: 'short', day: 'numeric' })} – ${fmt(to, { month: 'short', day: 'numeric' })}, ${to.slice(0, 4)}`)
    : fmt(anchor, { weekday: 'long', month: 'long', day: 'numeric' })

  const chip = (it: Item, rich = false) => {
    const b = BRANCH[it.branch_id]; const st = STATUS[it.status] ?? { text: it.status, color: '#8A8CA3' }
    return (
      <button key={it.id} {...dragProps(it)} onClick={e => { e.stopPropagation(); setOpen(it) }} className={`pc-chip${dragId === it.id ? ' dragging' : ''}${it.status === 'published' ? ' done' : ''}`}
        style={{ ['--c' as string]: b.color, ['--s' as string]: b.soft }} title={`${it.title} · ${st.text}`}>
        <span className="pc-dot" style={{ background: st.color }} />
        <span className="pc-chip-txt">
          {it.time && <b className="pc-time">{timeLabel(it.time)}</b>}
          {slotIcon(it.slot)}{rich ? it.title : (it.handle ? it.title.replace(`${it.handle}: `, '') : it.title)}
          {rich && <span className="pc-sub">{it.handle || b.name} · {st.text}{it.has_script ? ' · script' : ''}{it.has_media ? ' · media' : ''}</span>}
        </span>
        {!rich && it.handle && <span className="pc-handle">{it.handle.replace(/^@/, '')}</span>}
      </button>
    )
  }

  const guestChip = (g: Kit, rich = false) => (
    <button key={`g-${g.id}`} onClick={e => { e.stopPropagation(); setGuestOpen(g.id) }} className="pc-chip pc-gchip" title={`${g.kind === 'collab' ? 'Collab' : 'Recording'} with ${g.name}`}>
      <span className="pc-dot" style={{ background: g.steps.some(s => s.overdue) ? '#B23A48' : '#5A4FCF' }} />
      <span className="pc-chip-txt">{g.time && <b className="pc-time">{timeLabel(g.time)}</b>}{g.kind === 'collab' ? '🤝 ' : '🎙 '}{rich ? `${g.kind === 'collab' ? 'Collab' : 'Recording'} with ${g.name}` : g.name}
        {rich && <span className="pc-sub">{g.done}/{g.total} checklist · questionnaire {g.questionnaire.status.replace('_', ' ')}</span>}</span>
    </button>
  )

  // ── Month ──
  const month = () => {
    const cells = Array.from({ length: 42 }, (_, k) => add(from, k))
    const ym = anchor.slice(0, 7)
    return (
      <div className="pc-month">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="pc-mhead">{d}</div>)}
        {cells.map(d => {
          const list = byDay[d] ?? []; const gl = guestsByDay[d] ?? []; const extra = list.length + gl.length - 3
          return (
            <div key={d} {...dropProps(d)} onClick={() => { setAnchor(d); setView('day') }} className={`pc-mcell${d.slice(0, 7) !== ym ? ' out' : ''}${over === d ? ' over' : ''}`}>
              <span className={`pc-mnum${d === today ? ' today' : ''}`}>{Number(d.slice(8))}</span>
              <div className="pc-mlist">
                {gl.slice(0, 3).map(g => guestChip(g))}
                {list.slice(0, Math.max(0, 3 - gl.length)).map(it => chip(it))}
                {extra > 0 && <span className="pc-more">+{extra} more</span>}
              </div>
              {list.length > 0 && <div className="pc-mdots">{list.slice(0, 5).map(it => <i key={it.id} style={{ background: BRANCH[it.branch_id].color }} />)}</div>}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Week / Day: an "any time" lane on top, an hour grid below ──
  const grid = (days: string[]) => {
    const hours = Array.from({ length: HOUR_LAST - HOUR_FIRST + 1 }, (_, k) => HOUR_FIRST + k)
    const rich = days.length === 1
    const nowTop = (() => { const n = new Date(); const h = n.getHours() + n.getMinutes() / 60; return h >= HOUR_FIRST && h <= HOUR_LAST + 1 ? (h - HOUR_FIRST) * HOUR_PX : null })()
    return (
      <div className="pc-gridwrap">
        <div className="pc-grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(${rich ? 0 : 110}px, 1fr))` }}>
          <div className="pc-corner" />
          {days.map(d => (
            <button key={d} className={`pc-dhead${d === today ? ' today' : ''}`} onClick={() => { setAnchor(d); setView('day') }}>
              <span>{fmt(d, { weekday: 'short' })}</span><b>{Number(d.slice(8))}</b>
            </button>
          ))}
          <div className="pc-lanelbl">any<br />time</div>
          {days.map(d => (
            <div key={d} {...dropProps(`${d}@`)} className={`pc-lane${over === `${d}@` ? ' over' : ''}`}>
              {(guestsByDay[d] ?? []).filter(g => !g.time).map(g => guestChip(g, rich))}
              {(byDay[d] ?? []).filter(i => !i.time).map(it => chip(it, rich))}
            </div>
          ))}
        </div>
        <div className="pc-grid pc-hours" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(${rich ? 0 : 110}px, 1fr))` }}>
          <div className="pc-hlabels">{hours.map(h => <div key={h} style={{ height: HOUR_PX }}><span>{hourLabel(h)}</span></div>)}</div>
          {days.map(d => (
            <div key={d} className="pc-col">
              {hours.map(h => {
                const key = `${d}@${String(h).padStart(2, '0')}:00`
                return <div key={h} {...dropProps(key)} className={`pc-hcell${over === key ? ' over' : ''}`} style={{ height: HOUR_PX }} />
              })}
              {(byDay[d] ?? []).filter(i => i.time).map(it => {
                const [h, m] = it.time!.split(':').map(Number)
                const top = (Math.max(HOUR_FIRST, Math.min(HOUR_LAST, h)) - HOUR_FIRST + m / 60) * HOUR_PX
                return <div key={it.id} className="pc-timed" style={{ top: top + 2 }}>{chip(it, rich)}</div>
              })}
              {(guestsByDay[d] ?? []).filter(g => g.time).map(g => {
                const [h, m] = g.time!.split(':').map(Number)
                const top = (Math.max(HOUR_FIRST, Math.min(HOUR_LAST, h)) - HOUR_FIRST + (m || 0) / 60) * HOUR_PX
                return <div key={`g-${g.id}`} className="pc-timed" style={{ top: top + 2 }}>{guestChip(g, rich)}</div>
              })}
              {d === today && nowTop !== null && <div className="pc-now" style={{ top: nowTop }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const weekDays = Array.from({ length: 7 }, (_, k) => add(from, k))
  const counts = { all: items.length, joyful_media: items.filter(i => i.branch_id === 'joyful_media').length, wfh: items.filter(i => i.branch_id === 'wfh').length }

  return (
    <div className="pc">
      <style>{css}</style>
      <div className="pc-bar">
        <button className="pc-btn" onClick={() => setAnchor(today)}>Today</button>
        <div className="pc-nav">
          <button className="pc-icon" aria-label="Previous" onClick={() => step(-1)}><ChevronLeft size={18} /></button>
          <button className="pc-icon" aria-label="Next" onClick={() => step(1)}><ChevronRight size={18} /></button>
        </div>
        <h3 className="pc-title">{title}</h3>
        <button className="pc-btn pc-invite" onClick={() => setInviting(true)}><UserPlus size={15} /> Invite</button>
        <div className="pc-seg" role="tablist">
          {(['month', 'week', 'day'] as View[]).map(v => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
        </div>
      </div>
      <div className="pc-filters">
        {(['all', 'joyful_media', 'wfh'] as Filter[]).map(f => (
          <button key={f} className={`pc-pill${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)} style={f !== 'all' ? { ['--c' as string]: BRANCH[f].color } : undefined}>
            {f !== 'all' && <i style={{ background: BRANCH[f].color }} />}{f === 'all' ? 'Everything' : BRANCH[f].name}<span>{counts[f]}</span>
          </button>
        ))}
        <span className="pc-hint">{loading ? 'Loading…' : 'Drag a piece to move it. Tap to open.'}</span>
      </div>

      {view === 'day' && (guestsByDay[anchor] ?? []).length > 0 && (
        <div className="pc-guests">
          {(guestsByDay[anchor] ?? []).map(g => (
            <div key={g.id} className="pc-gcard">
              <div className="pc-gtop">
                <span className="pc-gkind">{g.kind === 'collab' ? '🤝 Collab' : '🎙 Recording'}{g.time ? ` · ${timeLabel(g.time)}` : ''}</span>
                <button className="pc-btn ghost" onClick={() => setGuestOpen(g.id)}>Open kit</button>
              </div>
              <b className="pc-gname">{g.name}</b>
              <div className="pc-ghandles">
                {Object.entries(g.handles).filter(([, v]) => v).map(([k, v]) => <a key={k} href={handleUrl(k, v!)} target="_blank" rel="noreferrer"><i>{HANDLE_ICON[k] ?? '•'}</i>{v}</a>)}
                {g.email && <a href={`mailto:${g.email}`}><i>✉️</i>{g.email}</a>}
              </div>
              <div className="pc-gbar"><i style={{ width: `${Math.round((g.done / Math.max(1, g.total)) * 100)}%` }} /></div>
              <span className="pc-gmeta">{g.done}/{g.total} done · questionnaire {g.questionnaire.status.replace('_', ' ')}{g.steps.some(s => s.overdue) ? ` · ${g.steps.filter(s => s.overdue).length} overdue` : ''}</span>
            </div>
          ))}
        </div>
      )}
      {view === 'month' ? month() : view === 'week' ? grid(weekDays) : grid([anchor])}
      {gcfg && (
        <div className="pc-gcfg">
          <label><input type="checkbox" checked={gcfg.auto_questionnaire} onChange={async e => {
            const on = e.target.checked
            if (on && !confirm('Send the guest questionnaire automatically to booked podcast guests who haven’t had one? It goes out when you open RISE, within the days you set.')) return
            const d = await fetch('/api/guests/kit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'config', patch: { auto_questionnaire: on } }) }).then(r => r.json())
            setGcfg(d.config); flash(on ? 'Guest questionnaires will send automatically.' : 'Automatic questionnaires are off.')
          }} /> Send the guest questionnaire automatically</label>
          <label><input type="number" min={1} max={30} value={gcfg.questionnaire_days_before} onChange={async e => {
            const d = await fetch('/api/guests/kit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'config', patch: { questionnaire_days_before: Number(e.target.value) } }) }).then(r => r.json())
            setGcfg(d.config)
          }} /> days before recording</label>
        </div>
      )}
      {!loading && !items.length && <p className="pc-empty">Nothing here yet. Approve Cap’s plans above, then press “Fill the calendar.”</p>}

      {open && (
        <div className="pc-scrim" onClick={() => setOpen(null)}>
          <div className="pc-card" role="dialog" aria-label={open.title} onClick={e => e.stopPropagation()} style={{ ['--c' as string]: BRANCH[open.branch_id].color }}>
            <button className="pc-icon pc-x" aria-label="Close" onClick={() => setOpen(null)}><X size={18} /></button>
            <span className="pc-tag">{slotIcon(open.slot)}{BRANCH[open.branch_id].name}{open.handle ? ` · ${open.handle}` : ''}</span>
            <h4>{open.title}</h4>
            <p className="pc-meta"><span className="pc-dot" style={{ background: (STATUS[open.status] ?? STATUS.idea).color }} />{(STATUS[open.status] ?? { text: open.status }).text}{open.has_script ? ' · has a script' : ' · no script yet'}{open.has_media ? ' · media attached' : ''}</p>
            <div className="pc-move">
              <label>Day<input type="date" value={open.date} onChange={e => e.target.value && move(open.id, e.target.value, open.time ?? null)} /></label>
              <label>Time<input type="time" step={900} value={open.time ?? ''} onChange={e => move(open.id, open.date, e.target.value || null)} /></label>
              {open.time && <button className="pc-btn ghost" onClick={() => move(open.id, open.date, null)}>Any time</button>}
            </div>
            <button className="pc-btn primary" onClick={() => { setOpen(null); window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view: 'contentday' } })) }}>Open in Content Day →</button>
            <p className="pc-foot">Card #{open.content_id}. Moving it here never copies the card.</p>
          </div>
        </div>
      )}
      {guestOpen && <GuestKitModal id={guestOpen} onClose={() => setGuestOpen(null)} onChanged={load} />}
      {inviting && <InviteModal onClose={() => setInviting(false)} onCreated={(id, m) => { setInviting(false); if (m) flash(m); load(); setGuestOpen(id) }} />}
      {toast && <div className="pc-toast" role="status">{toast}</div>}
    </div>
  )
}

const css = `
.pc{--pc-bg:var(--bg,#fff);--pc-line:var(--border,#E7E1D6);--pc-text:var(--text,#171C3A);--pc-sub:var(--text-subtle,#6B6E85);--pc-wash:rgba(23,28,58,0.03);color:var(--pc-text);font-family:inherit;position:relative}
.pc button{font-family:inherit}
.pc-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.pc-btn{border:1px solid var(--pc-line);background:var(--pc-bg);color:var(--pc-text);border-radius:999px;padding:7px 16px;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s,box-shadow .15s}
.pc-btn:hover{background:var(--pc-wash);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.pc-btn.primary{background:var(--c,#5A4FCF);border-color:var(--c,#5A4FCF);color:#fff;width:100%;padding:10px 16px;margin-top:6px}
.pc-btn.ghost{padding:6px 12px;font-size:12px}
.pc-nav{display:flex;gap:2px}
.pc-icon{border:0;background:none;color:var(--pc-sub);width:34px;height:34px;border-radius:50%;display:grid;place-items:center;cursor:pointer;transition:background .15s}
.pc-icon:hover{background:var(--pc-wash);color:var(--pc-text)}
.pc-title{margin:0 auto 0 4px;font-size:20px;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
.pc-seg{display:inline-flex;border:1px solid var(--pc-line);border-radius:999px;padding:3px;gap:2px;background:var(--pc-bg)}
.pc-seg button{border:0;background:none;color:var(--pc-sub);font-size:13px;font-weight:700;padding:6px 14px;border-radius:999px;cursor:pointer;transition:all .15s}
.pc-seg button.on{background:var(--pc-text);color:var(--pc-bg)}
.pc-filters{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.pc-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--pc-line);background:var(--pc-bg);color:var(--pc-sub);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;cursor:pointer}
.pc-pill i{width:8px;height:8px;border-radius:50%}
.pc-pill span{font-weight:600;opacity:.7}
.pc-pill.on{color:var(--pc-text);border-color:var(--c,var(--pc-text));box-shadow:inset 0 0 0 1px var(--c,var(--pc-text))}
.pc-hint{margin-left:auto;font-size:12px;color:var(--pc-sub)}
.pc-empty{text-align:center;color:var(--pc-sub);font-size:13px;margin:14px 0}

.pc-chip{all:unset;box-sizing:border-box;display:flex;align-items:flex-start;gap:6px;width:100%;padding:4px 7px 4px 8px;border-radius:7px;background:var(--s);border-left:3px solid var(--c);font-size:12px;line-height:1.3;color:var(--pc-text);cursor:grab;transition:transform .12s,box-shadow .12s,opacity .12s}
.pc-chip:hover{box-shadow:0 2px 8px rgba(0,0,0,.10);transform:translateY(-1px)}
.pc-chip:focus-visible{outline:2px solid var(--c);outline-offset:1px}
.pc-chip.dragging{opacity:.35}
.pc-chip.done .pc-chip-txt{text-decoration:line-through;opacity:.6}
.pc-dot{flex:none;width:7px;height:7px;border-radius:50%;margin-top:4px;display:inline-block}
.pc-chip-txt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-time{font-weight:800;margin-right:4px}
.pc-handle{flex:none;font-size:10px;font-weight:700;color:var(--c);opacity:.85;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-sub{display:block;font-size:11px;color:var(--pc-sub);margin-top:1px;white-space:normal}

.pc-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:1px solid var(--pc-line);border-radius:14px;overflow:hidden;background:var(--pc-bg)}
.pc-mhead{padding:8px 0;text-align:center;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pc-sub);border-bottom:1px solid var(--pc-line)}
.pc-mcell{min-height:112px;padding:6px;border-right:1px solid var(--pc-line);border-bottom:1px solid var(--pc-line);display:flex;flex-direction:column;gap:4px;cursor:pointer;transition:background .12s;min-width:0}
.pc-mcell:nth-child(7n){border-right:0}
.pc-mcell.out{background:var(--pc-wash)}
.pc-mcell.out .pc-mnum{opacity:.45}
.pc-mcell:hover{background:var(--pc-wash)}
.pc-mcell.over,.pc-lane.over,.pc-hcell.over{background:rgba(90,79,207,0.10);box-shadow:inset 0 0 0 2px rgba(90,79,207,0.45)}
.pc-mnum{align-self:flex-start;font-size:12px;font-weight:700;width:24px;height:24px;display:grid;place-items:center;border-radius:50%}
.pc-mnum.today,.pc-dhead.today b{background:#E2508A;color:#fff}
.pc-mlist{display:flex;flex-direction:column;gap:3px;min-width:0}
.pc-more{font-size:11px;font-weight:700;color:var(--pc-sub);padding-left:4px}
.pc-mdots{display:none;gap:3px;justify-content:center}
.pc-mdots i{width:6px;height:6px;border-radius:50%}

.pc-gridwrap{border:1px solid var(--pc-line);border-radius:14px;background:var(--pc-bg);overflow:auto;max-height:72vh}
.pc-grid{display:grid;min-width:0}
.pc-corner,.pc-lanelbl{border-bottom:1px solid var(--pc-line)}
.pc-dhead{all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0 6px;border-bottom:1px solid var(--pc-line);border-left:1px solid var(--pc-line);position:sticky;top:0;background:var(--pc-bg);z-index:2}
.pc-dhead span{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pc-sub)}
.pc-dhead b{font-size:20px;font-weight:600;width:36px;height:36px;display:grid;place-items:center;border-radius:50%}
.pc-dhead:hover b{background:var(--pc-wash)}
.pc-lanelbl{font-size:10px;line-height:1.15;color:var(--pc-sub);text-align:right;padding:8px 8px 0 0;text-transform:uppercase;letter-spacing:.04em}
.pc-lane{min-height:44px;padding:5px;display:flex;flex-direction:column;gap:3px;border-left:1px solid var(--pc-line);border-bottom:2px solid var(--pc-line);transition:background .12s}
.pc-hlabels div{position:relative}
.pc-hlabels span{position:absolute;top:-7px;right:8px;font-size:10.5px;color:var(--pc-sub)}
.pc-hlabels div:first-child span{display:none}
.pc-col{position:relative;border-left:1px solid var(--pc-line)}
.pc-hcell{border-bottom:1px solid var(--pc-line);transition:background .12s}
.pc-hcell:hover{background:var(--pc-wash)}
.pc-timed{position:absolute;left:3px;right:3px;z-index:1}
.pc-now{position:absolute;left:0;right:0;height:2px;background:#E2508A;z-index:1;pointer-events:none}
.pc-now::before{content:'';position:absolute;left:-5px;top:-4px;width:10px;height:10px;border-radius:50%;background:#E2508A}

.pc-scrim{position:fixed;inset:0;background:rgba(15,18,40,.35);display:grid;place-items:center;z-index:60;padding:16px;animation:pcfade .15s ease}
.pc-card{position:relative;width:min(420px,100%);background:var(--pc-bg);color:var(--pc-text);border-radius:18px;padding:20px 20px 16px;box-shadow:0 20px 60px rgba(0,0,0,.25);border-top:5px solid var(--c);animation:pcpop .18s ease}
.pc-x{position:absolute;top:10px;right:10px}
.pc-tag{font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--c);text-transform:uppercase}
.pc-card h4{margin:6px 0 6px;font-size:18px;line-height:1.3;padding-right:28px}
.pc-meta{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--pc-sub);margin:0 0 14px}
.pc-meta .pc-dot{margin:0}
.pc-move{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px}
.pc-move label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:var(--pc-sub);text-transform:uppercase;letter-spacing:.04em}
.pc-move input{font:inherit;font-size:14px;color:var(--pc-text);background:var(--pc-bg);border:1px solid var(--pc-line);border-radius:10px;padding:8px 10px}
.pc-foot{font-size:11px;color:var(--pc-sub);margin:10px 0 0;text-align:center}
.pc-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#171C3A;color:#fff;font-size:13px;font-weight:600;padding:10px 18px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:70;animation:pcfade .15s ease}

.pc-invite{display:inline-flex;align-items:center;gap:6px;background:#5A4FCF;border-color:#5A4FCF;color:#fff}
.pc-invite:hover{background:#4A40B8}
.pc-gchip{--c:#5A4FCF;--s:#fff;border:1px solid rgba(90,79,207,.35);border-left:3px solid #5A4FCF;cursor:pointer}
.pc-guests{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:12px}
.pc-gcard{border:1px solid rgba(90,79,207,.25);background:linear-gradient(180deg,rgba(90,79,207,.06),transparent);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.pc-gtop{display:flex;align-items:center;justify-content:space-between}
.pc-gkind{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#5A4FCF}
.pc-gname{font-size:16px}
.pc-ghandles{display:flex;flex-wrap:wrap;gap:5px}
.pc-ghandles a{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--pc-text);text-decoration:none;border:1px solid var(--pc-line);border-radius:999px;padding:3px 9px;background:var(--pc-bg);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-ghandles a:hover{border-color:#5A4FCF}
.pc-ghandles i{font-style:normal;font-size:10px;font-weight:800;color:#5A4FCF}
.pc-gbar{height:5px;border-radius:99px;background:rgba(90,79,207,.12);overflow:hidden}
.pc-gbar i{display:block;height:100%;background:linear-gradient(90deg,#5A4FCF,#E2508A)}
.pc-gmeta{font-size:12px;color:var(--pc-sub)}
.pc-gcfg{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:10px;font-size:12.5px;color:var(--pc-sub)}
.pc-gcfg label{display:inline-flex;align-items:center;gap:6px}
.pc-gcfg input[type=number]{width:52px;font:inherit;padding:3px 6px;border:1px solid var(--pc-line);border-radius:7px;background:var(--pc-bg);color:var(--pc-text)}
@keyframes pcfade{from{opacity:0}to{opacity:1}}
@keyframes pcpop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}

@media (max-width:1100px){ .pc-grid .pc-handle{display:none} }
@media (max-width:640px){
  .pc-title{font-size:17px;order:5;width:100%;margin:2px 0 0}
  .pc-hint{display:none}
  .pc-mcell{min-height:64px;padding:4px}
  .pc-mlist{display:none}
  .pc-mdots{display:flex}
  .pc-mnum{align-self:center}
}
`
