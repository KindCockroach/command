'use client'
import { useState } from 'react'

// ── EDIT YOUR QUESTIONS HERE ──────────────────────────────────────────────
// type: 'scale' (1–5) · 'choice' (options) · 'text' (one line) · 'textarea' (long)
// These are placeholders for the post-Reset follow-up — swap in Mandi's real ones.
const SURVEY = 'reset'
const QUESTIONS: { id: string; label: string; type: 'scale' | 'choice' | 'text' | 'textarea'; options?: string[] }[] = [
  { id: 'feeling', label: 'How do you feel after The Reset?', type: 'scale' },
  { id: 'let_go', label: "What's one decision you're letting go of this week?", type: 'text' },
  { id: 'needed_more', label: 'What did you need more of?', type: 'text' },
  { id: 'come_back', label: 'Will you come back next Sunday?', type: 'choice', options: ['Yes', 'Maybe', 'Not sure yet'] },
  { id: 'anything', label: 'Anything you want Mandi to know?', type: 'textarea' },
]
// ──────────────────────────────────────────────────────────────────────────

export default function ResetSurvey() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const set = (id: string, v: string) => setAnswers(a => ({ ...a, [id]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!Object.keys(answers).length) { setErr('Answer at least one question first 🤍'); return }
    setBusy(true); setErr('')
    const d = await fetch('/api/survey', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ survey: SURVEY, name, email, answers }),
    }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup — try again.' }))
    if (!d.ok) { setBusy(false); setErr(d.error || 'Something went wrong — try again.'); return }
    setDone(true)
  }

  return (
    <main className="wrap">
      <style>{css}</style>
      {done ? (
        <div className="card done">
          <p className="eyebrow">THE RESET</p>
          <h1>Thank you. 🤍</h1>
          <p>I read every one of these. Truly. See you Sunday.</p>
          <p className="sig">— Mandi</p>
        </div>
      ) : (
        <form className="card" onSubmit={submit}>
          <p className="eyebrow">THE RESET · YOUR FEEDBACK</p>
          <h1>How was it?</h1>
          <p className="sub">Two minutes, and it shapes the next one. No wrong answers.</p>

          <label className="q">First name (optional)
            <input value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="q">Email (optional)
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>

          {QUESTIONS.map(q => (
            <div className="q" key={q.id}>
              <span className="qlabel">{q.label}</span>
              {q.type === 'scale' && (
                <div className="scale">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button type="button" key={n} className={answers[q.id] === String(n) ? 'on' : ''} onClick={() => set(q.id, String(n))}>{n}</button>
                  ))}
                </div>
              )}
              {q.type === 'choice' && (
                <div className="choices">
                  {q.options!.map(o => (
                    <button type="button" key={o} className={answers[q.id] === o ? 'on' : ''} onClick={() => set(q.id, o)}>{o}</button>
                  ))}
                </div>
              )}
              {q.type === 'text' && <input value={answers[q.id] || ''} onChange={e => set(q.id, e.target.value)} />}
              {q.type === 'textarea' && <textarea rows={4} value={answers[q.id] || ''} onChange={e => set(q.id, e.target.value)} />}
            </div>
          ))}

          {err && <p className="err">{err}</p>}
          <button className="submit" disabled={busy}>{busy ? 'Sending…' : 'Send it to Mandi →'}</button>
        </form>
      )}
    </main>
  )
}

const css = `
  .wrap{ min-height:100vh; margin:0; background:#F4E9DB; color:#3C2A37;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    display:flex; justify-content:center; padding:40px 18px 80px; }
  .card{ width:100%; max-width:560px; background:#FBF3EA; border:1px solid #e6d6c4; border-radius:20px; padding:30px 26px; }
  .eyebrow{ letter-spacing:2.5px; font-size:11px; font-weight:800; color:#A86A72; margin:0 0 6px; }
  h1{ font-family:Georgia,serif; font-size:32px; margin:0 0 8px; color:#3C2A37; }
  .sub{ font-size:15px; color:#6B3F52; margin:0 0 22px; }
  .q{ display:flex; flex-direction:column; gap:6px; margin:0 0 18px; font-size:14px; font-weight:700; color:#6B3F52; }
  .qlabel{ font-size:15px; }
  .q input, .q textarea{ font-size:16px; font-family:inherit; padding:12px 14px; border:1px solid #e0cdb9;
    border-radius:12px; background:#fff; color:#3C2A37; font-weight:400; }
  .q input:focus, .q textarea:focus{ outline:none; border-color:#D98C5F; box-shadow:0 0 0 3px rgba(217,140,95,.25); }
  .scale, .choices{ display:flex; gap:8px; flex-wrap:wrap; }
  .scale button, .choices button{ font-family:inherit; font-size:15px; font-weight:700; cursor:pointer;
    border:1px solid #e0cdb9; background:#fff; color:#6B3F52; border-radius:999px; padding:10px 16px; }
  .scale button{ width:46px; padding:10px 0; }
  .scale button.on, .choices button.on{ background:linear-gradient(135deg,#C96F7E,#D98C5F); color:#fff; border-color:transparent; }
  .submit{ width:100%; margin-top:8px; font-family:inherit; font-size:16px; font-weight:800; cursor:pointer;
    color:#fff; border:none; border-radius:999px; padding:15px; background:linear-gradient(135deg,#C96F7E,#D98C5F);
    box-shadow:0 10px 26px rgba(110,55,64,.32); }
  .submit:disabled{ opacity:.7; cursor:default; }
  .err{ color:#b2564a; font-size:14px; font-weight:600; margin:4px 0 0; }
  .done{ text-align:center; }
  .done h1{ margin-top:4px; }
  .sig{ font-family:Georgia,serif; font-style:italic; color:#A86A72; margin-top:18px; }
`
