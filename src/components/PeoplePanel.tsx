'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, Search, X, ExternalLink, Save, ChevronDown } from 'lucide-react'
import GuestsPanel from './GuestsPanel'

// PEOPLE — RISE's CRM, replacing GoHighLevel. One list of everyone (signups,
// guests, persons of interest, customers) wearing LABELS, with filters + search.
// The deep podcast-guest workspace lives behind the "Guests" sub-view, unchanged.
type Label = 'free_customer' | 'paid_customer' | 'sub_podcast' | 'sub_btfh' | 'sub_joyful' | 'guest' | 'poi' | 'invited'
type PEvent = { at: string; kind: 'signup' | 'download' | 'sent' | 'received' | 'note'; text: string; status?: string }
type Person = {
  key: string; name: string; email?: string; labels: Label[]; sources: string[]
  instagram?: string; website?: string; phone?: string; why?: string; notes?: string
  guest_id?: string; contact_id?: string; signup_note?: string; events?: PEvent[]; created_at: string
}

const EVENT_ICON: Record<PEvent['kind'], string> = { signup: '✍️', download: '📥', sent: '📤', received: '📨', note: '📝' }
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '' } }

// A person's history timeline — what they signed up for, downloaded, and what we sent.
function Timeline({ events }: { events?: PEvent[] }) {
  if (!events || events.length === 0) return <p style={{ fontSize: '12px', color: 'var(--text-subtle)', margin: '2px 0 0' }}>No history yet.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '12.5px' }}>
          <span style={{ flexShrink: 0 }}>{EVENT_ICON[e.kind]}</span>
          <span style={{ flex: 1, color: 'var(--text)' }}>{e.text}{e.status === 'failed' && <span style={{ color: '#b23b3b', fontWeight: 700 }}> · failed</span>}{e.status === 'drafted' && <span style={{ color: 'var(--text-subtle)' }}> · draft</span>}</span>
          <span style={{ flexShrink: 0, color: 'var(--text-subtle)', fontSize: '11px' }}>{fmtDate(e.at)}</span>
        </div>
      ))}
    </div>
  )
}

const LABEL_TEXT: Record<Label, string> = {
  free_customer: 'Free Customer', paid_customer: 'Paid Customer',
  sub_podcast: 'Subscriber · Podcast', sub_btfh: 'Subscriber · Be There For Her', sub_joyful: 'Subscriber · Joyful Media',
  guest: 'Guest', poi: 'Person of Interest', invited: 'Invited',
}
const LABEL_COLOR: Record<Label, string> = {
  free_customer: '#3DAA7C', paid_customer: '#D97706', sub_podcast: '#5A4FCF', sub_btfh: '#C2693F', sub_joyful: '#E2508A', guest: '#2D6E3E', poi: '#6B7280', invited: '#2563EB',
}
const ALL_LABELS = Object.keys(LABEL_TEXT) as Label[]

const label = { fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-subtle)' }
const input = { width: '100%', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px 11px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' as const }

function Chip({ l, active, onClick }: { l: Label; active?: boolean; onClick?: () => void }) {
  const c = LABEL_COLOR[l]
  return (
    <button onClick={onClick} style={{
      border: `1px solid ${c}`, color: active ? '#fff' : c, background: active ? c : 'transparent',
      borderRadius: '999px', padding: '4px 11px', fontSize: '11.5px', fontWeight: 700, cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit',
    }}>{LABEL_TEXT[l]}</button>
  )
}

export default function PeoplePanel() {
  // Daily Command's "Open guest admin" lands here → jump straight to the guest workspace
  // (GuestsPanel itself consumes the guests-mode flag for admin, so we only peek).
  const [mode, setMode] = useState<'people' | 'guests'>(() => {
    try { if (typeof window !== 'undefined' && sessionStorage.getItem('guests-mode') === 'admin') return 'guests' } catch { /* ignore */ }
    return 'people'
  })
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<Label[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const toggleExp = (k: string) => setExpanded(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  const load = useCallback(async () => {
    setLoading(true)
    const d = await fetch('/api/people').then(r => r.json()).catch(() => ({ people: [] }))
    setPeople(d.people || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const toggleFilter = (l: Label) => setFilters(f => f.includes(l) ? f.filter(x => x !== l) : [...f, l])
  const shown = people.filter(p => {
    if (filters.length && !filters.every(l => p.labels.includes(l))) return false
    if (q.trim()) { const s = q.toLowerCase(); return (p.name + ' ' + (p.email || '') + ' ' + (p.instagram || '')).toLowerCase().includes(s) }
    return true
  })
  const open = people.find(p => p.key === openKey) || null
  const count = (l: Label) => people.filter(p => p.labels.includes(l)).length

  return (
    <div style={{ padding: '4px 2px' }}>
      {/* Header + sub-view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>People</h2>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-subtle, rgba(0,0,0,0.04))', padding: '3px', borderRadius: '10px' }}>
          {(['people', 'guests'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              border: 0, borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: mode === m ? 'var(--accent, #5A4FCF)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-subtle)',
            }}>{m === 'people' ? 'All people' : 'Guest workspace'}</button>
          ))}
        </div>
        {mode === 'people' && <span style={{ ...label, marginLeft: 'auto' }}>{people.length} contacts</span>}
      </div>

      {mode === 'guests' ? <GuestsPanel /> : (
        <>
          {/* Search + add */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, handle…" style={{ ...input, paddingLeft: '30px' }} />
            </div>
            <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 0, borderRadius: '9px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'var(--accent, #5A4FCF)', color: '#fff' }}>
              <Plus size={14} /> Add person
            </button>
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {ALL_LABELS.map(l => count(l) > 0 || filters.includes(l) ? (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Chip l={l} active={filters.includes(l)} onClick={() => toggleFilter(l)} />
                <span style={{ fontSize: '10.5px', color: 'var(--text-subtle)', fontWeight: 700 }}>{count(l)}</span>
              </span>
            ) : null)}
            {filters.length > 0 && <button onClick={() => setFilters([])} style={{ border: 0, background: 'transparent', color: 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>clear</button>}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={20} className="spin" style={{ color: 'var(--text-subtle)' }} /></div>
          ) : shown.length === 0 ? (
            <p style={{ color: 'var(--text-subtle)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>No one matches yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {shown.map(p => {
                const isOpen = expanded.has(p.key)
                const n = p.events?.length || 0
                return (
                  <div key={p.key} style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button onClick={() => setOpenKey(p.key)} style={{
                        display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', flex: 1, minWidth: 0, cursor: 'pointer', fontFamily: 'inherit',
                        border: 0, padding: '11px 14px', background: 'transparent', color: 'var(--text)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || p.email || 'Unnamed'}</div>
                          {p.email && <div style={{ fontSize: '11.5px', color: 'var(--text-subtle)' }}>{p.email}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '55%' }}>
                          {p.labels.map(l => <Chip key={l} l={l} />)}
                        </div>
                      </button>
                      <button onClick={() => toggleExp(p.key)} title="History" style={{
                        display: 'flex', alignItems: 'center', gap: '4px', border: 0, borderLeft: '1px solid var(--border)', background: 'transparent',
                        padding: '0 12px', alignSelf: 'stretch', cursor: 'pointer', color: 'var(--text-subtle)', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700,
                      }}>
                        {n > 0 && <span>{n}</span>}
                        <ChevronDown size={15} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
                      </button>
                    </div>
                    {isOpen && <div style={{ padding: '4px 14px 13px', borderTop: '1px solid var(--border)' }}><Timeline events={p.events} /></div>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {open && <PersonDrawer person={open} onClose={() => setOpenKey(null)} onSaved={() => { setOpenKey(null); load() }} onGuest={() => { setOpenKey(null); setMode('guests') }} />}
      {adding && <AddPerson onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load() }} />}
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// Right-side drawer: see + edit a person. Labels are toggles; why/notes free text.
function PersonDrawer({ person, onClose, onSaved, onGuest }: { person: Person; onClose: () => void; onSaved: () => void; onGuest: () => void }) {
  const [labels, setLabels] = useState<Label[]>(person.labels)
  const [why, setWhy] = useState(person.why || '')
  const [notes, setNotes] = useState(person.notes || '')
  const [busy, setBusy] = useState(false)
  const toggle = (l: Label) => setLabels(ls => ls.includes(l) ? ls.filter(x => x !== l) : [...ls, l])

  const save = async () => {
    setBusy(true)
    // Enriching a signup/guest with no CRM record yet creates one; otherwise patches it.
    if (person.contact_id) {
      await fetch('/api/people', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: person.contact_id, labels, why, notes }) })
    } else {
      await fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: person.name, email: person.email, labels, why, notes }) })
    }
    setBusy(false); onSaved()
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{person.name || person.email || 'Unnamed'}</h3>
          {person.email && <div style={{ fontSize: '12.5px', color: 'var(--text-subtle)' }}>{person.email}</div>}
        </div>
        <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={18} /></button>
      </div>

      {(person.instagram || person.website) && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '12.5px' }}>
          {person.instagram && <a href={person.instagram.startsWith('http') ? person.instagram : `https://instagram.com/${person.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent, #5A4FCF)' }}>{person.instagram} ↗</a>}
          {person.website && <a href={person.website.startsWith('http') ? person.website : `https://${person.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent, #5A4FCF)' }}>website ↗</a>}
        </div>
      )}

      {person.guest_id && (
        <button onClick={onGuest} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '12px', border: `1px solid ${LABEL_COLOR.guest}`, color: LABEL_COLOR.guest, background: 'transparent', borderRadius: '9px', padding: '8px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <ExternalLink size={13} /> Open in Guest workspace
        </button>
      )}

      <p style={{ ...label, margin: '18px 0 8px' }}>Labels</p>
      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>{ALL_LABELS.map(l => <Chip key={l} l={l} active={labels.includes(l)} onClick={() => toggle(l)} />)}</div>

      <p style={{ ...label, margin: '18px 0 8px' }}>History — downloaded, signed up, sent</p>
      <Timeline events={person.events} />

      <p style={{ ...label, margin: '16px 0 6px' }}>Why they matter</p>
      <textarea value={why} onChange={e => setWhy(e.target.value)} rows={2} style={{ ...input, resize: 'vertical' }} placeholder="Why we follow them / why they matter…" />
      <p style={{ ...label, margin: '14px 0 6px' }}>Notes</p>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />

      <button onClick={save} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '16px', border: 0, borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: 'var(--accent, #5A4FCF)', color: '#fff', opacity: busy ? 0.6 : 1 }}>
        {busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
      </button>
    </Overlay>
  )
}

function AddPerson({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', email: '', instagram: '', website: '', why: '' })
  const [labels, setLabels] = useState<Label[]>(['poi'])
  const [busy, setBusy] = useState(false)
  const toggle = (l: Label) => setLabels(ls => ls.includes(l) ? ls.filter(x => x !== l) : [...ls, l])
  const save = async () => {
    if (!f.name && !f.email) return
    setBusy(true)
    await fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, labels }) })
    setBusy(false); onSaved()
  }
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>Add person</h3>
        <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={18} /></button>
      </div>
      <p style={{ ...label, margin: '16px 0 6px' }}>Name</p>
      <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} style={input} />
      <p style={{ ...label, margin: '12px 0 6px' }}>Email</p>
      <input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} style={input} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}><p style={{ ...label, margin: '12px 0 6px' }}>Instagram</p><input value={f.instagram} onChange={e => setF({ ...f, instagram: e.target.value })} style={input} /></div>
        <div style={{ flex: 1 }}><p style={{ ...label, margin: '12px 0 6px' }}>Website</p><input value={f.website} onChange={e => setF({ ...f, website: e.target.value })} style={input} /></div>
      </div>
      <p style={{ ...label, margin: '12px 0 6px' }}>Why they matter</p>
      <textarea value={f.why} onChange={e => setF({ ...f, why: e.target.value })} rows={2} style={{ ...input, resize: 'vertical' }} placeholder="e.g. philosopher I follow to stay informed on AI + ethics" />
      <p style={{ ...label, margin: '16px 0 8px' }}>Labels</p>
      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>{ALL_LABELS.map(l => <Chip key={l} l={l} active={labels.includes(l)} onClick={() => toggle(l)} />)}</div>
      <button onClick={save} disabled={busy || (!f.name && !f.email)} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '18px', border: 0, borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: 'var(--accent, #5A4FCF)', color: '#fff', opacity: (busy || (!f.name && !f.email)) ? 0.6 : 1 }}>
        {busy ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Add
      </button>
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,20,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(440px, 92vw)', height: '100%', overflowY: 'auto', background: 'var(--bg, #fff)', borderLeft: '1px solid var(--border)', padding: '22px 22px 40px', boxShadow: '-20px 0 60px -30px rgba(0,0,0,0.5)' }}>
        {children}
      </div>
    </div>
  )
}
