'use client'

// Owner-only trigger for the November short-ribs recipe email. Not in middleware's
// public list, so only Mandi's station cookie gets past the gate; the API is isOwner-
// gated too. Three steps: Dry run (see who) → Test to me → Send to everyone.
import { useState } from 'react'
import CopyEditor from '@/components/CopyEditor'

type Result = { mode?: string; count?: number; recipients?: string[]; emilyIncluded?: boolean; sent?: number; failed?: number; results?: { who: string; ok: boolean }[]; error?: string }

export default function KitchenSend() {
  const [busy, setBusy] = useState<string>('')
  const [out, setOut] = useState<Result | null>(null)
  const [err, setErr] = useState<string>('')
  const [key, setKey] = useState<string>('')

  async function fire(mode: 'dry' | 'test' | 'send') {
    if (mode === 'send' && !confirm('Send the short-ribs email to EVERYONE on the cookbook list + Emily?')) return
    setBusy(mode); setErr(''); setOut(null)
    try {
      const res = await fetch('/api/kitchen/short-ribs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode, key: key.trim() || undefined }),
      })
      const j = await res.json()
      if (!res.ok) setErr(j.error || `Error ${res.status}`)
      else setOut(j)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'network error')
    } finally {
      setBusy('')
    }
  }

  return (
    <main style={{ fontFamily: 'Georgia, serif', color: '#3C2A37', background: '#F4E9DB', minHeight: '100vh', margin: 0, padding: '48px 20px' }}>
      <CopyEditor />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <p style={{ letterSpacing: 2, fontSize: 12, fontWeight: 800, color: '#D98C5F', margin: 0 }}>BE THERE FOR HER · ADMIN</p>
        <h1 style={{ fontSize: 34, margin: '8px 0 4px' }}>Send the November recipe 🍂</h1>
        <p style={{ color: '#6a5a62', marginTop: 0 }}>Coffee-Braised Short Ribs → cookbook list + Emily. One link: Save my seat (The Reset).</p>

        <ol style={{ color: '#6a5a62', lineHeight: 1.7, paddingLeft: 20 }}>
          <li><b>Dry run</b> — see exactly who gets it (confirm Emily &amp; the count).</li>
          <li><b>Test to me</b> — sends one copy to mandijoy.beck@gmail.com. Check it looks right.</li>
          <li><b>Send to everyone</b> — the real blast.</li>
        </ol>

        <div style={{ margin: '18px 0 6px' }}>
          <label style={{ display: 'block', fontSize: 13, color: '#6a5a62', marginBottom: 6 }}>Your edit key</label>
          <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="paste your edit key"
            style={{ width: '100%', maxWidth: 320, padding: '12px 14px', borderRadius: 12, border: '1px solid #e2cfbd', background: '#fff', color: '#3C2A37', fontSize: 16, fontFamily: 'Georgia, serif' }} />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '14px 0 8px' }}>
          <button onClick={() => fire('dry')} disabled={!!busy} style={btn('#6B3F52')}>{busy === 'dry' ? '…' : '1 · Dry run'}</button>
          <button onClick={() => fire('test')} disabled={!!busy} style={btn('#D98C5F')}>{busy === 'test' ? 'Sending…' : '2 · Test to me'}</button>
          <button onClick={() => fire('send')} disabled={!!busy} style={btn('#8a3b2e')}>{busy === 'send' ? 'Sending…' : '3 · Send to everyone'}</button>
        </div>

        {err && <p style={{ color: '#a3402a' }}>⚠ {err}</p>}

        {out && (
          <div style={{ background: '#fff', border: '1px solid #ecdccb', borderRadius: 16, padding: '18px 22px', marginTop: 16 }}>
            {out.mode === 'dry' && out.recipients && (
              <>
                <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>{out.count} recipient{out.count === 1 ? '' : 's'} · Emily {out.emilyIncluded ? 'included ✓' : 'MISSING ✗'}</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#6a5a62' }}>{out.recipients.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </>
            )}
            {(out.mode === 'test' || out.mode === 'send') && (
              <p style={{ margin: 0, fontWeight: 'bold' }}>
                {out.mode === 'test' ? 'Test sent' : 'Blast complete'}: {out.sent} sent{out.failed ? `, ${out.failed} failed` : ''} ✓
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function btn(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 999, padding: '13px 22px', cursor: 'pointer' }
}
