'use client'
import { useState, useEffect } from 'react'
import { Loader2, ExternalLink, Lock, RefreshCw, EyeOff, Eye } from 'lucide-react'
import { SITE_MAP, siteUrl, pageKey } from '@/lib/sites'

const HIDE_KEY = 'rise-sites-hidden-v1'

function dot(status: number | undefined, isPrivate?: boolean): { color: string; title: string } {
  if (isPrivate) return { color: 'var(--text-subtle)', title: 'private (gated)' }
  if (status === undefined) return { color: 'var(--border)', title: 'not checked yet' }
  if (status === 200) return { color: '#3DAA7C', title: 'live (200)' }
  if (status === 401 || status === 403) return { color: '#E0912F', title: `gated (${status})` }
  if (status >= 300 && status < 400) return { color: '#E0912F', title: `redirect (${status})` }
  if (status === 0) return { color: '#E05252', title: 'unreachable' }
  return { color: '#E05252', title: `error (${status})` }
}

export default function SitesPanel() {
  const [statuses, setStatuses] = useState<Record<string, number>>({})
  const [checking, setChecking] = useState(false)
  const [hidden, setHidden] = useState<string[]>([])
  const [showHidden, setShowHidden] = useState(false)

  useEffect(() => {
    try { const s = localStorage.getItem(HIDE_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p)) setHidden(p) } } catch { /* fresh */ }
  }, [])

  const check = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/sites')
      const d = await res.json()
      if (d.statuses) setStatuses(d.statuses)
    } catch { /* leave unchecked */ } finally { setChecking(false) }
  }
  useEffect(() => { let cancelled = false; (async () => { setChecking(true); try { const res = await fetch('/api/sites'); const d = await res.json(); if (!cancelled && d.statuses) setStatuses(d.statuses) } catch { /* */ } finally { if (!cancelled) setChecking(false) } })(); return () => { cancelled = true } }, [])

  const toggleHide = (key: string) => setHidden(h => {
    const next = h.includes(key) ? h.filter(x => x !== key) : [...h, key]
    try { localStorage.setItem(HIDE_KEY, JSON.stringify(next)) } catch { /* non-fatal */ }
    return next
  })

  const liveCount = Object.values(statuses).filter(s => s === 200).length
  const totalChecked = Object.keys(statuses).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🗺️</span>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Sites</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Every web property you own — 3 domains{totalChecked > 0 ? ` · ${liveCount}/${totalChecked} public pages live` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {hidden.length > 0 && (
            <button onClick={() => setShowHidden(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              {showHidden ? <Eye size={13} /> : <EyeOff size={13} />} {showHidden ? 'Hiding' : 'Show hidden'} ({hidden.length})
            </button>
          )}
          <button onClick={check} disabled={checking} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--purple)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
            {checking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />} Re-check live
          </button>
        </div>
      </div>

      {SITE_MAP.map(d => {
        const groups = [...new Set(d.pages.map(p => p.group))]
        return (
          <div key={d.domain} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            <a href={siteUrl(d.domain, '/')} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 16px', background: 'var(--surface-raised)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '18px' }}>{d.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{d.domain}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{d.blurb}</p>
              </div>
              <ExternalLink size={14} style={{ color: 'var(--text-subtle)' }} />
            </a>
            <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groups.map(g => {
                const pages = d.pages.filter(p => p.group === g && (showHidden || !hidden.includes(pageKey(d.domain, p.path))))
                if (pages.length === 0) return null
                return (
                  <div key={g}>
                    <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', marginBottom: '6px' }}>{g}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {pages.map(p => {
                        const key = pageKey(d.domain, p.path)
                        const dd = dot(statuses[key], p.private)
                        const isHidden = hidden.includes(key)
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '5px 8px', borderRadius: '8px', opacity: isHidden ? 0.5 : 1 }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-raised)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                            <span title={dd.title} style={{ width: '9px', height: '9px', borderRadius: '50%', background: dd.color, flexShrink: 0 }} />
                            <a href={siteUrl(d.domain, p.path)} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: '8px', textDecoration: 'none', minWidth: 0 }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{p.path}</span>
                            </a>
                            {p.private && <Lock size={11} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />}
                            <button onClick={() => toggleHide(key)} title={isHidden ? 'Unhide' : 'Hide (retired/unused)'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px', display: 'flex', flexShrink: 0 }}>
                              {isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <p style={{ fontSize: '11px', color: 'var(--text-subtle)', textAlign: 'center' }}>
        🟢 live · 🟡 gated/redirect · 🔴 down · ⚪ private. Hide anything retired with the eye. Private Command Center pages aren&apos;t status-checked.
      </p>
    </div>
  )
}
