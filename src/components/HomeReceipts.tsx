'use client'
// Phase 8 · B2: compact receipts beside the Home chat (desktop only, hidden on phones by CSS).
// What got routed where, what was handed off, what got made — straight from the handoff receipts.
import { useEffect, useState } from 'react'

type Ref = { type: string; id: number | string; label?: string }
type H = { id: string; from: string; to: string; what?: string; status: 'open' | 'done' | 'failed'; receipt?: string | null; receipt_refs?: Ref[]; updated_at: string }
const NAME: Record<string, string> = { her: 'Her', commander: 'Man', man: 'Man', cap: 'Cap', ed: 'Ed', pod: 'Pod', cora: 'Cora', ten: 'Ten', rex: 'Ed', mandi: 'You', biz: 'Biz' }
const nm = (a: string) => NAME[a] ?? a
const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d` }
const go = (view: string) => window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view } }))

export default function HomeReceipts() {
  const [list, setList] = useState<H[] | null>(null)
  useEffect(() => {
    const load = () => fetch('/api/handoffs?limit=40').then(r => r.json()).then(d => {
      const hs = (d?.handoffs ?? []) as H[]
      setList(hs.filter(h => h.status !== 'open' || h.to === 'mandi').sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8))
    }).catch(() => setList([]))
    load()
    const t = setInterval(load, 60000)
    const on = () => load()
    window.addEventListener('rise-data-changed', on)
    return () => { clearInterval(t); window.removeEventListener('rise-data-changed', on) }
  }, [])

  return (
    <aside className="rp-card hr" aria-label="Receipts">
      <p className="hr-h">Receipts</p>
      {list === null ? <div className="qc-skel" aria-hidden><span /><span /><span /></div>
        : list.length === 0 ? <p className="hr-s">Nothing handed off yet today.</p>
        : list.map(h => {
          const cards = (h.receipt_refs ?? []).filter(r => r.type === 'card').length
          return (
            <div key={h.id} className={`hr-i ${h.status}`}>
              <span className="hr-who">{nm(h.from)} → {nm(h.to)} <span className="hr-t">{ago(h.updated_at)}</span></span>
              <span className="hr-w">{h.what || '(no note)'}</span>
              {h.status === 'failed' ? <span className="hr-bad">Didn’t finish{h.receipt ? `: ${h.receipt.slice(0, 90)}` : ''}</span>
                : h.receipt ? <span className="hr-s">{h.receipt.split('\n')[0].slice(0, 120)}</span> : null}
              {cards > 0 && <span className="hr-tag">{cards} card{cards === 1 ? '' : 's'}</span>}
            </div>
          )
        })}
      <button type="button" className="rp-pill rp-quiet" onClick={() => go('activity')}>All activity →</button>
    </aside>
  )
}
