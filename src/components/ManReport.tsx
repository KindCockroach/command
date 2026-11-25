'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Inside Her: Man's (Commander's) report. He runs the quick health check every time Her opens
// (the full one weekly) and carries the agents' ideas up. Her shows Mandi only what needs her,
// and holds the ideas for a day with room. Nothing here blocks her or acts on its own.

type Finding = { key: string; area: string; level: string; title: string; detail?: string; fix: string }
type Idea = { id: string; from: string; from_label: string; text: string; why?: string; source?: string }
type Report = {
  needs_you: Finding[]; agents: number; build: number; ran_at: string; mode: 'quick' | 'full'; full_ran_at: string | null
  ideas: { room: boolean; due_today: number; capacity: number; waiting: number; ideas: Idea[] }
}

export default function ManReport() {
  const [r, setR] = useState<Report | null>(null)
  const [err, setErr] = useState('')
  const [all, setAll] = useState(false)
  const [force, setForce] = useState(false)
  const [noFor, setNoFor] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const d = await fetch('/api/health?for=her').then(x => x.json()).catch(() => null)
    if (!d || d.error) { setErr('Man couldn’t run the check just now.'); return }
    setErr(''); setR(d)
  }, [])
  useEffect(() => { load() }, [load])

  const answer = async (id: string, a: 'yes' | 'no') => {
    setBusy(id)
    await fetch('/api/ideas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, answer: a, reason: a === 'no' ? reason : undefined }) }).catch(() => null)
    setBusy(null); setNoFor(null); setReason('')
    load()
  }

  if (err) return <p className="mr-s">{err}</p>
  if (!r) return <p className="mr-s"><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Man is checking the station…</p>
  const shown = all ? r.needs_you : r.needs_you.slice(0, 4)
  const ideas = r.ideas
  const showIdeas = ideas.ideas.length > 0 && (ideas.room || force)

  return (
    <div className="mr">
      <style>{css}</style>
      <p className="mr-h">From Man{r.needs_you.length ? ` · ${r.needs_you.length} need${r.needs_you.length === 1 ? 's' : ''} you` : ''}</p>
      {r.needs_you.length === 0 && <p className="mr-s">Nothing needs you from the health check{r.agents ? ` (${r.agents} thing${r.agents > 1 ? 's' : ''} the agents pick up on their own)` : ''}.</p>}
      {shown.map(f => (
        <div key={f.key} className="mr-f">
          <b>{f.title}</b>
          {f.detail && <span className="mr-d">{f.detail}</span>}
          <span className="mr-fix">Next: {f.fix}</span>
        </div>
      ))}
      {r.needs_you.length > 4 && <button type="button" className="mr-link" onClick={() => setAll(x => !x)}>{all ? 'Show fewer' : `Show all ${r.needs_you.length}`}</button>}

      {ideas.ideas.length > 0 && !showIdeas && (
        <p className="mr-s">{ideas.waiting} idea{ideas.waiting > 1 ? 's' : ''} from the agents, held for a lighter day ({ideas.due_today} of {ideas.capacity} slots on today). <button type="button" className="mr-link" onClick={() => setForce(true)}>Show anyway</button></p>
      )}
      {showIdeas && (
        <div className="mr-ideas">
          <p className="mr-h">Ideas from the agents (theirs, not yours)</p>
          {ideas.ideas.map(i => (
            <div key={i.id} className="mr-i">
              <span className="mr-who">{i.from_label}’s idea</span>
              <b>{i.text}</b>
              {i.why && <span className="mr-d">Why: {i.why}</span>}
              {noFor === i.id ? (
                <div className="mr-row">
                  <input value={reason} placeholder="Why not? (goes to Notes with it)" onChange={e => setReason(e.target.value)} />
                  <button type="button" disabled={busy === i.id} onClick={() => answer(i.id, 'no')}>Park it</button>
                  <button type="button" className="mr-ghost" onClick={() => { setNoFor(null); setReason('') }}>Cancel</button>
                </div>
              ) : (
                <div className="mr-row">
                  <button type="button" disabled={busy === i.id} onClick={() => answer(i.id, 'yes')}>Yes, hand it on</button>
                  <button type="button" className="mr-ghost" disabled={busy === i.id} onClick={() => setNoFor(i.id)}>No</button>
                </div>
              )}
            </div>
          ))}
          {ideas.waiting > ideas.ideas.length && <p className="mr-s">{ideas.waiting - ideas.ideas.length} more after these.</p>}
        </div>
      )}
      <p className="mr-t">{r.mode === 'full' ? 'Full' : 'Quick'} check {new Date(r.ran_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{r.full_ran_at && r.mode !== 'full' ? ` · last full check ${new Date(r.full_ran_at).toLocaleDateString()}` : ''}{r.build ? ` · ${r.build} logged for a build session` : ''}</p>
    </div>
  )
}

const css = `
.mr{display:flex;flex-direction:column;gap:6px;border:1px dashed var(--border,#E7E1D6);border-radius:12px;padding:10px 11px}
.mr button{font-family:inherit}
.mr-h{margin:0;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle)}
.mr-s{margin:0;font-size:12px;color:var(--text-subtle)}
.mr-t{margin:2px 0 0;font-size:10.5px;color:var(--text-subtle)}
.mr-f,.mr-i{display:flex;flex-direction:column;gap:2px;font-size:12.5px;color:var(--text);padding:6px 0;border-top:1px solid var(--border,#E7E1D6)}
.mr-f:first-of-type{border-top:0}
.mr-d{font-size:11.5px;color:var(--text-subtle)}
.mr-fix{font-size:12px;color:#5A4FCF}
.mr-who{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#B0662E}
.mr-link{all:unset;cursor:pointer;font-size:12px;font-weight:700;color:#7C4DDB}
.mr-ideas{display:flex;flex-direction:column;gap:4px;margin-top:4px}
.mr-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.mr-row button{border:0;background:#7C4DDB;color:#fff;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:800;cursor:pointer}
.mr-row button.mr-ghost{background:none;color:var(--text);border:1px solid var(--border,#E7E1D6)}
.mr-row button:disabled{opacity:.5}
.mr-row input{flex:1;min-width:160px;font:inherit;font-size:12.5px;border:1px solid var(--border,#E7E1D6);border-radius:9px;padding:5px 9px;background:var(--bg,#fff);color:var(--text)}
`
