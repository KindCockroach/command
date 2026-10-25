'use client'
import { useState, useEffect } from 'react'
import { QUESTIONS, type Answers, type RiseRecommendation } from '@/lib/wfh'
import { wfhCss } from '@/components/wfh/theme'
import CopyEditor from '@/components/CopyEditor'

// WFH — the AI integration questionnaire. One question per screen, then contact
// details, then a personalized recommendation of the RISE features that fit them
// (written by Claude in /api/wfh, emailed to them and to Mandi) that ends on
// "Book a call with me" → /meet. The lead rides to /meet in sessionStorage, never the URL.

export default function AssessmentPage() {
  const [step, setStep] = useState(0) // 0..QUESTIONS.length-1 = questions, then contact
  const [answers, setAnswers] = useState<Answers>({})
  const [contact, setContact] = useState({ name: '', email: '', business: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState<RiseRecommendation | null>(null)

  useEffect(() => { document.title = 'AI Integration Questionnaire · WFH — Works For Her' }, [])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step, result])

  const total = QUESTIONS.length + 1
  const q = QUESTIONS[step]
  const val = q ? answers[q.id] : undefined
  const answered = q ? (q.multi ? Array.isArray(val) && val.length > 0 : typeof val === 'string') : true

  const pick = (v: string) => {
    if (!q) return
    if (q.multi) {
      const cur = Array.isArray(val) ? val : []
      setAnswers(a => ({ ...a, [q.id]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }))
    } else {
      setAnswers(a => ({ ...a, [q.id]: v }))
      setTimeout(() => setStep(s => s + 1), 180)
    }
  }

  const submit = async () => {
    if (!contact.name.trim() || !contact.email.trim()) { setErr('Please add your name and email.'); return }
    setBusy(true); setErr('')
    const d = await fetch('/api/wfh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assess: { ...contact, answers } }) })
      .then(r => r.json()).catch(() => ({ error: 'Connection hiccup — try again.' }))
    setBusy(false)
    if (!d.recommendation) { setErr(d.error || 'Something went wrong — try again.'); return }
    try { sessionStorage.setItem('wfh_lead', JSON.stringify({ id: d.lead_id, name: contact.name, email: contact.email, business: contact.business })) } catch {}
    setResult(d.recommendation)
  }

  return (
    <main className="w">
      <style>{wfhCss + css}</style>
      <CopyEditor />
      <header className="top">
        <div className="wrap">
          <a className="home" href="/"><img src="/wfh-logo-white.png" alt="AI WFH — Works For Her" /></a>
          {result
            ? <><h1>{result.headline}</h1><p>A copy is on its way to your inbox.</p></>
            : <><h1>Where could AI <em>work for you?</em></h1><p>Eight quick taps. You&rsquo;ll get a personalized recommendation for how RISE, my AI command center, can work for you.</p></>}
        </div>
      </header>

      <section className="wrap body">
        {result ? (
          <div className="results">
            {result.intro && <p className="intro">{result.intro}</p>}
            <div className="opps">
              {result.features.map((f, i) => (
                <div className="panel opp" key={f.name}>
                  <span className="num">{i + 1}</span>
                  <div>
                    <h4>{f.name}</h4>
                    <p>{f.why}</p>
                    {f.first_step && <p className="save">First step: {f.first_step}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="panel next">
              {result.closing && <p className="muted">{result.closing}</p>}
              <a className="btn" href="/meet?service=ai-integration">Book a call with me →</a>
            </div>
          </div>
        ) : (
          <div className="panel">
            <div className="bar"><span style={{ width: `${((step + (answered && q && !q.multi ? 1 : 0)) / total) * 100}%` }} /></div>
            <p className="count">{Math.min(step + 1, total)} of {total}</p>

            {q ? (
              <>
                <h2 className="q">{q.q}</h2>
                {q.hint && <p className="hint">{q.hint}</p>}
                <div className="opts">
                  {q.options.map(o => {
                    const on = q.multi ? Array.isArray(val) && val.includes(o.value) : val === o.value
                    return (
                      <button key={o.value} className={`opt${on ? ' on' : ''}`} onClick={() => pick(o.value)}>
                        <span className="box">{on ? '✓' : ''}</span>{o.label}
                      </button>
                    )
                  })}
                </div>
                <div className="nav">
                  {step > 0 ? <button className="link" onClick={() => setStep(s => s - 1)}>← Back</button> : <span />}
                  {(q.multi || answered) && <button className="btn" disabled={!answered} onClick={() => setStep(s => s + 1)}>Next →</button>}
                </div>
              </>
            ) : (
              <>
                <h2 className="q">Where should I send your results?</h2>
                <p className="hint">Your recommendation shows up on the next screen (it takes about 20 seconds), and a copy comes to your inbox.</p>
                <label className="f">Your name<input className="in" value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} /></label>
                <label className="f">Email<input className="in" type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} /></label>
                <label className="f">Business name (optional)<input className="in" value={contact.business} onChange={e => setContact(c => ({ ...c, business: e.target.value }))} /></label>
                <label className="f">Website or social link (optional)<input className="in" value={contact.website} onChange={e => setContact(c => ({ ...c, website: e.target.value }))} /></label>
                {err && <p className="err">{err}</p>}
                <div className="nav">
                  <button className="link" onClick={() => setStep(s => s - 1)}>← Back</button>
                  <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Building your recommendation…' : 'See my recommendation →'}</button>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <footer className="foot"><a href="/">WFH home</a>·<a href="/ugc">UGC &amp; marketing</a>·<a href="/aimom">AI Mom</a></footer>
    </main>
  )
}

const css = `
.w .body { margin-top:-28px; position:relative; }
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
.w .nav { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.w .results { display:grid; gap:18px; }
.w .intro { font-size:19px; margin:0; background:#fff; border:1px solid var(--line); border-radius:20px; padding:22px 24px; }
.w .muted { color:var(--muted); margin:0 0 10px; }
.w .opps { display:grid; gap:12px; }
.w .opp { display:flex; gap:16px; align-items:flex-start; padding:20px 22px; }
.w .opp .num { flex:none; width:34px; height:34px; border-radius:50%; background:var(--copper); color:#fff; display:grid; place-items:center; font-weight:800; }
.w .opp h4 { margin:2px 0 4px; font-size:18px; font-family:Georgia,serif; }
.w .opp p { margin:0; color:var(--muted); }
.w .opp .save { margin-top:6px; color:var(--copper); font-weight:800; font-size:14px; }
.w .next { background:linear-gradient(165deg,#fff, #f4f1fd); }
.w .next h2 { margin:0 0 8px; font-size:26px; }
.w .next .btn { margin-top:8px; }
@media (max-width:620px){ `
