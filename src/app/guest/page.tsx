'use client'
import { useEffect, useState } from 'react'

// The guest questionnaire (public, private link: /guest?t=TOKEN). Answers land on the
// guest's card in RISE; handles fill in on the calendar's day view automatically.
type Q = { id: string; label: string; hint?: string; long?: boolean; required?: boolean }
type Data = { name: string; kind: string; answered: boolean; answers: Record<string, string>; questions: Q[] }

export default function GuestQuestionnaire() {
  const [token, setToken] = useState('')
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [vals, setVals] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t') || ''
    setToken(t)
    if (!t) { setErr('This link is missing its code. Use the link from your email.'); return }
    fetch(`/api/guest-questionnaire?t=${encodeURIComponent(t)}`).then(async r => {
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(d.error || 'This link isn’t valid.'); return }
      setData(d); setVals(d.answers || {})
    }).catch(() => setErr('Couldn’t load. Check your connection and refresh.'))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    const r = await fetch('/api/guest-questionnaire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, answers: vals }) }).catch(() => null)
    setBusy(false)
    if (!r || !r.ok) { setErr('That didn’t save. Please try again.'); return }
    setDone(true); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="gq">
      <style>{css}</style>
      <div className="wrap">
        <p className="eyebrow">{data?.kind === 'collab' ? 'OUR COLLABORATION' : 'THE AI MOM PODCAST'}</p>
        {done ? (
          <>
            <h1>Thank you{data ? `, ${data.name}` : ''}!</h1>
            <p className="lede">Got it. I’ll use this to prep, and I’ll send the replay, the link and some ready-made assets once our episode is live.</p>
            <p className="sig">Mandi</p>
          </>
        ) : !data ? (
          <>
            <h1>{err ? 'Hmm.' : 'One moment…'}</h1>
            {err && <p className="lede">{err}</p>}
          </>
        ) : (
          <>
            <h1>Hi {data.name}, a few quick questions</h1>
            <p className="lede">About five minutes. It helps me prep around you, and it’s where I’ll grab your bio and the links you want shared.{data.answered ? ' You’ve answered before. Change anything and send again.' : ''}</p>
            <form onSubmit={submit}>
              {data.questions.map(q => (
                <label key={q.id} className="field">
                  <span className="lbl">{q.label}{q.required && <em> *</em>}</span>
                  {q.hint && <span className="hint">{q.hint}</span>}
                  {q.long
                    ? <textarea rows={3} required={q.required} value={vals[q.id] || ''} onChange={e => setVals(v => ({ ...v, [q.id]: e.target.value }))} />
                    : <input required={q.required} value={vals[q.id] || ''} onChange={e => setVals(v => ({ ...v, [q.id]: e.target.value }))} />}
                </label>
              ))}
              {err && <p className="err">{err}</p>}
              <button className="go" disabled={busy}>{busy ? 'Sending…' : 'Send my answers'}</button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

const css = `
.gq{min-height:100vh;background:#F6F3FF;color:#171C3A;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:40px 16px 72px}
.gq .wrap{max-width:600px;margin:0 auto}
.gq .eyebrow{font-size:12px;letter-spacing:.14em;font-weight:700;color:#5A4FCF;margin:0 0 10px}
.gq h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:clamp(28px,6vw,38px);line-height:1.15;margin:0 0 12px}
.gq .lede{font-size:16px;line-height:1.6;color:#4A4E68;margin:0 0 28px}
.gq .sig{font-family:Georgia,serif;font-style:italic;font-size:20px}
.gq form{background:#fff;border:1px solid #E4DEFA;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(90,79,207,.08)}
.gq .field{display:flex;flex-direction:column;gap:5px;margin-bottom:18px}
.gq .lbl{font-weight:650;font-size:14.5px}
.gq .lbl em{color:#5A4FCF;font-style:normal}
.gq .hint{font-size:12.5px;color:#6B6E85;margin-top:-2px}
.gq input,.gq textarea{font:inherit;font-size:15px;color:#171C3A;border:1px solid #DCD6EE;border-radius:11px;padding:11px 13px;background:#FCFBFF;transition:border-color .15s,box-shadow .15s;width:100%;box-sizing:border-box}
.gq input:focus,.gq textarea:focus{outline:none;border-color:#5A4FCF;box-shadow:0 0 0 3px rgba(90,79,207,.15)}
.gq .go{width:100%;margin-top:6px;background:#5A4FCF;color:#fff;border:0;border-radius:999px;padding:14px 18px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;transition:background .15s}
.gq .go:hover{background:#4A40B8}
.gq .go:disabled{opacity:.6;cursor:default}
.gq .err{color:#B23A48;font-size:14px}
`
