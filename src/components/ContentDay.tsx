'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import { hasMedia } from '@/lib/contentStatus'
import { RefreshCw, Camera } from 'lucide-react'

// CONTENT DAY — the shoot list, but designed like the Format Finder concept cards:
// every shot is its own card with the HOOK pulled out big, the script broken into
// scannable beats you can read on camera, a mono meta line, and pill badges. Sit
// down once, film it all, drop the clips back into RISE.

const MONO = 'ui-monospace, "IBM Plex Mono", Menlo, monospace'

type Line = { key: string; kind: string; length: string; script: string; account?: string; color?: string; postId: number; broll?: boolean }

// Estimate spoken length from a script (~2.5 words/sec), rounded to 5s.
function estLength(script: string): string {
  const words = script.trim().split(/\s+/).filter(Boolean).length
  if (!words) return '10s'
  const secs = Math.max(5, Math.round((words / 2.5) / 5) * 5)
  return `~${secs}s`
}

// Break a talking-head script into readable BEATS: honor real line breaks first,
// otherwise split on sentence boundaries. First beat is the hook (said to camera).
function beats(script: string): string[] {
  const raw = script.trim()
  if (!raw) return []
  let parts = raw.split(/\n+/).map(s => s.trim()).filter(Boolean)
  if (parts.length <= 1) {
    parts = raw.split(/(?<=[.!?])\s+(?=[A-Z"'])/).map(s => s.trim()).filter(Boolean)
  }
  return parts.slice(0, 10)
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
    if ((p.script ?? '').trim() && !(hasMedia(p) && /\.(mp4|mov|webm)/i.test((p.media_url || p.media_urls?.[0] || '')))) {
      lines.push({ key: `${p.id}-th`, kind: 'Talking head', length: estLength(p.script as string), script: p.script as string, account: acctLabel, color: a?.color, postId: p.id })
    }
    const fp = p.frame_plan ?? ''
    if (fp) {
      fp.split('\n').map(l => l.trim()).filter(l => l.startsWith('•') || l.startsWith('-')).forEach((l, i) => {
        const shot = l.replace(/^[•-]\s*/, '')
        const m = shot.match(/^\[([^\]]+)\]\s*(.*)$/)
        lines.push({ key: `${p.id}-br${i}`, kind: m ? m[1] : 'B-roll', length: '3–6s', script: m ? m[2] : shot, account: acctLabel, color: a?.color, postId: p.id, broll: true })
      })
    }
  }

  const remaining = lines.filter(l => !done[l.key]).length

  const pill = (broll?: boolean): React.CSSProperties => ({
    fontFamily: MONO, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '3px 9px', borderRadius: '99px',
    background: broll ? 'var(--purple-light)' : 'rgba(232,68,138,0.14)',
    color: broll ? 'var(--purple)' : '#E8448A',
  })
  const metaStyle: React.CSSProperties = { fontFamily: MONO, fontSize: '11.5px', color: 'var(--text-subtle)', letterSpacing: '0.01em' }
  const labelStyle: React.CSSProperties = { fontFamily: MONO, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--purple)' }

  return (
    <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '15px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(120deg, var(--purple-light), transparent)' }}>
        <Camera size={18} color="var(--purple)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--purple)' }}>Shoot list</p>
          <p style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.1 }}>Content Day</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: MONO, fontSize: '11.5px', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{remaining}/{lines.length} left</span>
          <button onClick={load} disabled={loading} title="Refresh"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 9px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          </button>
        </div>
      </div>

      <div style={{ padding: '12px' }}>
        {loading && <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '14px', textAlign: 'center' }}>Compiling your shoot list…</p>}
        {!loading && lines.length === 0 && (
          <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', padding: '24px 14px', textAlign: 'center', lineHeight: 1.6 }}>Nothing to film right now. 🌊<br />When the Commander drafts posts that need footage, your shoot list builds itself here.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lines.map(l => {
            const isDone = !!done[l.key]
            const bs = l.broll ? [] : beats(l.script)
            const hook = l.broll ? l.script : (bs[0] ?? l.script)
            const rest = l.broll ? [] : bs.slice(1)
            return (
              <div key={l.key}
                style={{ border: `1px solid ${isDone ? 'var(--border)' : 'var(--line, var(--border))'}`, borderRadius: '12px', background: isDone ? 'var(--bg)' : 'var(--surface)', padding: '14px 15px', opacity: isDone ? 0.55 : 1, transition: 'opacity .15s' }}>
                {/* top row — checkbox + badges + meta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
                  <button onClick={() => toggle(l.key)} aria-label={isDone ? 'Mark not filmed' : 'Mark filmed'}
                    style={{ flexShrink: 0, marginTop: '1px', width: '22px', height: '22px', borderRadius: '7px', border: `2px solid ${isDone ? '#2E8B60' : 'var(--border)'}`, background: isDone ? '#2E8B60' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}>{isDone ? '✓' : ''}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={pill(l.broll)}>{l.kind}</span>
                      {l.account && <span style={{ fontSize: '11px', fontWeight: 700, color: l.color || 'var(--text-subtle)' }}>{l.account}</span>}
                    </div>
                    {/* meta line, Format-Finder style */}
                    <p style={{ ...metaStyle, marginBottom: '7px' }}>{l.broll ? 'B-roll' : 'Talking head'} · {l.length}{rest.length ? ` · ${bs.length} beats` : ''}</p>
                    {/* HOOK pulled out big — the on-camera opener */}
                    <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.4, letterSpacing: '-0.01em', textDecoration: isDone ? 'line-through' : 'none' }}>{hook}</p>
                  </div>
                </div>

                {/* BEATS — the rest of the script, broken into readable lines */}
                {rest.length > 0 && (
                  <div style={{ marginTop: '11px', paddingTop: '11px', borderTop: '1px dashed var(--border)', paddingLeft: '33px' }}>
                    <p style={{ ...labelStyle, marginBottom: '7px' }}>Beats</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {rest.map((b, i) => (
                        <div key={i} style={{ display: 'flex', gap: '11px', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', minWidth: '18px', flexShrink: 0 }}>{String(i + 2).padStart(2, '0')}</span>
                          <p style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.5 }}>{b}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
