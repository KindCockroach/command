'use client'

import { useState } from 'react'
import { PREVIEW_FILE } from './meds'

// Free lead magnet: capture the email (into the waitlist store), then instantly
// hand over "The Little You" — plays + downloads on the spot. Works without any
// external email automation, so the free meditation is delivered the moment she asks.
export default function FreeOptin() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMsg('')
    try {
      const res = await fetch('/api/journal-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'bethereforher-free' }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Something went wrong — try again.')
      setStatus('done')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="fo-done">
        <p><strong>It&rsquo;s yours.</strong> Here&rsquo;s &ldquo;The Little You&rdquo; &mdash; press play now,
          or save it to your phone for tonight.</p>
        <audio controls preload="none" src={PREVIEW_FILE} />
        <a className="fo-dl" href={PREVIEW_FILE} download>Download the meditation ↓</a>
      </div>
    )
  }

  return (
    <form className="fo-form" onSubmit={submit}>
      <input
        type="email"
        required
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Your email"
      />
      <button disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Send me the free meditation'}
      </button>
      {status === 'error' && <p className="fo-err">{msg}</p>}
      <p className="fo-fine">One free meditation, instantly. No spam &mdash; just the occasional new practice.</p>
    </form>
  )
}
