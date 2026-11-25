'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, HeartPulse } from 'lucide-react'
import { healthActions, type HealthAction } from '@/lib/healthActions'

// Activity → System health (Loop 9). The last saved quick and full checks, with buttons to run
// either now. Every problem has one next fix and says who acts: you, an agent, or a build session.

type Finding = { key: string; area: string; level: 'needs_you' | 'agents' | 'build' | 'fyi'; title: string; detail?: string; fix: string }
type Report = { mode: 'quick' | 'full'; ran_at: string; ok: string[]; findings: Finding[]; ms: number; build_logged?: string[] }

const LEVEL: Record<Finding['level'], { label: string; color: string }> = {
  needs_you: { label: 'Needs you', color: 'var(--bad)' },
  agents: { label: 'Agents pick it up', color: 'var(--link)' },
  build: { label: 'Needs a build (logged)', color: '#B0662E' },
  fyi: { label: 'Just so you know', color: 'var(--text-subtle)' },
}

export default function HealthPanel() {
  const [last, setLast] = useState<{ last_quick?: Report | null; last_full?: Report | null }>({})
  const [busy, setBusy] = useState<'quick' | 'full' | null>(null)
  const [showOk, setShowOk] = useState(false)
  const load = useCallback(async () => { const d = await fetch('/api/health').then(r => r.json()).catch(() => ({})); setLast(d ?? {}) }, [])
  useEffect(() => { load() }, [load])
  const [doing, setDoing] = useState('')
  const [asking, setAsking] = useState<{ key: string; a: HealthAction; text: string } | null>(null)
  const [note, setNote] = useState('')
  const act = async (key: string, a: HealthAction, answer?: string) => {
    setDoing(key + a.label); setNote('')
    const r = await fetch(a.url, { method: a.method ?? 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answer !== undefined && a.askField ? { ...a.body, [a.askField]: answer } : a.body) }).then(x => x.json()).catch(() => ({ error: 'Connection hiccup.' }))
    if (!r?.error) await fetch('/api/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve', key }) }).catch(() => null)
    setDoing(''); setAsking(null); setNote(r?.error ? `Didn’t work: ${r.error}` : `Done: ${a.label.replace('…', '')}`)
    load()
  }
  const run = async (mode: 'quick' | 'full') => { setBusy(mode); await fetch(`/api/health?run=${mode}`).catch(() => null); setBusy(null); load() }

  const r = [last.last_full, last.last_quick].filter(Boolean).sort((a, b) => b!.ran_at.localeCompare(a!.ran_at))[0] ?? null
  const groups = (['needs_you', 'agents', 'build', 'fyi'] as const).map(l => ({ l, items: (r?.findings ?? []).filter(f => f.level === l) })).filter(g => g.items.length)

  return (
    <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}><HeartPulse size={14} color="#B23A48" /> System health</p>
          <p style={{ fontSize: '11.5px', color: 'var(--text-subtle)', marginTop: '2px' }}>Connections, stuck work, stale direction and the Reset sequence. It reports; it never changes anything.</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['quick', 'full'] as const).map(m => (
            <button key={m} type="button" disabled={!!busy} onClick={() => run(m)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '999px', border: '1px solid var(--border)', background: m === 'full' ? 'var(--surface)' : '#5A4FCF', color: m === 'full' ? 'var(--text)' : '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', opacity: busy && busy !== m ? 0.5 : 1 }}>
              {busy === m && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />} {m === 'quick' ? 'Quick check' : 'Full check'}
            </button>
          ))}
        </div>
      </div>
      {!r && <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '10px' }}>No check has run yet. Opening Her on Home runs the quick one.</p>}
      {r && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {note && <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--link)', margin: 0 }}>{note}</p>}
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{r.mode === 'full' ? 'Full' : 'Quick'} check · {new Date(r.ran_at).toLocaleString()} · {r.findings.length} problem{r.findings.length === 1 ? '' : 's'} · {r.ok.length} fine{r.build_logged?.length ? ` · ${r.build_logged.length} new on the build log` : ''}</p>
          {groups.map(g => (
            <div key={g.l}>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: LEVEL[g.l].color, marginBottom: '4px' }}>{LEVEL[g.l].label} · {g.items.length}</p>
              {g.items.map(f => (
                <div key={f.key} style={{ padding: '7px 0', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>{f.title}</span>
                  {f.detail && <span style={{ fontSize: '11.5px', color: 'var(--text-subtle)' }}>{f.detail}</span>}
                  <span style={{ fontSize: '12px', color: 'var(--link)' }}>Next: {f.fix}</span>
                  {healthActions(f.key).length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                      {healthActions(f.key).map(a => (
                        <button key={a.label} type="button" disabled={doing === f.key + a.label} onClick={() => a.ask ? setAsking({ key: f.key, a, text: '' }) : act(f.key, a)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', border: a.primary ? 'none' : '1px solid var(--border)', background: a.primary ? '#5A4FCF' : 'var(--surface)', color: a.primary ? '#fff' : 'var(--text)', fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {doing === f.key + a.label ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}{a.label}
                        </button>
                      ))}
                      {asking?.key === f.key && <>
                        <input autoFocus placeholder={asking.a.ask} value={asking.text} onChange={e => setAsking({ ...asking, text: e.target.value })} style={{ font: 'inherit', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 8px', background: 'var(--bg)', color: 'var(--text)' }} />
                        <button type="button" disabled={!asking.text.trim()} onClick={() => act(f.key, asking.a, asking.text.trim())} style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', background: '#5A4FCF', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                      </>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          <button type="button" onClick={() => setShowOk(x => !x)} style={{ all: 'unset', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#3DAA7C' }}>{showOk ? 'Hide' : 'Show'} what’s fine ({r.ok.length})</button>
          {showOk && <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-subtle)' }}>{r.ok.map(o => <li key={o}>{o}</li>)}</ul>}
        </div>
      )}
    </div>
  )
}
