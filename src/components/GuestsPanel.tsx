'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, Trash2, Copy, Check, Mail, ExternalLink, Image as ImageIcon, Film, Mic, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import FileUpload from './FileUpload'

// GUESTS — every podcast guest prospect in one place: links, handles, contact info,
// the drafted outreach, and a checklist that walks each one from first attempt to
// cross-pollinated. Each guest has a Media sub-tab tied to her own folder in RISE
// (R2 prefix guests/<slug>).
type Stage = 'attempt1' | 'attempt2' | 'attempt3' | 'connected' | 'link_sent' | 'scheduled' | 'promo' | 'reminders' | 'recorded' | 'posted' | 'cross_pollinated' | 'their_show' | 'their_promo'
type Guest = {
  id: string; name: string; show: string; tier?: string; why?: string; ask?: string
  website?: string; instagram?: string; email?: string; contact_notes?: string
  pitch: string; stages: Partial<Record<Stage, string>>; their_show_date?: string
  media_folder: string; notes?: string
}
type MediaFile = { key: string; name: string; type: string; url: string; lastModified: string }

const STAGES: { id: Stage; label: string }[] = [
  { id: 'attempt1', label: 'Contact attempt 1' },
  { id: 'attempt2', label: 'Contact attempt 2' },
  { id: 'attempt3', label: 'Contact attempt 3' },
  { id: 'connected', label: 'Connected & chatting' },
  { id: 'link_sent', label: 'Booking link sent' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'promo', label: 'Promo (our show)' },
  { id: 'reminders', label: 'Episode reminders' },
  { id: 'recorded', label: 'Recorded' },
  { id: 'posted', label: 'Posted' },
  { id: 'cross_pollinated', label: 'Cross-pollinated' },
  { id: 'their_show', label: 'Scheduled on their show' },
  { id: 'their_promo', label: 'Promo (their show)' },
]

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const igUrl = (h: string) => h.startsWith('http') ? h : `https://instagram.com/${h.replace(/^@/, '')}`
const webUrl = (u: string) => u.startsWith('http') ? u : `https://${u}`
const label = { fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-subtle)' }
const input = { width: '100%', border: '1px solid var(--border)', borderRadius: '9px', padding: '7px 10px', fontSize: '12.5px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }

// The pitch's first line can be "Subject: …" — it becomes the email subject.
function splitPitch(p: string): { subject: string; body: string } {
  const m = /^Subject:\s*(.+)\n+/i.exec(p)
  return m ? { subject: m[1].trim(), body: p.slice(m[0].length) } : { subject: 'Guest invite: AI Mom Podcast', body: p }
}

export default function GuestsPanel() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [tab, setTab] = useState<'outreach' | 'media'>('outreach')
  const [copied, setCopied] = useState<string | null>(null)
  const [media, setMedia] = useState<MediaFile[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)

  const load = useCallback(() => {
    fetch('/api/podcast/guests').then(r => r.json()).then(d => setGuests(Array.isArray(d.guests) ? d.guests : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const loadMedia = useCallback(() => {
    setMediaLoading(true)
    fetch('/api/media/list').then(r => r.json()).then(d => setMedia(Array.isArray(d.files) ? d.files : [])).catch(() => {}).finally(() => setMediaLoading(false))
  }, [])

  const save = async (id: string, patch: Partial<Guest>) => {
    setGuests(gs => gs.map(g => g.id === id ? { ...g, ...patch } : g))
    await fetch('/api/podcast/guests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) }).catch(() => {})
  }
  const toggle = (g: Guest, s: Stage) => {
    const stages = { ...g.stages }
    if (stages[s]) delete stages[s]; else stages[s] = today()
    save(g.id, { stages })
  }
  const add = async () => {
    const d = await fetch('/api/podcast/guests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New guest' }) }).then(r => r.json()).catch(() => null)
    if (d?.guest) { setGuests(gs => [...gs, d.guest]); setOpenId(d.guest.id); setTab('outreach') }
  }
  const remove = async (g: Guest) => {
    if (!confirm(`Delete ${g.name}? This removes her card and outreach history (her media files stay in RISE).`)) return
    await fetch(`/api/podcast/guests?id=${g.id}`, { method: 'DELETE' }).catch(() => {})
    setGuests(gs => gs.filter(x => x.id !== g.id)); setOpenId(null)
  }
  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1400) } catch { /* ignore */ }
  }

  const done = (g: Guest) => STAGES.filter(s => g.stages?.[s.id]).length
  const next = (g: Guest) => STAGES.find(s => !g.stages?.[s.id])?.label ?? 'All done'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.01em', background: 'linear-gradient(115deg, #5A4FCF, #C2477E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Guests</h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{guests.length} prospects · pitch from hi@aimomeducation.com · booking link aiworksforher.com/book</p>
        </div>
        <button onClick={add} style={{ border: 'none', background: 'var(--purple)', color: '#fff', borderRadius: '10px', padding: '9px 14px', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Plus size={13} /> Add guest</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading guests…</div>
      ) : guests.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-subtle)', padding: '24px', textAlign: 'center' }}>No guests yet. Add one.</p>
      ) : guests.map(g => {
        const isOpen = openId === g.id
        const n = done(g)
        const files = media.filter(f => f.key.startsWith(`${g.media_folder}/`))
        const { subject, body } = splitPitch(g.pitch || '')
        return (
          <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            {/* Summary row */}
            <button onClick={() => { setOpenId(isOpen ? null : g.id); setTab('outreach') }} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isOpen ? <ChevronDown size={15} style={{ color: 'var(--text-subtle)' }} /> : <ChevronRight size={15} style={{ color: 'var(--text-subtle)' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{g.name}{g.show ? <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}> · {g.show}</span> : null}</p>
                <p style={{ fontSize: '11.5px', color: 'var(--text-subtle)', marginTop: '2px' }}>{g.tier ? `${g.tier} · ` : ''}Next: {next(g)}</p>
              </div>
              <div style={{ width: '110px', flexShrink: 0 }}>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg)', overflow: 'hidden' }}><div style={{ width: `${(n / STAGES.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #5A4FCF, #C2477E)' }} /></div>
                <p style={{ fontSize: '10.5px', color: 'var(--text-subtle)', marginTop: '3px', textAlign: 'right' }}>{n}/{STAGES.length}</p>
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Sub-tabs */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['outreach', 'media'] as const).map(t => (
                    <button key={t} onClick={() => { setTab(t); if (t === 'media') loadMedia() }} style={{ border: '1px solid var(--border)', background: tab === t ? 'var(--purple)' : 'var(--bg)', color: tab === t ? '#fff' : 'var(--text-muted)', borderRadius: '999px', padding: '5px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>{t === 'outreach' ? 'Outreach' : 'Media folder'}</button>
                  ))}
                </div>

                {tab === 'outreach' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* Left: who + contact + pitch */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                      <p style={label}>Who</p>
                      <input defaultValue={g.name} onBlur={e => e.target.value !== g.name && save(g.id, { name: e.target.value })} placeholder="Name" style={input} />
                      <input defaultValue={g.show} onBlur={e => e.target.value !== g.show && save(g.id, { show: e.target.value })} placeholder="Show or brand" style={input} />
                      <textarea defaultValue={g.why} onBlur={e => e.target.value !== g.why && save(g.id, { why: e.target.value })} placeholder="Why she fits" rows={2} style={{ ...input, resize: 'vertical' }} />
                      <input defaultValue={g.ask} onBlur={e => e.target.value !== g.ask && save(g.id, { ask: e.target.value })} placeholder="The ask" style={input} />
                      <p style={{ ...label, marginTop: '4px' }}>Contact</p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input defaultValue={g.website} onBlur={e => e.target.value !== g.website && save(g.id, { website: e.target.value })} placeholder="Website" style={input} />
                        {g.website ? <a href={webUrl(g.website)} target="_blank" rel="noreferrer" style={{ color: 'var(--purple)' }}><ExternalLink size={14} /></a> : null}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input defaultValue={g.instagram} onBlur={e => e.target.value !== g.instagram && save(g.id, { instagram: e.target.value })} placeholder="@instagram" style={input} />
                        {g.instagram ? <a href={igUrl(g.instagram)} target="_blank" rel="noreferrer" style={{ color: 'var(--purple)' }}><ExternalLink size={14} /></a> : null}
                      </div>
                      <input defaultValue={g.email} onBlur={e => e.target.value !== g.email && save(g.id, { email: e.target.value })} placeholder="Email" style={input} />
                      <textarea defaultValue={g.contact_notes} onBlur={e => e.target.value !== g.contact_notes && save(g.id, { contact_notes: e.target.value })} placeholder="Contact notes (best route, guest form, what to verify)" rows={2} style={{ ...input, resize: 'vertical' }} />
                    </div>

                    {/* Right: pipeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <p style={label}>Outreach pipeline</p>
                      {STAGES.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, color: g.stages?.[s.id] ? 'var(--text)' : 'var(--text-muted)' }}>
                            <input type="checkbox" checked={!!g.stages?.[s.id]} onChange={() => toggle(g, s.id)} style={{ accentColor: '#5A4FCF', width: '15px', height: '15px' }} />
                            {s.label}
                          </label>
                          {s.id === 'their_show' ? (
                            <input type="date" defaultValue={g.their_show_date} onBlur={e => e.target.value !== g.their_show_date && save(g.id, { their_show_date: e.target.value })} style={{ ...input, width: '140px', padding: '4px 7px' }} />
                          ) : g.stages?.[s.id] ? <span style={{ fontSize: '10.5px', color: 'var(--text-subtle)' }}>{g.stages[s.id]}</span> : null}
                        </div>
                      ))}
                    </div>

                    {/* Full width: drafted outreach */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={label}>Drafted outreach</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => copy(g.id, g.pitch)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: copied === g.id ? 'var(--purple)' : 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>{copied === g.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}</button>
                          {g.email ? <a href={`mailto:${g.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} style={{ color: 'var(--purple)', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><Mail size={12} /> Open in email</a> : null}
                        </div>
                      </div>
                      <textarea key={`${g.id}-pitch`} defaultValue={g.pitch} onBlur={e => e.target.value !== g.pitch && save(g.id, { pitch: e.target.value })} rows={14} style={{ ...input, fontSize: '13px', lineHeight: 1.55, resize: 'vertical' }} />
                      <textarea defaultValue={g.notes} onBlur={e => e.target.value !== g.notes && save(g.id, { notes: e.target.value })} placeholder="Notes (what she said, dates, follow-ups)" rows={2} style={{ ...input, resize: 'vertical' }} />
                      <button onClick={() => remove(g)} style={{ alignSelf: 'flex-start', border: '1px solid var(--border)', background: 'none', color: '#C2477E', borderRadius: '9px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Trash2 size={12} /> Delete guest</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Her folder in RISE: <code>{g.media_folder}/</code>. Headshots, clips, show art, and the share kit live here.</p>
                    <FileUpload folder={g.media_folder} compact label="Drop her media here" onUploaded={() => loadMedia()} />
                    {mediaLoading ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading her folder…</div>
                    ) : files.length === 0 ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)' }}>Nothing in her folder yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                        {files.map(f => (
                          <a key={f.key} href={f.url} target="_blank" rel="noreferrer" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', textDecoration: 'none', background: 'var(--bg)' }}>
                            {f.type === 'image'
                              ? <img src={f.url} alt={f.name} style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }} />
                              : <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)' }}>{f.type === 'video' ? <Film size={22} /> : f.type === 'audio' ? <Mic size={22} /> : f.type === 'image' ? <ImageIcon size={22} /> : <FileText size={22} />}</div>}
                            <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
