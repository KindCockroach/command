'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Upload, Check, RotateCcw, Eye, Send, Pencil, X } from 'lucide-react'
import { TalkToCapButton, TalkToCapThread } from './TalkToCap'

// PHASE 5 — People → "Reset · Luma import" (part="people") and Campaigns → Reset emails (part="emails").
// 1) Import a Luma guest export (preview first: new / merged / skipped and why).
// 2) The two branch lists, side by side (they never mix).
// 3) Cap's welcome + six-touch sequence: Cap briefs → Ed writes → Cap confirms → you approve.
// 4) A dry run: who would get each touch, who is skipped and why. Nothing sends from here
//    unless you approve the draft, switch it live, and type SEND.

type PreviewRow = { line: number; email: string; name: string; action: 'new' | 'merged' | 'skipped'; why: string; attended?: boolean; consent?: string; attendance_after?: number }
type Preview = {
  event: { id: string; name: string; date: string; exists: boolean }
  consent_column: string | null
  counts: Record<string, number>
  warnings: string[]
  rows: PreviewRow[]
}
type ResetEvent = { id: string; name: string; date: string; counts?: { rows: number; registered: number; attended: number; invited: number } }
type Email = {
  key: string; branch: 'joyful_media' | 'wfh'; title: string; day_offset: number | null; brief: string
  subject: string; preheader: string; body: string; cta_label: string; cta: string; ps: string; extras: Record<string, string>
  status: 'brief' | 'writing' | 'review' | 'sent_back' | 'confirmed' | 'approved'; round: number; cap_reasons: string[]; cap_notes: string[]
  written_by: 'ed' | 'mandi' | null; check: { reasons: string[]; notes: string[] } | null
}
type Settings = {
  coupon_code: string; next_reset_url: string; survey_url: string; nine_url: string; pass_url: string
  gift_name: string; gift_url: string; medium_url: string; podcast_url: string; next_reset_date?: string
  sequence_live: boolean; welcome_live: { joyful_media: boolean; wfh: boolean }
}
type Decision = { email: string; name: string; reason: string; segment?: string }
type Touch = { key: string; title: string; send_on: string; due: boolean; blockers: string[]; send: Decision[]; skip: Decision[] }
type Dry = { event: ResetEvent; next_event: ResetEvent | null; today: string; touches: Touch[]; totals: { would_send: number; skipped: number }; live: boolean }
type Person = { email?: string; lists?: string[] }

const label = { fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-subtle)' }
const input = { width: '100%', border: '1px solid var(--border)', borderRadius: '9px', padding: '7px 10px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' as const }
const card = { border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg)', padding: '14px 16px', marginBottom: '14px' }
const btn = (primary = false) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', border: primary ? 0 : '1px solid var(--border)', borderRadius: '9px', padding: '7px 13px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: primary ? 'var(--accent, #5A4FCF)' : 'transparent', color: primary ? '#fff' : 'var(--text)' })
const STATUS_TEXT: Record<Email['status'], string> = { brief: 'Not written yet', writing: 'Ed is writing…', review: 'Cap is checking…', sent_back: '↩ Cap sent it back to Ed', confirmed: '✓ Cap confirmed · waiting for you', approved: '✓ You approved it' }
const ACTION_COLOR: Record<PreviewRow['action'], string> = { new: '#3DAA7C', merged: '#5A4FCF', skipped: '#b23b3b' }

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.json().catch(() => ({ error: 'No answer.' }))
}

// part: 'people' (People tab: Luma import + lists) · 'emails' (Campaigns: the sequence, settings,
// dry run, welcomes). Emails live in Campaigns; who's on which list lives in People.
export default function ResetPeoplePanel({ onImported, part = 'people' }: { onImported?: () => void; part?: 'people' | 'emails' }) {
  const [events, setEvents] = useState<ResetEvent[]>([])
  const [emails, setEmails] = useState<Email[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [nextDate, setNextDate] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([
      fetch('/api/reset-sequence').then(r => r.json()).catch(() => ({})),
      fetch('/api/people').then(r => r.json()).catch(() => ({ people: [] })),
    ])
    setEvents(s.events || []); setEmails(s.emails || []); setSettings(s.settings || null); setNextDate(s.next_reset_date || null); setPeople(p.people || [])
  }, [])
  useEffect(() => { load() }, [load])
  // While Ed or Cap is working, look again every few seconds.
  useEffect(() => {
    if (!emails.some(e => e.status === 'writing' || e.status === 'review' || e.status === 'sent_back')) return
    const t = setTimeout(load, 4000)
    return () => clearTimeout(t)
  }, [emails, load])

  const joyful = people.filter(p => p.lists?.includes('joyful_media')).length
  const wfh = people.filter(p => p.lists?.includes('wfh')).length
  const both = people.filter(p => p.lists?.includes('joyful_media') && p.lists?.includes('wfh')).length

  return (
    <div>
      {msg && <div style={{ ...card, background: 'rgba(90,79,207,0.06)', fontSize: '12.5px' }}>{msg} <button onClick={() => setMsg('')} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={12} /></button></div>}
      {part === 'people' && <>
      <LumaImport onDone={() => { load(); onImported?.() }} />

      <div style={card}>
        <p style={{ ...label, margin: '0 0 8px' }}>Email lists by branch (they never mix)</p>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '13px' }}>
          <span><strong>{joyful}</strong> on the Joyful Media list</span>
          <span><strong>{wfh}</strong> on the WFH (podcast) list</span>
          <span style={{ color: 'var(--text-subtle)' }}>{both} on both (joined each herself)</span>
        </div>
        <p style={{ fontSize: '11.5px', color: 'var(--text-subtle)', margin: '8px 0 0' }}>
          Joyful Media = subscribed to Be There For Her / Joyful Media, a Wellspring member, a pass holder, or Luma consent = yes. WFH = subscribed to the podcast. A podcast listener never gets Reset email unless she&rsquo;s on the Joyful Media list too. Being a guest or a Reset attendee alone isn&rsquo;t a list.
        </p>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-subtle)', margin: '4px 2px 12px' }}>The Reset emails (drafts, settings, dry run, welcomes) live in Campaigns → Reset emails.</p>
      </>}

      {part === 'emails' && <>
      {settings && <SettingsCard settings={settings} nextDate={nextDate} onSaved={s => setSettings(s)} />}

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <p style={{ ...label, margin: 0, flex: 1 }}>Cap&rsquo;s emails · Cap briefs → Ed writes → Cap checks → you approve</p>
          <button style={btn(true)} onClick={async () => {
            const r = await post('/api/reset-sequence', { action: 'brief' })
            setMsg(r.error || `Cap briefed Ed on ${r.opened?.length ?? 0} email(s).${r.skipped?.length ? ' Left alone: ' + r.skipped.join('; ') : ''}`); load()
          }}><RotateCcw size={13} /> Cap: brief Ed on the drafts</button>
        </div>
        {emails.map(e => <EmailCard key={e.key} e={e} onChange={load} onMsg={setMsg} />)}
      </div>

      <DryRunCard events={events} live={!!settings?.sequence_live} onMsg={setMsg} />
      <WelcomeCard onMsg={setMsg} />
      </>}
    </div>
  )
}

function LumaImport({ onDone }: { onDone: () => void }) {
  const [csv, setCsv] = useState('')
  const [filename, setFilename] = useState('')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [pv, setPv] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const [showAll, setShowAll] = useState(false)

  const preview = async (text = csv, fn = filename, n = name, d = date) => {
    setBusy(true); setErr(''); setDone('')
    const r = await post('/api/people/luma', { csv: text, filename: fn, event_name: n || undefined, event_date: d || undefined })
    setBusy(false)
    if (r.error) { setErr(r.error); setPv(null); return }
    setPv(r.preview); setName(r.preview.event.name); setDate(r.preview.event.date)
  }
  const pick = async (f: File | undefined) => {
    if (!f) return
    const text = await f.text()
    setCsv(text); setFilename(f.name); setName(''); setDate('')
    preview(text, f.name, '', '')
  }
  const apply = async () => {
    setBusy(true)
    const r = await post('/api/people/luma', { csv, filename, event_name: name, event_date: date, apply: true })
    setBusy(false)
    if (r.error) { setErr(r.error); return }
    const c = r.applied.counts
    setDone(`Imported: ${c.new} new, ${c.merged} merged, ${c.skipped} skipped. ${c.attended} attended. db.json was backed up first.`)
    setPv(null); setCsv(''); onDone()
  }
  const rows = pv ? (showAll ? pv.rows : pv.rows.slice(0, 12)) : []
  return (
    <div style={card}>
      <p style={{ ...label, margin: '0 0 8px' }}>Import a Luma guest list</p>
      <p style={{ fontSize: '12px', color: 'var(--text-subtle)', margin: '0 0 10px' }}>On Luma: your event → Guests → Export (CSV). Drop it here; you&rsquo;ll see what it would do before anything is written. Export again after the Reset so attendance (check-in) is in it.</p>
      <label style={{ ...btn(true), display: 'inline-flex' }}>
        <Upload size={13} /> Choose the CSV
        <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => pick(e.target.files?.[0])} />
      </label>
      {filename && <span style={{ fontSize: '12px', color: 'var(--text-subtle)', marginLeft: '10px' }}>{filename}</span>}
      {busy && <Loader2 size={14} className="spin" style={{ marginLeft: 10 }} />}
      {err && <p style={{ color: '#b23b3b', fontSize: '12.5px', margin: '10px 0 0' }}>{err}</p>}
      {done && <p style={{ color: '#2D6E3E', fontSize: '12.5px', margin: '10px 0 0', fontWeight: 700 }}>{done}</p>}
      {pv && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 2, minWidth: 180 }}><p style={{ ...label, margin: '0 0 4px' }}>Which Reset</p><input style={input} value={name} onChange={e => setName(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 140 }}><p style={{ ...label, margin: '0 0 4px' }}>Its date (Sunday)</p><input type="date" style={input} value={date} onChange={e => setDate(e.target.value)} /></div>
            <button style={btn()} onClick={() => preview()}>Preview again</button>
          </div>
          <p style={{ fontSize: '13px', margin: '12px 0 6px' }}>
            <strong style={{ color: ACTION_COLOR.new }}>{pv.counts.new} new</strong> · <strong style={{ color: ACTION_COLOR.merged }}>{pv.counts.merged} merged</strong> · <strong style={{ color: ACTION_COLOR.skipped }}>{pv.counts.skipped} skipped</strong>
            <span style={{ color: 'var(--text-subtle)' }}> &nbsp;|&nbsp; {pv.counts.registered} registered · {pv.counts.attended} attended · {pv.counts.invited} invited only · consent yes {pv.counts.consent_yes} / no {pv.counts.consent_no} / unknown {pv.counts.consent_unknown}</span>
          </p>
          {pv.warnings.map((w, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--gold)', background: 'rgba(217,119,6,0.08)', borderRadius: 8, padding: '7px 10px', margin: '6px 0' }}>⚠︎ {w}</p>)}
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 9, marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {rows.map(r => (
                  <tr key={r.line} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', color: ACTION_COLOR[r.action], fontWeight: 800, whiteSpace: 'nowrap' }}>{r.action}</td>
                    <td style={{ padding: '6px 8px' }}>{r.name || '—'}<div style={{ color: 'var(--text-subtle)' }}>{r.email}</div></td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-subtle)' }}>{r.why}{r.attendance_after ? ` Resets attended after: ${r.attendance_after}.` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pv.rows.length > 12 && <button style={{ ...btn(), marginTop: 6 }} onClick={() => setShowAll(v => !v)}>{showAll ? 'Show fewer' : `Show all ${pv.rows.length}`}</button>}
          <div style={{ marginTop: 12 }}>
            <button style={btn(true)} disabled={busy} onClick={apply}><Check size={13} /> Import {pv.counts.new + pv.counts.merged} people into People</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsCard({ settings, nextDate, onSaved }: { settings: Settings; nextDate: string | null; onSaved: (s: Settings) => void }) {
  const [f, setF] = useState(settings)
  const [saved, setSaved] = useState('')
  const field = (k: keyof Settings, text: string, hint?: string) => (
    <div style={{ flex: 1, minWidth: 200 }}>
      <p style={{ ...label, margin: '8px 0 4px' }}>{text}</p>
      <input style={input} value={String(f[k] ?? '')} placeholder={hint} onChange={e => setF({ ...f, [k]: e.target.value })} />
    </div>
  )
  const save = async (patch: Partial<Settings>) => {
    const r = await post('/api/reset-sequence', { action: 'settings', settings: patch })
    if (r.settings) { onSaved(r.settings); setF(r.settings); setSaved('Saved.') }
  }
  return (
    <div style={card}>
      <p style={{ ...label, margin: 0 }}>What the emails need from you</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {field('coupon_code', '$8 returning coupon code (on Luma)', 'the code that makes $33 → $25')}
        {field('nine_url', 'Link: Listen To Your Intuition ($9)', 'blank = touch 2 holds')}
        {field('pass_url', 'Link: the $44/month pass', 'blank = no pass offer')}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {field('gift_name', 'Touch 6 free gift: name', 'e.g. a 6-minute guided practice')}
        {field('gift_url', 'Touch 6 free gift: link')}
        {field('medium_url', 'Pass holders: a Medium story link')}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <p style={{ ...label, margin: '8px 0 4px' }}>Next Reset date</p>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{nextDate ? new Date(`${nextDate}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Not on the calendar yet'}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-subtle)' }}>From your calendar (every other Sunday). Fills in the date in every email and moves ahead by itself.</p>
        </div>
        {field('next_reset_url', '"Save your seat" link (Luma)')}
        {field('survey_url', 'Survey link')}
        {field('podcast_url', 'WFH welcome: podcast link')}
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button style={btn(true)} onClick={() => { const { sequence_live, welcome_live, ...rest } = f; void sequence_live; void welcome_live; save(rest) }}>Save</button>
        {saved && <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{saved}</span>}
      </div>
      <p style={{ ...label, margin: '16px 0 6px' }}>Live switches (all off until you say so)</p>
      {([['sequence_live', 'The six-touch Reset sequence'], ['joyful_media', 'Joyful Media welcome on signup'], ['wfh', 'WFH welcome on signup']] as const).map(([k, t]) => {
        const on = k === 'sequence_live' ? settings.sequence_live : settings.welcome_live[k]
        return (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '4px 0' }}>
            <input type="checkbox" checked={on} onChange={e => {
              const v = e.target.checked
              if (v && !confirm(`Switch "${t}" live? Real emails can then go to real people (approved drafts only).`)) return
              save(k === 'sequence_live' ? { sequence_live: v } : { welcome_live: { ...settings.welcome_live, [k]: v } })
            }} />
            {t} <span style={{ color: on ? '#b23b3b' : 'var(--text-subtle)', fontWeight: 700 }}>{on ? 'LIVE' : 'off'}</span>
          </label>
        )
      })}
    </div>
  )
}

function EmailCard({ e, onChange, onMsg }: { e: Email; onChange: () => void; onMsg: (m: string) => void }) {
  const [sweeping, setSweeping] = useState(false)   // Cap's spelling + punctuation sweep on save
  const [editing, setEditing] = useState(false)
  const [talk, setTalk] = useState(false)
  const [f, setF] = useState(e)
  const [seg, setSeg] = useState(e.branch === 'wfh' || e.key.startsWith('welcome') ? 'list' : 'returning')
  useEffect(() => { if (!editing) setF(e) }, [e, editing])
  const segs = e.key.startsWith('welcome') ? ['list'] : ['returning', 'pass_eligible', 'pass_holder']
  const working = e.status === 'writing' || e.status === 'review' || e.status === 'sent_back'
  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13.5 }}>{e.title}</strong>
        {e.day_offset !== null && <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{e.day_offset} day{e.day_offset === 1 ? '' : 's'} after the Reset</span>}
        <span style={{ fontSize: 11.5, fontWeight: 700, color: e.status === 'approved' ? '#2D6E3E' : e.status === 'confirmed' ? '#5A4FCF' : 'var(--text-subtle)', marginLeft: 'auto' }}>
          {working && <Loader2 size={11} className="spin" />} {STATUS_TEXT[e.status]}{e.round ? ` · review ${e.round}` : ''}{e.written_by === 'mandi' ? ' · your words' : ''}
        </span>
      </div>
      <details style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '4px 0' }}><summary style={{ cursor: 'pointer' }}>Cap&rsquo;s brief</summary><p style={{ margin: '4px 0 0' }}>{e.brief}</p></details>
      {e.body && !editing && (
        <div style={{ fontSize: 12.5, background: 'rgba(0,0,0,0.025)', borderRadius: 9, padding: '9px 11px', marginTop: 6 }}>
          <div><strong>{e.subject}</strong> <span style={{ color: 'var(--text-subtle)' }}>— {e.preheader}</span></div>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{e.body}</div>
          {Object.entries(e.extras).map(([k, v]) => <div key={k} style={{ marginTop: 6 }}><span style={label}>{k.replace(/_/g, ' ')}</span><div style={{ whiteSpace: 'pre-wrap' }}>{v || '—'}</div></div>)}
          <div style={{ marginTop: 6 }}>Button: <strong>{e.cta_label}</strong>{e.ps ? <> · P.S. {e.ps}</> : null}</div>
        </div>
      )}
      {editing && (
        <div style={{ marginTop: 6 }}>
          {(['subject', 'preheader', 'cta_label', 'ps'] as const).map(k => <div key={k}><p style={{ ...label, margin: '6px 0 3px' }}>{k}</p><input style={input} value={f[k]} onChange={ev => setF({ ...f, [k]: ev.target.value })} /></div>)}
          <p style={{ ...label, margin: '6px 0 3px' }}>body</p>
          <textarea rows={8} style={{ ...input, resize: 'vertical' }} value={f.body} onChange={ev => setF({ ...f, body: ev.target.value })} />
          {Object.keys(f.extras).map(k => <div key={k}><p style={{ ...label, margin: '6px 0 3px' }}>{k.replace(/_/g, ' ')}</p><textarea rows={3} style={{ ...input, resize: 'vertical' }} value={f.extras[k]} onChange={ev => setF({ ...f, extras: { ...f.extras, [k]: ev.target.value } })} /></div>)}
        </div>
      )}
      {e.cap_reasons.length > 0 && <ul style={{ fontSize: 12, color: '#b23b3b', margin: '6px 0', paddingLeft: 18 }}>{e.cap_reasons.map((r, i) => <li key={i}>↩ {r}</li>)}</ul>}
      {e.cap_notes.length > 0 && <ul style={{ fontSize: 12, color: 'var(--gold)', margin: '6px 0', paddingLeft: 18 }}>{e.cap_notes.map((r, i) => <li key={i}>Cap noticed: {r}</li>)}</ul>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
        {e.body && segs.length > 1 && (
          <select value={seg} onChange={ev => setSeg(ev.target.value)} style={{ ...input, width: 'auto' }}>
            {segs.map(s => <option key={s} value={s}>{s === 'returning' ? 'as: came once' : s === 'pass_eligible' ? 'as: came 2+ (pass offer)' : 'as: pass holder'}</option>)}
          </select>
        )}
        {e.body && <a style={btn()} href={`/api/reset-sequence?preview=${e.key}&segment=${seg}`} target="_blank" rel="noreferrer"><Eye size={13} /> Preview</a>}
        {e.body && !editing && <TalkToCapButton id={`email:${e.key}`} open={talk} onToggle={() => setTalk(x => !x)} />}
        {e.body && !editing && <button style={btn()} onClick={() => setEditing(true)}><Pencil size={13} /> Edit</button>}
        {editing && <button style={btn(true)} disabled={sweeping} onClick={async () => { setSweeping(true); const r = await post('/api/reset-sequence', { action: 'edit', key: e.key, subject: f.subject, preheader: f.preheader, body: f.body, cta_label: f.cta_label, ps: f.ps, extras: f.extras }); setSweeping(false); if (r.error) { onMsg(r.error); return } onMsg(r.fixes?.length ? `Saved. Cap’s sweep fixed: ${r.fixes.join(' · ')}` : 'Saved. Cap’s sweep found nothing to fix.'); setEditing(false); onChange() }}>{sweeping ? 'Cap is checking…' : 'Save my edit'}</button>}
        {editing && <button style={btn()} onClick={() => setEditing(false)}>Cancel</button>}
        {(e.status === 'confirmed') && <button style={btn(true)} onClick={async () => { const r = await post('/api/reset-sequence', { action: 'approve', key: e.key, on: true }); if (r.error) onMsg(r.error); onChange() }}><Check size={13} /> Approve</button>}
        {e.status === 'approved' && <button style={btn()} onClick={async () => { await post('/api/reset-sequence', { action: 'approve', key: e.key, on: false }); onChange() }}>Un-approve</button>}
        {!working && e.written_by !== 'mandi' && e.status !== 'approved' && <button style={btn()} onClick={async () => { await post('/api/reset-sequence', { action: 'brief', keys: [e.key] }); onChange() }}><RotateCcw size={13} /> {e.body ? 'Ask for a fresh draft' : 'Write it'}</button>}
        {e.body && <button style={btn()} title="Sends one test copy to hi@aimomeducation.com only" onClick={async () => {
          if (prompt('Send ONE test copy to hi@aimomeducation.com? Type TEST to send.') !== 'TEST') return
          const r = await post('/api/reset-sequence', { action: 'test', key: e.key, segment: seg, confirm: 'TEST' })
          onMsg(r.ok ? `Test sent to ${r.to}.` : `Not sent: ${r.error}`)
        }}><Send size={13} /> Test to me</button>}
      </div>
      {talk && <TalkToCapThread id={`email:${e.key}`} onChanged={() => onChange()} />}
      {e.body && !editing && <p style={{ fontSize: 11.5, color: 'var(--text-subtle)', margin: '6px 0 0' }}>Adding a link yourself: in Edit, write <code>[the words to click](https://the-address)</code>, or paste the address on its own. Both come out clickable.</p>}
    </div>
  )
}

function DryRunCard({ events, live, onMsg }: { events: ResetEvent[]; live: boolean; onMsg: (m: string) => void }) {
  const [ev, setEv] = useState('')
  const [today, setToday] = useState('')
  const [dry, setDry] = useState<Dry | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { if (!ev && events.length) setEv([...events].reverse().find(e => (e.counts?.attended ?? 0) > 0)?.id ?? events[events.length - 1].id) }, [events, ev])
  const run = async () => {
    setErr('')
    const r = await fetch(`/api/reset-sequence?dry=${encodeURIComponent(ev)}${today ? `&today=${today}` : ''}`).then(x => x.json())
    if (r.error) { setErr(r.error); setDry(null) } else setDry(r)
  }
  return (
    <div style={card}>
      <p style={{ ...label, margin: '0 0 8px' }}>Dry run · who would get each touch (nothing sends)</p>
      {events.length === 0 ? <p style={{ fontSize: 12.5, color: 'var(--text-subtle)' }}>Import a Luma list first.</p> : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={ev} onChange={e => setEv(e.target.value)} style={{ ...input, width: 'auto' }}>
            {events.map(e => <option key={e.id} value={e.id}>{e.date} · {e.name} ({e.counts?.attended ?? 0} attended)</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>as if today were</span>
          <input type="date" value={today} onChange={e => setToday(e.target.value)} style={{ ...input, width: 'auto' }} />
          <button style={btn(true)} onClick={run}>Run the dry run</button>
          {live && <button style={{ ...btn(), color: '#b23b3b', borderColor: '#b23b3b' }} onClick={async () => {
            if (prompt('This sends the DUE touches to REAL people. Type SEND to go ahead.') !== 'SEND') return
            const r = await post('/api/reset-sequence', { action: 'run', event_id: ev, confirm: 'SEND' })
            onMsg(r.error ? `Not sent: ${r.error}` : `Sent ${r.sent}, failed ${r.failed}, skipped ${r.skipped}.${r.held?.length ? ' Held: ' + r.held.join(' ') : ''}`)
          }}><Send size={13} /> Send due touches for real</button>}
        </div>
      )}
      {err && <p style={{ color: '#b23b3b', fontSize: 12.5 }}>{err}</p>}
      {dry && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12.5, margin: '0 0 8px' }}>{dry.event.name} on {dry.event.date} · next Reset in RISE: {dry.next_event ? dry.next_event.date : 'none yet'} · today {dry.today} · sequence {dry.live ? <strong style={{ color: '#b23b3b' }}>LIVE</strong> : 'off'}</p>
          {dry.touches.map(t => (
            <details key={t.key} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }} open={t.send.length > 0}>
              <summary style={{ cursor: 'pointer', fontSize: 13 }}>
                <strong>{t.title}</strong> · {t.send_on}{t.due ? ' (due)' : ''} · <span style={{ color: '#2D6E3E' }}>{t.send.length} would get it</span> · <span style={{ color: 'var(--text-subtle)' }}>{t.skip.length} skipped</span>{t.blockers.length ? <span style={{ color: 'var(--gold)' }}> · held</span> : null}
              </summary>
              {t.blockers.map((b, i) => <p key={i} style={{ fontSize: 12, color: 'var(--gold)', margin: '4px 0' }}>⏸ {b}</p>)}
              {t.send.map(d => <p key={d.email} style={{ fontSize: 12, margin: '3px 0' }}>✓ {d.name || d.email} <span style={{ color: 'var(--text-subtle)' }}>{d.email} · {d.reason}</span></p>)}
              {t.skip.map(d => <p key={d.email} style={{ fontSize: 12, margin: '3px 0', color: 'var(--text-subtle)' }}>– {d.name || d.email} · {d.reason}</p>)}
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

function WelcomeCard({ onMsg }: { onMsg: (m: string) => void }) {
  const [r, setR] = useState<{ branch: string; title: string; live: boolean; blockers: string[]; send: Decision[]; skip: Decision[] }[]>([])
  const load = async () => {
    const out = []
    for (const b of ['joyful_media', 'wfh']) out.push({ branch: b, ...(await fetch(`/api/reset-sequence?welcome=${b}`).then(x => x.json())) })
    setR(out)
  }
  return (
    <div style={card}>
      <p style={{ ...label, margin: '0 0 8px' }}>Welcome emails · dry run</p>
      <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '0 0 8px' }}>The welcome goes only to someone the moment she joins a list, once, when you&rsquo;ve approved it and switched it live. This shows who&rsquo;s on each list today.</p>
      <button style={btn()} onClick={() => { load().catch(() => onMsg('Couldn’t load the welcome dry run.')) }}>Check the lists</button>
      {r.map(w => (
        <div key={w.branch} style={{ marginTop: 10, fontSize: 12.5 }}>
          <strong>{w.title}</strong> · {w.live ? 'LIVE' : 'off'} · {w.send.length} on the list{w.skip.length ? `, ${w.skip.length} skipped` : ''}
          {w.blockers.map((b, i) => <p key={i} style={{ fontSize: 12, color: 'var(--gold)', margin: '3px 0' }}>⏸ {b}</p>)}
          {w.skip.map(d => <p key={d.email} style={{ fontSize: 12, margin: '2px 0', color: 'var(--text-subtle)' }}>– {d.email} · {d.reason}</p>)}
        </div>
      ))}
    </div>
  )
}
