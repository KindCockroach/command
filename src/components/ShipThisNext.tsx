'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import { priorityScore } from '@/lib/priority'
import { PURPOSE_META, postPurpose } from '@/lib/contentStatus'
import { Rocket, RefreshCw, ArrowRight, Loader2 } from 'lucide-react'

// SHIP THIS NEXT — the priority brain. Scores every actionable post (goal-fit ·
// impact · ease of filming · readiness · cash) and shows the top few to work on
// FIRST, each with WHY. Check one off and the next-highest slides in — the list
// stays a live top-N, never empty, never stale. The assessment Mandi struggles
// to make day to day, made for her.

const MONO = 'ui-monospace, "IBM Plex Mono", Menlo, monospace'
const SHOW = 5

export default function ShipThisNext() {
  const [posts, setPosts] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState<Record<number, boolean>>({})

  const dayKey = new Date().toLocaleDateString('en-CA')
  const load = useCallback(() => {
    setLoading(true)
    Promise.all([fetch('/api/content').then(r => r.json()), fetch('/api/accounts').then(r => r.json())])
      .then(([c, a]) => { setPosts(Array.isArray(c) ? c : []); setAccounts(Array.isArray(a) ? a : []) })
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { try { const s = localStorage.getItem(`rise-shipnext-done-${dayKey}`); if (s) setDone(JSON.parse(s)) } catch { /* fresh */ } }, [dayKey])
  const check = (id: number) => setDone(d => { const n = { ...d, [id]: !d[id] }; try { localStorage.setItem(`rise-shipnext-done-${dayKey}`, JSON.stringify(n)) } catch { /* ok */ } return n })

  const acct = (id?: string | null) => accounts.find(a => a.id === id) || null

  // Actionable = alive and workable (not published/scheduled/archived/held).
  const actionable = posts.filter(p => !['published', 'archived', 'scheduled', 'held'].includes(p.status))
  const ranked = actionable
    .map(p => ({ p, ...priorityScore(p, acct(p.account_id)) }))
    .sort((a, b) => b.score - a.score)
  const shown = ranked.filter(r => !done[r.p.id]).slice(0, SHOW)
  const remaining = ranked.filter(r => !done[r.p.id]).length

  const go = (view: string) => window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view } }))
  const openPost = (p: ContentPiece) => {
    // Film-needing posts → Content Day; ready ones → Accounts to approve.
    const needsFilm = !(p.media_url || p.media_urls?.length)
    if (p.account_id) { try { localStorage.setItem('station-flip-account', p.account_id) } catch { /* ok */ } }
    go(needsFilm ? 'contentday' : 'accounts')
  }

  const scoreColor = (s: number) => s >= 72 ? '#2E8B60' : s >= 55 ? 'var(--purple)' : s >= 40 ? '#B96A1E' : 'var(--text-subtle)'

  return (
    <div style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'linear-gradient(160deg, var(--surface), var(--surface-raised))', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ width: '28px', height: '28px', borderRadius: '9px', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Rocket size={15} color="#fff" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.01em' }}>Ship this next</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Ranked by goal-fit · reach · ease · readiness · cash — check one off, the next slides in</p>
        </div>
        <button onClick={load} disabled={loading} title="Re-rank" style={{ display: 'flex', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: '9px', padding: '7px', cursor: 'pointer', color: 'var(--text-muted)' }}>
          {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
        </button>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {loading && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assessing what to work on first…</p>}
        {!loading && shown.length === 0 && (
          <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', lineHeight: 1.5, padding: '8px 2px' }}>Nothing waiting — either it&apos;s all approved or you&apos;ve checked it off. Drop an idea in the Commander and it&apos;ll rank here. 🌊</p>
        )}
        {shown.map(({ p, score, reasons }, i) => {
          const a = acct(p.account_id)
          const pm = PURPOSE_META[postPurpose(p)]
          return (
            <div key={p.id} style={{ display: 'flex', gap: '11px', padding: '11px 12px', borderRadius: '12px', background: 'var(--surface)', border: `1px solid ${i === 0 ? 'var(--purple)' : 'var(--border)'}`, boxShadow: i === 0 ? 'var(--shadow-sm)' : 'none' }}>
              <button onClick={() => check(p.id)} title="Check off — the next priority slides in"
                style={{ flexShrink: 0, width: '22px', height: '22px', marginTop: '1px', borderRadius: '7px', border: `2px solid ${i === 0 ? 'var(--purple)' : 'var(--border)'}`, background: 'transparent', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '3px' }}>
                  <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: scoreColor(score) }}>{score}</span>
                  {a && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px', background: `${a.color}18`, color: a.color }}>{a.emoji} {a.handle}</span>}
                  <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px', background: pm.bg, color: pm.color }}>{pm.emoji} {pm.label}</span>
                </div>
                <p style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.4 }}>Why: {reasons.join(' · ')}</p>
                <button onClick={() => openPost(p)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '7px', padding: '5px 11px', borderRadius: '9px', border: 'none', background: i === 0 ? 'var(--purple)' : 'var(--purple-light)', color: i === 0 ? '#fff' : 'var(--purple)', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>
                  Work on this <ArrowRight size={11} />
                </button>
              </div>
            </div>
          )
        })}
        {shown.length > 0 && remaining > shown.length && (
          <p style={{ fontSize: '10.5px', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '2px' }}>{remaining - shown.length} more ranked below — check these off to reveal them.</p>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
