'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import { hasMedia } from '@/lib/contentStatus'
import { RefreshCw, Camera } from 'lucide-react'

// CONTENT DAY — everything the Commander needs Mandi to FILM, compiled into one
// checklist. One line per shot: type of footage · length · what to say/film.
// Sit down once, knock it all out, drop the clips back into RISE.

type Line = { key: string; kind: string; length: string; script: string; account?: string; color?: string; postId: number }

// Estimate spoken length from a script (~2.5 words/sec), rounded to 5s.
function estLength(script: string): string {
  const words = script.trim().split(/\s+/).filter(Boolean).length
  if (!words) return '10s'
  const secs = Math.max(5, Math.round((words / 2.5) / 5) * 5)
  return `~${secs}s`
}

export default function ContentDay() {
  const [posts, setPosts] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState<Record<string, boolean>>({})

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([fetch('/api/content').then(r => r.json()), fetch('/api/accounts').then(r => r.json())])
      .then(([c, a]) => {
        setPosts(Array.isArray(c) ? c : [])
        setAccounts(Array.isArray(a) ? a : [])
      }).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { try { const s = localStorage.getItem('rise-contentday-done'); if (s) setDone(JSON.parse(s)) } catch { /* fresh */ } }, [])
  const toggle = (k: string) => setDone(d => { const n = { ...d, [k]: !d[k] }; try { localStorage.setItem('rise-contentday-done', JSON.stringify(n)) } catch { /* ok */ } return n })

  const acct = (id?: string | null) => accounts.find(a => a.id === id)

  // Build the shoot list: any live post that still needs footage from her — a
  // talking-head script to record, and/or B-roll shots to grab.
  const lines: Line[] = []
  for (const p of posts) {
    if (['published', 'archived'].includes(p.status)) continue
    const a = acct(p.account_id)
    const acctLabel = a ? `${a.emoji} ${a.handle}` : undefined
    // Talking-head: she has a script but hasn't filmed the video yet.
    if ((p.script ?? '').trim() && !(hasMedia(p) && /\.(mp4|mov|webm)/i.test((p.media_url || p.media_urls?.[0] || '')))) {
      lines.push({ key: `${p.id}-th`, kind: 'Talking head', length: estLength(p.script as string), script: p.script as string, account: acctLabel, color: a?.color, postId: p.id })
    }
    // B-roll shots from the footage / frame plan.
    const fp = p.frame_plan ?? ''
    if (fp) {
      fp.split('\n').map(l => l.trim()).filter(l => l.startsWith('•') || l.startsWith('-')).forEach((l, i) => {
        const shot = l.replace(/^[•-]\s*/, '')
        const m = shot.match(/^\[([^\]]+)\]\s*(.*)$/)
        lines.push({ key: `${p.id}-br${i}`, kind: m ? m[1] : 'B-roll', length: '3–6s', script: m ? m[2] : shot, account: acctLabel, color: a?.color, postId: p.id })
      })
    }
  }

  const remaining = lines.filter(l => !done[l.key]).length

  const badge = (kind: string) => {
    const th = /talking/i.test(kind)
    return { background: th ? 'rgba(232,68,138,0.14)' : 'var(--purple-light)', color: th ? '#E8448A' : 'var(--purple)' }
  }

  return (
    <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(120deg, var(--purple-light), transparent)' }}>
        <Camera size={18} color="var(--purple)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.01em' }}>Content Day</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Everything to film today — {remaining} left of {lines.length}</p>
        </div>
        <button onClick={load} disabled={loading} title="Refresh"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
          <RefreshCw size={12} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
        </button>
      </div>

      <div style={{ padding: '10px' }}>
        {loading && <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '14px', textAlign: 'center' }}>Compiling your shoot list…</p>}
        {!loading && lines.length === 0 && (
          <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', padding: '24px 14px', textAlign: 'center', lineHeight: 1.6 }}>Nothing to film right now. 🌊<br />When the Commander drafts posts that need footage, your shoot list builds itself here.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {lines.map(l => {
            const isDone = !!done[l.key]
            return (
              <button key={l.key} onClick={() => toggle(l.key)}
                style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', textAlign: 'left', width: '100%', padding: '11px 12px', borderRadius: '11px', border: '1px solid var(--border)', background: isDone ? 'var(--bg)' : 'var(--surface)', cursor: 'pointer', opacity: isDone ? 0.55 : 1 }}>
                <span style={{ flexShrink: 0, marginTop: '1px', width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${isDone ? '#2E8B60' : 'var(--border)'}`, background: isDone ? '#2E8B60' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 900 }}>{isDone ? '✓' : ''}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '20px', ...badge(l.kind) }}>{l.kind}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{l.length}</span>
                    {l.account && <span style={{ fontSize: '10px', fontWeight: 700, color: l.color || 'var(--text-subtle)' }}>{l.account}</span>}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none' }}>{l.script}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
