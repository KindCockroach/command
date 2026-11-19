'use client'
import { formatBytes, type UploadProgress } from '@/lib/uploadBig'

// The one progress bar every upload in RISE shows: which file, percent, MB of MB,
// which part (for big files), and a calm line while a hiccup retries by itself.
export default function UploadBar({ name, progress, onStop, tone = '#E2508A' }: { name: string; progress: UploadProgress | null; onStop?: () => void; tone?: string }) {
  const p = progress ?? { loaded: 0, total: 0, pct: 0 }
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.pct} aria-label={`Uploading ${name}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>{p.pct}%</span>
        {onStop && <button type="button" onClick={onStop} style={{ border: 0, background: 'none', color: 'var(--text-subtle)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Stop</button>}
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--border, #E7E1D6)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p.pct}%`, background: tone, borderRadius: 99, transition: 'width .25s linear' }} />
      </div>
      <span style={{ fontSize: 11, color: p.retrying ? '#B96A1E' : 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
        {p.retrying ? p.retrying : `${formatBytes(p.loaded)} of ${formatBytes(p.total)}${p.parts && p.parts > 1 ? ` · part ${p.part} of ${p.parts}` : ''}`}
      </span>
    </div>
  )
}
