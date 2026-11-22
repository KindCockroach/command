'use client'
import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'

// Handoff receipts between agents: from → to, what, the card or record, the status and
// the receipt. Failed and stuck ones stay visible with Retry; nothing is quietly "done".
// Used in Activity (everything), on a card (that card's), and in Her (one conversation's).

export type HandoffRow = {
  id: string; kind: string; from: string; to: string; what?: string; content_id: number | null; title?: string
  state: 'open' | 'waiting' | 'stuck' | 'done' | 'failed'; receipt?: string | null; error?: string | null
  can_retry: boolean; attempts?: number; created_at: string; updated_at: string; note?: string
  ref?: { type: string; id: string | number; label?: string } | null
}

const NAME: Record<string, string> = { mandi: 'You', her: 'Her', commander: 'Commander', cap: 'Cap', ed: 'Ed', rex: 'Rex', pod: 'Pod', biz: 'Biz', notes: 'Notes', build_log: 'Build log', posted: 'Posted' }
const TONE: Record<HandoffRow['state'], { bg: string; fg: string; label: string }> = {
  open: { bg: 'rgba(124,77,219,.12)', fg: '#7C4DDB', label: 'Working' },
  waiting: { bg: 'rgba(138,140,163,.15)', fg: '#5F6178', label: 'Waiting' },
  stuck: { bg: 'rgba(201,122,26,.15)', fg: '#A3610F', label: 'Stuck' },
  done: { bg: 'rgba(47,125,91,.12)', fg: '#2F7D5B', label: 'Done' },
  failed: { bg: 'rgba(178,58,72,.12)', fg: '#B23A48', label: 'Failed' },
}

function ago(ts: string) {
  const m = Math.round((Date.now() - Date.parse(ts)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

export function HandoffItem({ h, onChanged }: { h: HandoffRow; onChanged?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const t = TONE[h.state]
  const retry = async () => {
    setBusy(true); setErr('')
    const d = await fetch('/api/handoffs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retry', id: h.id }) }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup' }))
    setBusy(false)
    if (d.error) setErr(d.error)
    onChanged?.()
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 11px', borderRadius: 11, border: `1px solid ${h.state === 'failed' || h.state === 'stuck' ? t.fg : 'var(--border,#E7E1D6)'}`, background: 'var(--surface,#fff)', fontSize: 12.5, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, color: 'var(--text)' }}>{NAME[h.from] ?? h.from} → {NAME[h.to] ?? h.to}</span>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: t.bg, color: t.fg }}>{h.state === 'open' ? <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite', verticalAlign: -1 }} /> {t.label}</> : t.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-subtle)', marginLeft: 'auto' }}>{ago(h.updated_at)}{(h.attempts ?? 0) > 1 ? ` · try ${h.attempts}` : ''}</span>
      </div>
      <span style={{ color: 'var(--text)', overflowWrap: 'anywhere' }}>{h.what || h.kind}{h.content_id ? <span style={{ color: 'var(--text-subtle)' }}> · card #{h.content_id}{h.title ? ` “${h.title.slice(0, 40)}”` : ''}</span> : null}</span>
      {h.receipt && <span style={{ color: 'var(--text-muted,#5F6178)', overflowWrap: 'anywhere' }}>✓ {h.receipt}</span>}
      {h.state === 'failed' && h.error && <span style={{ color: '#B23A48', overflowWrap: 'anywhere' }}>⚠ {h.error}</span>}
      {h.state === 'stuck' && <span style={{ color: '#A3610F' }}>⚠ This stopped partway (no word back in over 10 minutes).</span>}
      {h.state === 'waiting' && <span style={{ color: 'var(--text-subtle)', fontSize: 11.5 }}>{NAME[h.to] ?? h.to} picks this up in planning.</span>}
      {h.can_retry && (
        <button type="button" onClick={retry} disabled={busy} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, border: 0, background: '#B23A48', color: '#fff', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {busy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={12} />} Retry
        </button>
      )}
      {err && <span style={{ color: '#B23A48', fontSize: 12 }}>{err}</span>}
    </div>
  )
}

// Loads and lists handoffs. Polls while any is working, so a run that finishes (or fails) shows up.
export default function HandoffList({ query = '', limit = 30, empty = 'No handoffs yet.', onChanged, compact }: { query?: string; limit?: number; empty?: string; onChanged?: () => void; compact?: boolean }) {
  const [rows, setRows] = useState<HandoffRow[] | null>(null)
  const [filter, setFilter] = useState<'attention' | 'all'>('all')
  const load = useCallback(async () => {
    const d = await fetch(`/api/handoffs?limit=${limit}${query ? '&' + query : ''}`).then(r => r.json()).catch(() => null)
    if (d?.handoffs) setRows(d.handoffs)
  }, [query, limit])
  useEffect(() => { load() }, [load])
  const working = rows?.some(r => r.state === 'open')
  useEffect(() => {
    if (!working) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [working, load])
  if (!rows) return <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Loading handoffs…</p>
  const attention = rows.filter(r => r.state === 'failed' || r.state === 'stuck')
  const shown = filter === 'attention' ? attention : rows
  const changed = () => { load(); onChanged?.() }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {!compact && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['all', 'attention'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)} style={{ border: '1px solid var(--border,#E7E1D6)', background: filter === f ? 'var(--text)' : 'var(--surface,#fff)', color: filter === f ? 'var(--bg,#fff)' : 'var(--text)', borderRadius: 999, padding: '4px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {f === 'all' ? `All (${rows.length})` : `Needs a look (${attention.length})`}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: 0 }}>{filter === 'attention' ? 'Nothing failed or stuck.' : empty}</p>}
      {shown.map(h => <HandoffItem key={h.id} h={h} onChanged={changed} />)}
    </div>
  )
}
