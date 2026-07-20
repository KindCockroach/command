'use client'
import { useState, useEffect } from 'react'
import { Loader2, Search, ExternalLink } from 'lucide-react'
import ResearchBrief, { type ResearchBriefT } from './ResearchBrief'

interface AccountLite { id: string; handle: string; emoji: string; topic: string }

// The Research tab — daily brief + a deep-dig desk that researches topics
// (optionally FOR a specific account, feeding real facts to future content).
export default function ResearchPanel() {
  const [accounts, setAccounts] = useState<AccountLite[]>([])
  const [topic, setTopic] = useState('')
  const [accountId, setAccountId] = useState('')
  const [digging, setDigging] = useState(false)
  const [digResult, setDigResult] = useState<ResearchBriefT | null>(null)
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<ResearchBriefT[]>([])

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(Array.isArray(d) ? d : d.accounts ?? [])).catch(() => {})
    fetch('/api/research').then(r => r.json()).then(d => setRecent((d?.recent ?? []).filter((b: ResearchBriefT) => b.kind === 'dig'))).catch(() => {})
  }, [])

  const dig = async () => {
    if (!topic.trim()) return
    setDigging(true); setError(''); setDigResult(null)
    const d = await fetch('/api/research', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dig', topic: topic.trim(), accountId: accountId || undefined, save: true }),
    }).then(r => r.json()).catch(() => ({ error: 'connection failed' }))
    if (d.brief) { setDigResult(d.brief); setRecent(prev => [d.brief, ...prev]) }
    else setError(d.error || 'Research failed')
    setDigging(false)
  }

  const Items = ({ b }: { b: ResearchBriefT }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {b.summary && <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{b.summary}</p>}
      {b.items.map((it, i) => (
        <a key={i} href={it.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', padding: '11px 12px', background: 'var(--surface-raised)', borderRadius: '10px', border: '1px solid var(--border)', textDecoration: 'none' }}>
          <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', display: 'flex', gap: '5px' }}>
            <span style={{ flex: 1 }}>{it.headline}</span> <ExternalLink size={11} style={{ color: 'var(--text-subtle)', flexShrink: 0, marginTop: '3px' }} />
          </p>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--purple)', marginTop: '2px', textTransform: 'uppercase' }}>{it.source}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.5 }}>{it.why_it_matters}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '3px', fontStyle: 'italic', lineHeight: 1.5 }}>🎙 {it.talk_track}</p>
        </a>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Research Desk</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>The station reads so you can speak. Daily must-reads + deep digs that feed your accounts real facts.</p>
      </div>

      {/* Daily brief, full detail */}
      <ResearchBrief />

      {/* Deep dig desk */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>⛏️</span>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Deep dig</span>
          <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>scientific research, history, trends — real sources, saved to Notes as content fuel</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') dig() }}
            placeholder="e.g. what actually happens hormonally in a first period — evidence for a tween education account"
            style={{ flex: '1 1 300px', padding: '11px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit' }} />
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '12px', fontFamily: 'inherit' }}>
            <option value="">No account — general</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.handle}</option>)}
          </select>
          <button onClick={dig} disabled={digging || !topic.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 18px', borderRadius: '10px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: !topic.trim() ? 0.5 : 1 }}>
            {digging ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Digging…</> : <><Search size={14} /> Dig</>}
          </button>
        </div>
        {error && <p style={{ fontSize: '12px', color: '#E05252', fontWeight: 600 }}>⚠ {error}</p>}
        {digResult && <Items b={digResult} />}
      </div>

      {/* Past digs */}
      {recent.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>🗂 Past digs</span>
          {recent.slice(0, 8).map(b => (
            <details key={b.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px' }}>
              <summary style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>
                {b.topic} <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600 }}>· {b.date}{b.account_id ? ` · ${b.account_id}` : ''}</span>
              </summary>
              <div style={{ marginTop: '10px' }}><Items b={b} /></div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
