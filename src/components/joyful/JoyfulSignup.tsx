'use client'
import { useState } from 'react'

// "Updates from Mandi and Joyful Media" signup on /welcome → /api/kitchen (list: joyful).
// City/state is optional — Mandi's just curious where her people are. Like every signup,
// it ends on /welcome (the thank-you page with the All Mail note).
export default function JoyfulSignup() {
  const [f, setF] = useState({ name: '', lastName: '', email: '', location: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const d = await fetch('/api/kitchen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, list: 'joyful', newsletter: true, cookbook: false }) })
      .then(r => r.json()).catch(() => ({ error: 'Connection hiccup — try again.' }))
    setBusy(false)
    if (d.ok) { setDone(true); window.location.href = '/welcome?from=joyful' } else setErr(d.error || 'Something went wrong — try again.')
  }

  if (done) return <p className="jdone">You&rsquo;re on the list, {f.name || 'friend'}. 🎈</p>
  return (
    <form className="jform" onSubmit={submit}>
      <div className="jrow">
        <label>First name<input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label>Last name<input required value={f.lastName} onChange={e => setF({ ...f, lastName: e.target.value })} /></label>
      </div>
      <label>Email<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label>City, State <span>(optional)</span><input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="Austin, TX" /></label>
      {err && <p className="jerr">{err}</p>}
      <button disabled={busy}>{busy ? 'One moment…' : 'Sign me up →'}</button>
    </form>
  )
}
