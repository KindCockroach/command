'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, ChevronDown } from 'lucide-react'
import { TalkToCapButton, TalkToCapThread } from './TalkToCap'
import GrowBox from './GrowBox'

// Approve: everything waiting on your yes, in one window. Each thing still lives in its own tab;
// this gathers them, lets you read the draft right here, and approve (or say no with a reason).

type Action = { label: string; kind: 'post'; url: string; method?: 'POST' | 'PATCH'; body: Record<string, unknown>; reason?: string; reasonField?: string; primary?: boolean; resolve?: string } | { label: string; kind: 'open'; view: string }
type Item = { id: string; source: string; from: string; title: string; detail?: string; body?: string; at: string; view: string; actions: Action[]; chat?: number }
type Data = { items: Item[]; counts: Record<string, number>; total: number; labels: Record<string, string> }

const ORDER = ['plan', 'notes', 'email', 'story', 'substack', 'send', 'idea', 'question', 'brain', 'health']
const go = (view: string) => window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view } }))

export default function ApprovalsPanel() {
  const [d, setD] = useState<Data | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [ask, setAsk] = useState<{ item: string; action: number; text: string } | null>(null)
  const [showHealth, setShowHealth] = useState(false)
  // Talk to Cap about one item (components/TalkToCap.tsx).
  const [chatOpen, setChatOpen] = useState<string | null>(null)

  const load = useCallback(async () => { const r = await fetch('/api/approvals').then(x => x.json()).catch(() => null); if (r?.items) setD(r) }, [])
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])

  const run = async (it: Item, a: Action, reason?: string) => {
    if (a.kind === 'open') return go(a.view)
    setBusy(it.id + a.label); setMsg('')
    const r = await fetch(a.url, { method: a.method ?? 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reason !== undefined ? { ...a.body, [a.reasonField ?? 'reason']: reason } : a.body) }).then(x => x.json()).catch(() => ({ error: 'Connection hiccup. Try again.' }))
    if (!r?.error && a.resolve) await fetch('/api/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve', key: a.resolve }) }).catch(() => null)
    setBusy(''); setAsk(null)
    setMsg(r?.error ? `“${it.title.slice(0, 50)}”: ${r.error}` : `Done: ${a.label.replace('…', '')} · ${it.title.slice(0, 60)}`)
    load()
  }

  if (!d) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
  const groups = ORDER.map(s => ({ s, items: d.items.filter(i => i.source === s) })).filter(g => g.items.length && (g.s !== 'health' || true))

  return (
    <div className="ap">
      <style>{css}</style>
      <div className="ap-head">
        <div>
          <h1>Approve</h1>
          <p>Everything waiting on your yes, in one place. {d.total ? `${d.total} waiting.` : 'Nothing waiting on you right now.'} Each one still lives in its own tab too.</p>
        </div>
        <button type="button" className="ap-ghost" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>
      {msg && <p className="ap-msg">{msg}</p>}

      {groups.map(g => g.s === 'health' ? (
        <div key={g.s} className="ap-g">
          <button type="button" className="ap-gh" onClick={() => setShowHealth(x => !x)}>{d.labels[g.s]} · {g.items.length} <ChevronDown size={13} style={{ transform: showHealth ? 'rotate(180deg)' : 'none' }} /></button>
          {showHealth && g.items.map(row)}
        </div>
      ) : (
        <div key={g.s} className="ap-g">
          <p className="ap-gh">{d.labels[g.s]} · {g.items.length}</p>
          {g.items.map(row)}
        </div>
      ))}
    </div>
  )

  // A plain render helper, NOT a component: a component defined inside this one is a brand-new
  // type every render, so React threw away each row (and the text she was typing) on every refresh.
  function row(it: Item) {
    return (
      <div key={it.id} className="ap-i">
        <span className="ap-from">{it.from}</span>
        <b>{it.title}</b>
        {it.detail && <span className="ap-d">{it.detail}</span>}
        {it.body && <>
          <button type="button" className="ap-link" onClick={() => setOpen(o => ({ ...o, [it.id]: !o[it.id] }))}>{open[it.id] ? 'Hide' : 'Read it here'}</button>
          {open[it.id] && <div className="ap-body">{it.body}</div>}
        </>}
        <div className="ap-row">
          <TalkToCapButton id={it.id} count={it.chat} open={chatOpen === it.id} onToggle={id => setChatOpen(c => c === id ? null : id)} />
          {it.actions.map((a, k) => (
            <button key={k} type="button" className={a.kind === 'post' && a.primary ? 'ap-p' : 'ap-ghost'} disabled={busy === it.id + a.label}
              onClick={() => a.kind === 'post' && a.reason ? setAsk({ item: it.id, action: k, text: '' }) : run(it, a)}>
              {busy === it.id + a.label ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}{a.label}
            </button>
          ))}
        </div>
        {chatOpen === it.id && <TalkToCapThread id={it.id} onChanged={() => load()} />}
        {ask?.item === it.id && (() => { const a = it.actions[ask.action] as Extract<Action, { kind: 'post' }>; return (
          <div className="ap-row">
            <GrowBox autoFocus placeholder={a.reason} value={ask.text} onChange={e => setAsk({ ...ask, text: e.target.value })} />
            <button type="button" className="ap-p" disabled={!ask.text.trim()} onClick={() => run(it, a, ask.text.trim())}>{a.label.replace('…', '')}</button>
            <button type="button" className="ap-ghost" onClick={() => setAsk(null)}>Cancel</button>
          </div>
        ) })()}
      </div>
    )
  }
}

const css = `
.ap{display:flex;flex-direction:column;gap:14px;max-width:860px}
.ap button{font-family:inherit}
.ap-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
.ap-head h1{margin:0;font-size:28px;font-weight:600;background:linear-gradient(115deg,#5A4FCF,#D98AB7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ap-head p{margin:3px 0 0;font-size:12px;color:var(--text-muted)}
.ap-msg{margin:0;font-size:12px;font-weight:600;color:var(--link)}
.ap-g{border:1px solid var(--border);border-radius:16px;background:var(--surface);padding:12px 15px;display:flex;flex-direction:column}
.ap-gh{all:unset;display:flex;align-items:center;gap:6px;cursor:default;margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle)}
button.ap-gh{cursor:pointer}
.ap-i{display:flex;flex-direction:column;gap:3px;padding:10px 0;border-top:1px solid var(--border);font-size:14px;color:var(--text)}
.ap-i:first-of-type{border-top:0}
.ap-from{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--gold)}
.ap-d{font-size:12px;color:var(--text-subtle);line-height:1.5}
.ap-link{all:unset;cursor:pointer;font-size:12px;font-weight:600;color:var(--link)}
.ap-body{white-space:pre-wrap;font-size:14px;line-height:1.55;background:var(--surface-raised,#F4F1EC);border-radius:10px;padding:10px 12px;max-height:420px;overflow-y:auto}
.ap-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;align-items:flex-end}
.ap-row input,.ap-row textarea{flex:1;min-width:200px;font:inherit;font-size:12px;border:1px solid var(--border);border-radius:9px;padding:6px 9px;background:var(--bg);color:var(--text)}
.ap-p,.ap-ghost{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 13px;font-size:12px;font-weight:600;cursor:pointer}
.ap-p{border:0;background:#5A4FCF;color:#fff}
.ap-ghost{border:1px solid var(--border);background:var(--surface);color:var(--text)}
.ap-p:disabled,.ap-ghost:disabled{opacity:.5}
`
