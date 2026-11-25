'use client'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Save, X } from 'lucide-react'

// Assistants → Skills (Loop 10). Notes = material, Brain = rules, Skills = procedures an agent
// RUNS. Seeded from the SOPs. "Runs in the app" only when code actually runs it; the rest say
// "not wired yet". Read and edit any skill; your edits are yours (a re-seed never overwrites them).

type Skill = { id: string; name: string; owner: string; sop: string; when: string; steps: string[]; done: string; never: string[]; tools: string[]; wired: boolean; wired_note?: string; runs?: number; last_run_at?: string | null; edited_by?: string }

const OWNER: Record<string, string> = { her: 'Her', commander: 'Man (Commander)', cap: 'Cap', rex: 'Rex', pod: 'Pod', cora: 'Cora', ed: 'Ed', biz: 'Biz', fin: 'Fin', ten: 'Ten', owl: 'Owl', tool: 'Tools' }
const ORDER = Object.keys(OWNER)

export default function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [filter, setFilter] = useState<'all' | 'wired' | 'not'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [edit, setEdit] = useState<Skill | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => { const d = await fetch('/api/skills').then(r => r.json()).catch(() => null); if (d?.skills) setSkills(d.skills) }
  useEffect(() => { load() }, [])

  const groups = useMemo(() => ORDER.map(o => ({ o, items: skills.filter(s => s.owner === o && (filter === 'all' || (filter === 'wired') === s.wired)) })).filter(g => g.items.length), [skills, filter])
  const wiredN = skills.filter(s => s.wired).length

  const save = async () => {
    if (!edit) return
    setSaving(true)
    await fetch('/api/skills', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: edit.id, name: edit.name, when: edit.when, done: edit.done, steps: edit.steps, never: edit.never }) }).catch(() => null)
    setSaving(false); setEdit(null); load()
  }

  return (
    <div className="sk">
      <style>{css}</style>
      <div className="sk-head">
        <div>
          <p className="sk-t">Skills</p>
          <p className="sk-s">The procedures each agent runs. {wiredN} of {skills.length} run in the app today; the rest are written down and not wired yet. Agents name the skill they ran in every receipt.</p>
        </div>
        <div className="sk-f">
          {(['all', 'wired', 'not'] as const).map(f => <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'wired' ? 'Runs in the app' : 'Not wired yet'}</button>)}
        </div>
      </div>
      {!skills.length && <p className="sk-s"><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</p>}
      {groups.map(g => (
        <div key={g.o} className="sk-g">
          <p className="sk-h">{OWNER[g.o]}</p>
          {g.items.map(s => {
            const isOpen = open === s.id
            const e = edit?.id === s.id ? edit : null
            return (
              <div key={s.id} className="sk-i">
                <button type="button" className="sk-row" onClick={() => setOpen(isOpen ? null : s.id)}>
                  <span className="sk-sop">{s.sop}</span>
                  <b>{s.name}</b>
                  <span className={`sk-w ${s.wired ? 'y' : 'n'}`}>{s.wired ? 'Runs in the app' : 'Not wired yet'}</span>
                  {!!s.runs && <span className="sk-runs">ran {s.runs}×</span>}
                  {s.edited_by === 'mandi' && <span className="sk-runs">your edit</span>}
                </button>
                {isOpen && !e && (
                  <div className="sk-body">
                    {s.wired_note && <p className="sk-note">{s.wired_note}</p>}
                    <p><span className="sk-k">When</span>{s.when}</p>
                    <p className="sk-k">Steps</p>
                    <ol>{s.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
                    <p><span className="sk-k">Done when</span>{s.done}</p>
                    {s.never.length > 0 && <><p className="sk-k">Never</p><ul>{s.never.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
                    {s.tools.length > 0 && <p><span className="sk-k">Tools (code)</span><span className="sk-mono">{s.tools.join(' · ')}</span></p>}
                    <button type="button" className="sk-btn" onClick={() => setEdit({ ...s })}><Pencil size={12} /> Edit</button>
                  </div>
                )}
                {isOpen && e && (
                  <div className="sk-body">
                    <label>Name<input value={e.name} onChange={ev => setEdit({ ...e, name: ev.target.value })} /></label>
                    <label>When<textarea rows={2} value={e.when} onChange={ev => setEdit({ ...e, when: ev.target.value })} /></label>
                    <label>Steps (one per line)<textarea rows={Math.max(4, e.steps.length + 1)} value={e.steps.join('\n')} onChange={ev => setEdit({ ...e, steps: ev.target.value.split('\n') })} /></label>
                    <label>Done when<textarea rows={2} value={e.done} onChange={ev => setEdit({ ...e, done: ev.target.value })} /></label>
                    <label>Never (one per line)<textarea rows={Math.max(2, e.never.length + 1)} value={e.never.join('\n')} onChange={ev => setEdit({ ...e, never: ev.target.value.split('\n') })} /></label>
                    <p className="sk-note">Whether it runs in the app isn’t editable here: it says whether code backs it.</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="sk-btn on" disabled={saving} onClick={save}>{saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />} Save</button>
                      <button type="button" className="sk-btn" onClick={() => setEdit(null)}><X size={12} /> Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const css = `
.sk{display:flex;flex-direction:column;gap:12px;border:1px solid var(--border,#E7E1D6);border-radius:16px;background:var(--surface,#fff);padding:14px 16px}
.sk button{font-family:inherit}
.sk-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start}
.sk-t{margin:0;font-size:15px;font-weight:900;color:var(--text)}
.sk-s{margin:2px 0 0;font-size:12px;color:var(--text-subtle);max-width:640px}
.sk-f{display:flex;gap:4px}
.sk-f button{border:1px solid var(--border,#E7E1D6);background:none;color:var(--text);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;cursor:pointer}
.sk-f button.on{background:#5A4FCF;border-color:#5A4FCF;color:#fff}
.sk-h{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle)}
.sk-i{border-top:1px solid var(--border,#E7E1D6)}
.sk-row{all:unset;box-sizing:border-box;width:100%;cursor:pointer;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 2px;font-size:13px;color:var(--text)}
.sk-sop{font-size:11px;color:var(--text-subtle);min-width:84px}
.sk-w{font-size:10.5px;font-weight:800;border-radius:999px;padding:2px 8px}
.sk-w.y{background:#E3F4EA;color:#2F7A4F}
.sk-w.n{background:#F4EEE3;color:#8A6A3A}
.sk-runs{font-size:11px;color:var(--text-subtle)}
.sk-body{display:flex;flex-direction:column;gap:6px;padding:4px 2px 12px 92px;font-size:12.5px;color:var(--text)}
.sk-body p{margin:0}
.sk-body ol,.sk-body ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:3px}
.sk-k{display:inline-block;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text-subtle);margin-right:8px}
.sk-note{font-size:12px;color:#5A4FCF}
.sk-mono{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--text-subtle)}
.sk-body label{display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:800;color:var(--text-subtle)}
.sk-body input,.sk-body textarea{font:inherit;font-size:12.5px;font-weight:400;color:var(--text);border:1px solid var(--border,#E7E1D6);border-radius:9px;padding:6px 9px;background:var(--bg,#fff)}
.sk-btn{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border,#E7E1D6);background:none;color:var(--text);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:800;cursor:pointer}
.sk-btn.on{background:#5A4FCF;border-color:#5A4FCF;color:#fff}
@media (max-width:640px){.sk-body{padding-left:2px}}
`
