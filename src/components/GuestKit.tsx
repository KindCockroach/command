'use client'
import { useCallback, useEffect, useState } from 'react'
import { X, Check, Copy, Send, Plus, Trash2, ExternalLink } from 'lucide-react'

// GUEST KIT screens: one guest's card (handles, checklist, questionnaire, follow-up kit) and
// the invite composer (podcast guest or influencer collab). Everything lives on the guest's
// existing card in RISE. Nothing sends without a click, except the questionnaire switch.

export type KitStep = { id: string; text: string; due: string | null; done: string | null; auto: boolean; overdue: boolean }
export type Kit = {
  id: string; name: string; show: string; email: string; kind: 'podcast' | 'collab'
  date: string | null; time: string | null; booking_id: string | null
  handles: { instagram?: string; tiktok?: string; youtube?: string; linkedin?: string; website?: string; other?: string }
  collab_idea: string; steps: KitStep[]; done: number; total: number
  questionnaire: { status: 'not_sent' | 'sent' | 'answered'; sent_at?: string; answered_at?: string; answers?: Record<string, string>; link: string | null }
  followup: { replay_url?: string; episode_url?: string; assets?: { label: string; url: string }[]; caption?: string; sent_at?: string }
  comms: { at: string; subject?: string; status: string; channel: string }[]
}

const api = (body: object) => fetch('/api/guests/kit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }))
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const t12 = (t: string | null) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}` }
const HANDLE_KEYS = ['instagram', 'tiktok', 'youtube', 'linkedin', 'website'] as const
export const handleUrl = (k: string, v: string) => {
  if (/^https?:\/\//.test(v)) return v
  const h = v.replace(/^@/, '')
  return k === 'instagram' ? `https://instagram.com/${h}` : k === 'tiktok' ? `https://tiktok.com/@${h}` : k === 'youtube' ? `https://youtube.com/@${h}` : k === 'linkedin' ? `https://linkedin.com/in/${h}` : `https://${h}`
}
export const HANDLE_ICON: Record<string, string> = { instagram: 'IG', tiktok: 'TT', youtube: 'YT', linkedin: 'in', website: '🔗' }

// ── an email the user reviews before it goes ──
function Composer({ kit, kind, onDone, onCancel }: { kit: Kit; kind: 'questionnaire' | 'followup' | 'invite'; onDone: (k: Kit, msg: string) => void; onCancel: () => void }) {
  const [subject, setSubject] = useState(''), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  useEffect(() => { api({ action: 'template', id: kit.id, kind, invite_kind: kit.kind }).then(d => { setSubject(d.subject || ''); setBody(d.body || '') }) }, [kit.id, kit.kind, kind])
  async function send() {
    if (!kit.email) { setErr('Add their email first.'); return }
    setBusy(true); setErr('')
    const d = await api({ action: 'send', id: kit.id, kind, subject, body })
    setBusy(false)
    if (!d.ok) { setErr(`Not sent: ${d.error || 'unknown error'}. It’s logged as failed on their card, so you can retry.`); if (d.guest) onDone(d.guest, ''); return }
    onDone(d.guest, `Sent to ${kit.email}.`)
  }
  return (
    <div className="gk-compose">
      <label>To<input value={kit.email || '(no email yet)'} readOnly /></label>
      <label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} /></label>
      <label>Message<textarea rows={9} value={body} onChange={e => setBody(e.target.value)} /></label>
      {err && <p className="gk-err">{err}</p>}
      <div className="gk-row">
        <button className="gk-btn primary" onClick={send} disabled={busy || !subject || !body}><Send size={14} /> {busy ? 'Sending…' : 'Send'}</button>
        <button className="gk-btn" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  )
}

export function GuestKitModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const [kit, setKit] = useState<Kit | null>(null)
  const [compose, setCompose] = useState<null | 'questionnaire' | 'followup' | 'invite'>(null)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [asset, setAsset] = useState({ label: '', url: '' })

  const load = useCallback(() => fetch(`/api/guests/kit?id=${id}`).then(r => r.json()).then(d => setKit(d.guest)), [id])
  useEffect(() => { load() }, [load])
  const apply = (k: Kit | undefined, m = '') => { if (k) setKit(k); if (m) setMsg(m); onChanged?.() }

  if (!kit) return <div className="gk-scrim"><style>{css}</style><div className="gk-card"><p>Loading…</p></div></div>
  const pct = Math.round((kit.done / Math.max(1, kit.total)) * 100)
  const save = (patch: object) => api({ action: 'update', id: kit.id, patch }).then(d => apply(d.guest))

  return (
    <div className="gk-scrim" onClick={onClose}>
      <style>{css}</style>
      <div className="gk-card" role="dialog" aria-label={kit.name} onClick={e => e.stopPropagation()}>
        <button className="gk-x" aria-label="Close" onClick={onClose}><X size={18} /></button>
        <span className="gk-tag">{kit.kind === 'collab' ? '🤝 Collaboration' : '🎙 Podcast guest'}{kit.date ? ` · ${day(kit.date)}${kit.time ? `, ${t12(kit.time)}` : ''}` : ' · no date yet'}</span>
        <h3>{kit.name}{kit.show ? <small> · {kit.show}</small> : null}</h3>
        <div className="gk-progress"><i style={{ width: `${pct}%` }} /></div>
        <p className="gk-sub">{kit.done} of {kit.total} done{kit.steps.some(s => s.overdue) ? ` · ${kit.steps.filter(s => s.overdue).length} overdue` : ''}</p>
        {msg && <p className="gk-ok">{msg}</p>}

        <section>
          <h4>At a glance</h4>
          <div className="gk-handles">
            {HANDLE_KEYS.map(k => (
              <label key={k} className="gk-handle">
                <span>{HANDLE_ICON[k]}</span>
                <input placeholder={k} defaultValue={kit.handles[k] || ''} onBlur={e => { if ((e.target.value || '') !== (kit.handles[k] || '')) save({ handles: { [k]: e.target.value.trim() } }) }} />
                {kit.handles[k] && <a href={handleUrl(k, kit.handles[k]!)} target="_blank" rel="noreferrer" aria-label={`Open ${k}`}><ExternalLink size={13} /></a>}
              </label>
            ))}
            <label className="gk-handle"><span>✉️</span><input placeholder="email" defaultValue={kit.email} onBlur={e => { if (e.target.value.trim() !== kit.email) save({ email: e.target.value }) }} /></label>
          </div>
          {kit.kind === 'collab' && (
            <div className="gk-row" style={{ marginTop: 8 }}>
              <label className="gk-inline">Idea<input defaultValue={kit.collab_idea} onBlur={e => e.target.value !== kit.collab_idea && save({ collab_idea: e.target.value })} /></label>
              <label className="gk-inline">Date<input type="date" defaultValue={kit.date || ''} onChange={e => save({ collab_date: e.target.value })} /></label>
            </div>
          )}
          {kit.questionnaire.answers?.bio && <p className="gk-bio">“{kit.questionnaire.answers.bio}”</p>}
        </section>

        <section>
          <h4>Checklist</h4>
          <ul className="gk-steps">
            {kit.steps.map(s => (
              <li key={s.id} className={`${s.done ? 'done' : ''}${s.overdue ? ' late' : ''}`}>
                <button className="gk-box" aria-label={s.done ? `Untick ${s.text}` : `Tick ${s.text}`} onClick={() => api({ action: 'step', id: kit.id, step: s.id, done: !s.done }).then(d => apply(d.guest))}>{s.done && <Check size={12} />}</button>
                <span className="gk-steptxt">{s.text}</span>
                <span className="gk-due">{s.done ? (s.auto ? 'auto ✓' : '✓') : s.due ? day(s.due) : ''}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>Questionnaire <em className={`gk-pill ${kit.questionnaire.status}`}>{kit.questionnaire.status === 'answered' ? 'Answered' : kit.questionnaire.status === 'sent' ? 'Sent, waiting' : 'Not sent'}</em></h4>
          {kit.questionnaire.status === 'answered' && (
            <dl className="gk-answers">{Object.entries(kit.questionnaire.answers || {}).filter(([k]) => !HANDLE_KEYS.includes(k as typeof HANDLE_KEYS[number]) && k !== 'bio').map(([k, v]) => <div key={k}><dt>{k.replace('_', ' ')}</dt><dd>{v}</dd></div>)}</dl>
          )}
          <div className="gk-row">
            {compose !== 'questionnaire' && <button className="gk-btn" onClick={() => setCompose('questionnaire')}><Send size={14} /> {kit.questionnaire.status === 'not_sent' ? 'Send questionnaire' : 'Send it again'}</button>}
            {kit.questionnaire.link && <button className="gk-btn" onClick={() => { navigator.clipboard?.writeText(kit.questionnaire.link!); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}</button>}
          </div>
          {compose === 'questionnaire' && <Composer kit={kit} kind="questionnaire" onDone={(k, m) => { apply(k, m); if (m) setCompose(null) }} onCancel={() => setCompose(null)} />}
        </section>

        <section>
          <h4>Follow-up kit {kit.followup.sent_at && <em className="gk-pill answered">Sent</em>}</h4>
          <div className="gk-grid2">
            <label className="gk-inline">Episode link<input defaultValue={kit.followup.episode_url || ''} placeholder="https://…" onBlur={e => e.target.value !== (kit.followup.episode_url || '') && save({ followup: { episode_url: e.target.value.trim() } })} /></label>
            <label className="gk-inline">Replay link<input defaultValue={kit.followup.replay_url || ''} placeholder="https://…" onBlur={e => e.target.value !== (kit.followup.replay_url || '') && save({ followup: { replay_url: e.target.value.trim() } })} /></label>
          </div>
          <ul className="gk-assets">
            {(kit.followup.assets || []).map((a, i) => (
              <li key={i}><a href={a.url} target="_blank" rel="noreferrer">{a.label}</a>
                <button className="gk-icon" aria-label={`Remove ${a.label}`} onClick={() => save({ followup: { assets: (kit.followup.assets || []).filter((_, j) => j !== i) } })}><Trash2 size={13} /></button></li>
            ))}
          </ul>
          <div className="gk-row">
            <input className="gk-mini" placeholder="Asset name (quote card, clip…)" value={asset.label} onChange={e => setAsset(a => ({ ...a, label: e.target.value }))} />
            <input className="gk-mini" placeholder="Link" value={asset.url} onChange={e => setAsset(a => ({ ...a, url: e.target.value }))} />
            <button className="gk-btn" disabled={!asset.label || !asset.url} onClick={() => { save({ followup: { assets: [...(kit.followup.assets || []), { label: asset.label.trim(), url: asset.url.trim() }] } }); setAsset({ label: '', url: '' }) }}><Plus size={14} /> Add</button>
          </div>
          <label className="gk-inline" style={{ marginTop: 8 }}>Caption they can use<textarea rows={3} defaultValue={kit.followup.caption || ''} onBlur={e => e.target.value !== (kit.followup.caption || '') && save({ followup: { caption: e.target.value } })} /></label>
          {compose !== 'followup' && <button className="gk-btn primary" style={{ marginTop: 8 }} onClick={() => setCompose('followup')}><Send size={14} /> Review and send follow-up</button>}
          {compose === 'followup' && <Composer kit={kit} kind="followup" onDone={(k, m) => { apply(k, m); if (m) setCompose(null) }} onCancel={() => setCompose(null)} />}
        </section>

        {kit.comms.length > 0 && (
          <section>
            <h4>Recent messages</h4>
            <ul className="gk-comms">{kit.comms.map((c, i) => <li key={i} className={c.status}><span>{new Date(c.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>{c.subject || c.channel}<em>{c.status}</em></li>)}</ul>
          </section>
        )}
      </div>
    </div>
  )
}

export function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string, msg: string) => void }) {
  const [kind, setKind] = useState<'podcast' | 'collab'>('podcast')
  const [f, setF] = useState({ name: '', email: '', instagram: '', idea: '', collab_date: '' })
  const [subject, setSubject] = useState(''), [body, setBody] = useState(''), [edited, setEdited] = useState(false)
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')

  // Keep the draft in step with the form until she edits the message herself.
  useEffect(() => {
    if (edited) return
    const h = setTimeout(() => api({ action: 'template', invite_kind: kind, name: f.name || 'there', idea: f.idea }).then(d => { setSubject(d.subject || ''); setBody(d.body || '') }), 250)
    return () => clearTimeout(h)
  }, [kind, f.name, f.idea, edited])

  async function go(send: boolean) {
    if (!f.name.trim()) { setErr('Add their name.'); return }
    if (send && !f.email.trim()) { setErr('Add their email to send, or save without sending.'); return }
    setBusy(true); setErr('')
    const d = await api({ action: 'invite', invite_kind: kind, ...f, send, subject, body })
    setBusy(false)
    if (!d.guest) { setErr(d.error || 'Couldn’t save.'); return }
    if (send && !d.sent) { setErr(`Saved ${f.name}, but the email didn’t send: ${d.error}. It’s logged as failed on their card.`); onCreated(d.guest.id, ''); return }
    onCreated(d.guest.id, send ? `Invite sent to ${f.email}.` : `${f.name} saved. Nothing sent.`)
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(x => ({ ...x, [k]: e.target.value }))

  return (
    <div className="gk-scrim" onClick={onClose}>
      <style>{css}</style>
      <div className="gk-card" role="dialog" aria-label="Invite" onClick={e => e.stopPropagation()}>
        <button className="gk-x" aria-label="Close" onClick={onClose}><X size={18} /></button>
        <h3>Invite someone</h3>
        <div className="gk-seg">
          <button className={kind === 'podcast' ? 'on' : ''} onClick={() => setKind('podcast')}>🎙 Podcast guest</button>
          <button className={kind === 'collab' ? 'on' : ''} onClick={() => setKind('collab')}>🤝 Collaboration</button>
        </div>
        <div className="gk-grid2">
          <label className="gk-inline">Name<input value={f.name} onChange={set('name')} autoFocus /></label>
          <label className="gk-inline">Email<input type="email" value={f.email} onChange={set('email')} /></label>
          <label className="gk-inline">Instagram<input value={f.instagram} onChange={set('instagram')} placeholder="@handle" /></label>
          {kind === 'collab' ? <label className="gk-inline">Date (if known)<input type="date" value={f.collab_date} onChange={set('collab_date')} /></label> : <span />}
        </div>
        <label className="gk-inline">{kind === 'collab' ? 'The collab idea' : 'What you’d love to talk about (optional)'}<input value={f.idea} onChange={set('idea')} /></label>
        <div className="gk-compose">
          <label>Subject<input value={subject} onChange={e => { setEdited(true); setSubject(e.target.value) }} /></label>
          <label>Message<textarea rows={9} value={body} onChange={e => { setEdited(true); setBody(e.target.value) }} /></label>
        </div>
        {kind === 'podcast' && <p className="gk-sub">Podcast invites stay podcast-only: no Reset or Joyful Media offers.</p>}
        {err && <p className="gk-err">{err}</p>}
        <div className="gk-row">
          <button className="gk-btn primary" disabled={busy} onClick={() => go(true)}><Send size={14} /> {busy ? 'Working…' : 'Send invite'}</button>
          <button className="gk-btn" disabled={busy} onClick={() => go(false)}>Save without sending</button>
        </div>
      </div>
    </div>
  )
}

const css = `
.gk-scrim{position:fixed;inset:0;background:rgba(15,18,40,.38);display:flex;justify-content:center;align-items:flex-start;overflow:auto;z-index:80;padding:40px 16px}
.gk-card{position:relative;width:min(620px,100%);background:var(--bg,#fff);color:var(--text,#171C3A);border-radius:20px;padding:22px 22px 18px;box-shadow:0 24px 70px rgba(0,0,0,.28);border-top:5px solid #5A4FCF}
.gk-card h3{margin:4px 0 8px;font-size:20px;font-weight:600;letter-spacing:-.01em;padding-right:30px}
.gk-card h3 small{font-size:14px;font-weight:400;color:var(--text-subtle,#6B6E85)}
.gk-card h4{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-subtle,#6B6E85)}
.gk-card section{border-top:1px solid var(--border,#E7E1D6);padding-top:14px;margin-top:14px}
.gk-x{position:absolute;top:12px;right:12px;border:0;background:none;color:var(--text-subtle,#6B6E85);width:34px;height:34px;border-radius:50%;cursor:pointer;display:grid;place-items:center}
.gk-x:hover{background:rgba(23,28,58,.06)}
.gk-tag{font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--link);text-transform:uppercase}
.gk-progress{height:6px;background:rgba(90,79,207,.12);border-radius:99px;overflow:hidden}
.gk-progress i{display:block;height:100%;background:linear-gradient(90deg,#5A4FCF,#E2508A);border-radius:99px;transition:width .3s}
.gk-sub{font-size:12px;color:var(--text-subtle,#6B6E85);margin:6px 0 0}
.gk-ok{font-size:14px;color:var(--done);margin:8px 0 0;font-weight:600}
.gk-err{font-size:14px;color:var(--bad);margin:8px 0 0}
.gk-handles{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px}
.gk-handle{display:flex;align-items:center;gap:6px;border:1px solid var(--border,#E7E1D6);border-radius:10px;padding:4px 8px}
.gk-handle span{font-size:12px;font-weight:600;color:var(--link);width:20px;text-align:center}
.gk-handle input{flex:1;min-width:0;border:0;background:none;font:inherit;font-size:14px;color:var(--text,#171C3A);padding:4px 0;outline:none}
.gk-handle a{color:var(--text-subtle,#6B6E85);display:grid}
.gk-bio{font-size:14px;font-style:italic;color:var(--text,#171C3A);margin:10px 0 0;line-height:1.5}
.gk-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.gk-steps li{display:flex;align-items:center;gap:10px;padding:6px 6px;border-radius:9px;font-size:14px}
.gk-steps li:hover{background:rgba(23,28,58,.03)}
.gk-box{flex:none;width:20px;height:20px;border-radius:6px;border:1.5px solid var(--border,#CFC8BA);background:var(--bg,#fff);display:grid;place-items:center;cursor:pointer;color:#fff;padding:0}
.gk-steps li.done .gk-box{background:#2F7D5B;border-color:#2F7D5B}
.gk-steps li.done .gk-steptxt{color:var(--text-subtle,#6B6E85);text-decoration:line-through}
.gk-steps li.late .gk-due{color:var(--bad);font-weight:600}
.gk-steptxt{flex:1}
.gk-due{font-size:12px;color:var(--text-subtle,#6B6E85);white-space:nowrap}
.gk-pill{font-style:normal;text-transform:none;letter-spacing:0;font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;background:rgba(138,140,163,.15);color:#6B6E85}
.gk-pill.sent{background:rgba(217,140,43,.15);color:#A56A14}
.gk-pill.answered{background:rgba(47,125,91,.14);color:var(--done)}
.gk-answers{margin:0 0 10px;display:flex;flex-direction:column;gap:8px}
.gk-answers dt{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-subtle,#6B6E85)}
.gk-answers dd{margin:2px 0 0;font-size:14px;line-height:1.5}
.gk-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.gk-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-bottom:8px}
.gk-inline{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-subtle,#6B6E85);flex:1;min-width:160px}
.gk-inline input,.gk-inline textarea,.gk-mini,.gk-compose input,.gk-compose textarea{font:inherit;font-size:14px;text-transform:none;letter-spacing:0;font-weight:400;color:var(--text,#171C3A);background:var(--bg,#fff);border:1px solid var(--border,#E7E1D6);border-radius:10px;padding:8px 10px;width:100%;box-sizing:border-box}
.gk-mini{flex:1;min-width:140px;width:auto}
.gk-compose{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:12px;border-radius:12px;background:rgba(90,79,207,.05)}
.gk-compose label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-subtle,#6B6E85)}
.gk-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border,#E7E1D6);background:var(--bg,#fff);color:var(--text,#171C3A);border-radius:999px;padding:7px 14px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.gk-btn:hover{background:rgba(23,28,58,.04)}
.gk-btn:disabled{opacity:.5;cursor:default}
.gk-btn.primary{background:#5A4FCF;border-color:#5A4FCF;color:#fff}
.gk-btn.primary:hover{background:#4A40B8}
.gk-icon{border:0;background:none;color:var(--text-subtle,#6B6E85);cursor:pointer;padding:4px;border-radius:6px}
.gk-assets{list-style:none;margin:6px 0 8px;padding:0;display:flex;flex-direction:column;gap:4px}
.gk-assets li{display:flex;align-items:center;justify-content:space-between;font-size:14px;padding:4px 8px;border-radius:8px;background:rgba(23,28,58,.03)}
.gk-assets a{color:var(--link);font-weight:600}
.gk-comms{list-style:none;margin:0;padding:0;font-size:12px;display:flex;flex-direction:column;gap:4px}
.gk-comms li{display:flex;gap:10px;align-items:center}
.gk-comms span{color:var(--text-subtle,#6B6E85);width:46px;flex:none}
.gk-comms em{margin-left:auto;font-style:normal;font-size:12px;font-weight:600;color:var(--text-subtle,#6B6E85)}
.gk-comms li.failed em{color:var(--bad)}
.gk-seg{display:inline-flex;border:1px solid var(--border,#E7E1D6);border-radius:999px;padding:3px;margin-bottom:12px}
.gk-seg button{border:0;background:none;font:inherit;font-size:14px;font-weight:600;padding:7px 14px;border-radius:999px;cursor:pointer;color:var(--text-subtle,#6B6E85)}
.gk-seg button.on{background:#5A4FCF;color:#fff}
`
