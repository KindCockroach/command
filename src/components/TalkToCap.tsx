'use client'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import GrowBox from './GrowBox'

// Talk to Cap about one item (an Approve item, or an email in Campaigns). Ask him about it, or
// tell him what to change: a change goes to the writer and comes back for your approval.
type Turn = { role: 'mandi' | 'cap'; text: string; at: string; handoff_id?: string | null }

export function TalkToCapButton({ id, count, open, onToggle }: { id: string; count?: number; open: boolean; onToggle: (id: string) => void }) {
  return <button type="button" className="ttc-b" onClick={() => onToggle(id)} aria-expanded={open}>💬 Talk to Cap{count ? ` · ${count}` : ''}<style>{btnCss}</style></button>
}

export function TalkToCapThread({ id, onChanged, placeholder, intro, who = 'Cap' }: { id: string; onChanged?: (rewriting: boolean) => void; placeholder?: string; intro?: string; who?: string }) {
  const [turns, setTurns] = useState<Turn[] | null>(null)
  const [said, setSaid] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let live = true
    fetch(`/api/approvals?chat=${encodeURIComponent(id)}`).then(x => x.json()).then(r => { if (live) setTurns(r?.turns ?? []) }).catch(() => { if (live) setTurns([]) })
    return () => { live = false }
  }, [id])
  const send = async () => {
    const text = said.trim(); if (!text || busy) return
    setBusy(true); setMsg(''); setSaid(''); setTurns(t => [...(t ?? []), { role: 'mandi', text, at: new Date().toISOString() }])
    const r = await fetch('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, text }) }).then(x => x.json()).catch(() => ({ error: 'Connection hiccup. Try again.' }))
    setBusy(false)
    if (r?.turns) setTurns(r.turns); else { setMsg(r?.error ?? `${who} didn’t answer.`); setSaid(text) }
    if (r?.rewriting) setMsg('Cap handed your note to Ed. It comes back for your approval once it’s rewritten and checked (a minute or two).')
    onChanged?.(!!r?.rewriting)
  }
  return (
    <div className="ttc">
      <style>{css}</style>
      {(turns ?? []).length === 0 && <p className="ttc-d">{intro ?? <>Ask Cap anything about this, or tell him what to change. To add a link, paste the address and say where it goes (e.g. “add a link to https://… on the words ‘the free meditation’”).</>}</p>}
      {(turns ?? []).map((t, k) => <p key={k} className={`ttc-t ${t.role}`}><b>{t.role === 'mandi' ? 'You' : who}:</b> {t.text}</p>)}
      {msg && <p className="ttc-m">{msg}</p>}
      <div className="ttc-row">
        <GrowBox placeholder={placeholder ?? 'e.g. Add a link to https://… on “the free meditation”. / Make it a plain hello, no selling.'} value={said} onChange={e => setSaid(e.target.value)} onEnter={send} />
        <button type="button" className="ttc-p" disabled={!said.trim() || busy} onClick={send}>{busy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}Send</button>
      </div>
    </div>
  )
}

const btnCss = `.ttc-b{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 13px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border:1px solid var(--border);background:var(--surface);color:var(--text)}`
const css = `
.ttc{display:flex;flex-direction:column;gap:5px;margin-top:6px;padding:9px 11px;border:1px dashed var(--border);border-radius:11px}
.ttc-d{margin:0;font-size:12px;color:var(--text-subtle);line-height:1.5}
.ttc-m{margin:0;font-size:12px;font-weight:600;color:var(--link)}
.ttc-t{margin:0;font-size:12px;line-height:1.5;white-space:pre-wrap}
.ttc-t.cap b{color:var(--link)}
.ttc-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px;align-items:flex-end}
.ttc-row textarea{flex:1;min-width:200px;font:inherit;font-size:12px;border:1px solid var(--border);border-radius:9px;padding:6px 9px;background:var(--bg);color:var(--text)}
.ttc-p{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 13px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border:0;background:var(--act,#5A4FCF);color:var(--on-act,#fff)}
.ttc-p:disabled{opacity:.5}
`
