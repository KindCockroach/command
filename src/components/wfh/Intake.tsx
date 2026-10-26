'use client'
import { useState } from 'react'
import type { Answers, IntakeKind, Question } from '@/lib/wfh'

// One question per screen → contact details → thank-you that ends on "Book a time with
// Mandi" (/meet?service=…). Used by /retire and /speak; posts to /api/wfh/intake, which
// emails Mandi every answer. Supports single, multi, text, "Other" boxes, and showIf.

type Props = {
  kind: IntakeKind
  questions: readonly Question[]
  service: string
  orgLabel?: string
  doneTitle: string
  doneBody: string
}

export default function Intake({ kind, questions, service, orgLabel = 'Business name', doneTitle, doneBody }: Props) {
  const [answers, setAnswers] = useState<Answers>({})
  const [step, setStep] = useState(0)
  const [contact, setContact] = useState({ name: '', email: '', phone: '', business: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  // Questions whose showIf doesn't match are skipped entirely.
  const visible = questions.filter(q => !q.showIf || (typeof answers[q.showIf.id] === 'string' && q.showIf.in.includes(answers[q.showIf.id] as string)))
  const total = visible.length + 1
  const q = visible[step]
  const val = q ? answers[q.id] : undefined
  const otherKey = q ? `${q.id}_other` : ''
  const otherOn = q?.other && (q.multi ? Array.isArray(val) && val.includes('__other') : val === '__other')
  const answered = !q ? true
    : q.text ? typeof val === 'string' && val.trim().length > 0
    : q.multi ? Array.isArray(val) && val.length > 0
    : typeof val === 'string'
  const go = (d: number) => { setStep(s => Math.max(0, s + d)); setErr(''); if (typeof window !== 'undefined') document.getElementById('intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  const pick = (v: string) => {
    if (!q) return
    if (q.multi) {
      const cur = Array.isArray(val) ? val : []
      setAnswers(a => ({ ...a, [q.id]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }))
    } else {
      setAnswers(a => ({ ...a, [q.id]: v }))
      if (v !== '__other') setTimeout(() => go(1), 180)
    }
  }

  const submit = async () => {
    if (!contact.name.trim() || !contact.email.trim()) { setErr('Please add your name and email.'); return }
    setBusy(true); setErr('')
    // "__other" is a UI marker; the typed text travels as <id>_other.
    const clean: Answers = {}
    for (const [k, v] of Object.entries(answers)) {
      if (Array.isArray(v)) { const f = v.filter(x => x !== '__other'); if (f.length) clean[k] = f }
      else if (v !== '__other') clean[k] = v
    }
    const d = await fetch('/api/wfh/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, ...contact, answers: clean }) })
      .then(r => r.json()).catch(() => ({ error: 'Connection hiccup — try again.' }))
    setBusy(false)
    if (!d.ok) { setErr(d.error || 'Something went wrong — try again.'); return }
    try { sessionStorage.setItem('wfh_lead', JSON.stringify({ id: d.lead_id, name: contact.name, email: contact.email, business: contact.business })) } catch {}
    setDone(true)
  }

  if (done) {
    return (
      <div className="panel next" id="intake">
        <p className="tag">THANK YOU, {contact.name.split(' ')[0].toUpperCase()}</p>
        <h2>{doneTitle}</h2>
        <p className="muted">{doneBody}</p>
        <a className="btn" href={`/meet?service=${service}`}>Book a time with Mandi →</a>
      </div>
    )
  }

  return (
    <div className="panel" id="intake">
      <div className="bar"><span style={{ width: `${(step / total) * 100}%` }} /></div>
      <p className="count">{Math.min(step + 1, total)} of {total}</p>

      {q ? (
        <>
          <h2 className="q">{q.q}</h2>
          {q.hint && <p className="hint">{q.hint}</p>}
          {q.text ? (
            <textarea className="in" rows={5} placeholder={q.placeholder} value={typeof val === 'string' ? val : ''}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
          ) : (
            <div className="opts">
              {[...q.options, ...(q.other ? [{ value: '__other', label: 'Other' }] : [])].map(o => {
                const on = q.multi ? Array.isArray(val) && val.includes(o.value) : val === o.value
                return (
                  <button key={o.value} className={`opt${on ? ' on' : ''}`} onClick={() => pick(o.value)}>
                    <span className="box">{on ? '✓' : ''}</span>{o.label}
                  </button>
                )
              })}
              {otherOn && (
                <input className="in" autoFocus placeholder="Tell us more" value={typeof answers[otherKey] === 'string' ? answers[otherKey] as string : ''}
                  onChange={e => setAnswers(a => ({ ...a, [otherKey]: e.target.value }))} />
              )}
            </div>
          )}
          <div className="nav">
            {step > 0 ? <button className="link" onClick={() => go(-1)}>← Back</button> : <span />}
            {(q.multi || q.text || answered || otherOn) && (
              <button className="btn" disabled={!answered && !q.text} onClick={() => go(1)}>{q.text && !answered ? 'Skip →' : 'Next →'}</button>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="q">Last step — how can Mandi reach you?</h2>
          <label className="f">Your name<input className="in" value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} /></label>
          <label className="f">Email<input className="in" type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} /></label>
          <label className="f">Phone (optional)<input className="in" type="tel" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} /></label>
          <label className="f">{orgLabel} (optional)<input className="in" value={contact.business} onChange={e => setContact(c => ({ ...c, business: e.target.value }))} /></label>
          <label className="f">Website or link (optional)<input className="in" value={contact.website} onChange={e => setContact(c => ({ ...c, website: e.target.value }))} /></label>
          {err && <p className="err">{err}</p>}
          <div className="nav">
            <button className="link" onClick={() => go(-1)}>← Back</button>
            <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send to Mandi →'}</button>
          </div>
        </>
      )}
    </div>
  )
}

// Styles for the questionnaire panel — pages add this after wfhCss.
export const intakeCss = `
.w .bar { height:6px; background:#eee7da; border-radius:99px; overflow:hidden; }
.w .bar span { display:block; height:100%; background:var(--nebula); transition:width .25s ease; }
.w .count { font-size:12px; font-weight:800; color:#9a93b0; letter-spacing:1px; margin:10px 0 4px; }
.w .q { font-size:clamp(22px,3.6vw,28px); margin:6px 0 6px; line-height:1.25; }
.w .hint { color:#7a7392; margin:0 0 14px; font-size:15px; }
.w .opts { display:grid; gap:10px; margin:16px 0 20px; }
.w .opt { display:flex; align-items:center; gap:12px; text-align:left; background:var(--cream); border:1.5px solid #e4dccd; border-radius:14px;
  padding:14px 16px; font-size:16px; color:var(--midnight); cursor:pointer; font-family:inherit; transition:border-color .12s ease, background .12s ease; }
.w .opt:hover { border-color:var(--nebula); }
.w .opt.on { border-color:var(--nebula); background:#f1effc; }
.w .opt .box { flex:none; width:22px; height:22px; border-radius:7px; border:1.5px solid #cfc6e6; display:grid; place-items:center; font-size:13px; font-weight:800; color:#fff; }
.w .opt.on .box { background:var(--nebula); border-color:var(--nebula); }
.w textarea.in { margin:12px 0 20px; resize:vertical; line-height:1.5; }
.w .nav { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.w .next { background:linear-gradient(165deg,#fff,#f4f1fd); }
.w .next h2 { margin:0 0 8px; font-size:26px; }
.w .next .btn { margin-top:8px; }
.w .muted { color:var(--muted); }
`
