'use client'

import { useState } from 'react'

// Waitlist capture, posted to /api/journal-waitlist. Reused across the journal
// landing page and every audience welcome page. `source` tags where the signup
// came from (funnel insight); `showNote` toggles the optional prompt field.
export default function WaitlistForm({
  cta = 'Join the waitlist',
  source = 'journal',
  showNote = true,
}: {
  cta?: string
  source?: string
  showNote?: boolean
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/journal-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, note, source }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Try again?')
        return
      }
      setStatus('done')
      setMessage(
        data.duplicate
          ? "You're already on the list — I've got you. 💛"
          : "You're in. I'll write to you the moment the doors open. 💛"
      )
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again?')
    }
  }

  if (status === 'done') {
    return (
      <div className="wl-done">
        <p>{message}</p>
      </div>
    )
  }

  return (
    <form className="wl-form" onSubmit={submit}>
      <div className="wl-row">
        <input
          type="text"
          placeholder="First name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="First name"
        />
        <input
          type="email"
          required
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
        />
      </div>
      {showNote && (
        <input
          type="text"
          className="wl-note"
          placeholder="What would you want to write about? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="What would you want to write about?"
        />
      )}
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Saving…' : cta}
      </button>
      {status === 'error' && <p className="wl-error">{message}</p>}
      <p className="wl-fine">No spam. One note when it opens. Unsubscribe anytime.</p>
    </form>
  )
}
