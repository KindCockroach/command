'use client'
import { useState } from 'react'

// Email + two optional boxes → /api/kitchen → on to the next page. Reused by the
// podcast-listener signup (aiworksforher.com/listeners) with its own list + labels.
type Props = { list?: 'kitchen' | 'podcast'; redirect?: string; cookbookLabel?: string; newsletterLabel?: string; button?: string }

export default function KitchenForm({
  list = 'kitchen',
  redirect = '/welcome?from=btfh',
  cookbookLabel = 'Send me the seasonal cookbooks, with notes in the margin that encourage play, joy, and relief in the kitchen.',
  newsletterLabel = 'Subscribe to Be There For Her. Receive updates when new series are released.',
  button = 'Count me in →',
}: Props) {
  const [f, setF] = useState({ name: '', email: '', cookbook: false, newsletter: false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.email.trim()) { setErr('Please add your email.'); return }
    setBusy(true); setErr('')
    const d = await fetch('/api/kitchen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, list }) })
      .then(r => r.json()).catch(() => ({ error: 'Connection hiccup — try again.' }))
    if (!d.ok) { setBusy(false); setErr(d.error || 'Something went wrong — try again.'); return }
    window.location.href = redirect
  }

  return (
    <form className="kform" onSubmit={submit}>
      <label className="kf">First name (optional)<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label className="kf">Email<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label className="kcheck">
        <input type="checkbox" checked={f.cookbook} onChange={e => setF({ ...f, cookbook: e.target.checked })} />
        <span>{cookbookLabel}</span>
      </label>
      <label className="kcheck">
        <input type="checkbox" checked={f.newsletter} onChange={e => setF({ ...f, newsletter: e.target.checked })} />
        <span>{newsletterLabel}</span>
      </label>
      {err && <p className="kerr">{err}</p>}
      <button className="kbtn" disabled={busy}>{busy ? 'One moment…' : button}</button>
    </form>
  )
}
