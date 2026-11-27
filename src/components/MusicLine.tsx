'use client'
// Phase 8 · A8: the song on a video card. Shown next to the hook, in Post view and on Content Day.
// "Trending" only when Cap took it from the scout with a source and date; else "suits the mood".
// Mandi can change it or clear it here; her pick is kept (set_by 'mandi') and Cap won't replace it.
import { useState } from 'react'
import { Music } from 'lucide-react'
import type { ContentPiece, MusicPick } from '@/lib/db'

const searchLink = (pick: string, artist?: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent([pick, artist].filter(Boolean).join(' '))}`

export default function MusicLine({ p, onSaved, compact }: { p: ContentPiece; onSaved?: (updated: ContentPiece) => void; compact?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  if (p.type !== 'video' && !p.music) return null
  const m = p.music

  const save = async (music: MusicPick | null) => {
    setBusy(true)
    try {
      const r = await fetch('/api/content', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: p.id, music }) })
      const d = await r.json()
      if (r.ok && !d?.error) { onSaved?.(d); window.dispatchEvent(new Event('rise-data-changed')) }
    } finally { setBusy(false); setEditing(false) }
  }
  const saveMine = () => {
    const m2 = text.trim().match(/^(.*\S)\s+(?:by|—|-)\s+(.+)$/i)   // "Song by Artist" (last "by" wins)
    const [pick, artist] = m2 ? [m2[1].trim(), m2[2].trim()] : [text.trim(), '']
    if (!pick) return
    save({ pick, artist: artist || undefined, why: 'Your pick.', link: searchLink(pick, artist), source: 'suits-the-mood', checked_at: new Date().toISOString(), set_by: 'mandi' })
  }

  const small = { fontSize: '10px', fontWeight: 800, background: 'transparent', border: 0, color: 'var(--purple)', cursor: 'pointer', padding: '2px 4px' } as const
  const tag = m?.source === 'verified-trend'
    ? `Trending · checked ${m.checked_at.slice(0, 10)}`
    : m?.set_by === 'mandi' ? 'Your pick' : 'Suits the mood'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: compact ? '6px 0' : '9px 12px', borderRadius: '10px', background: compact ? 'transparent' : 'var(--surface-raised, rgba(124,77,219,0.04))', border: compact ? 0 : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <Music size={13} style={{ color: 'var(--purple)' }} />
        {!compact && <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)' }}>Song</span>}
        {m ? (
          <>
            {m.link
              ? <a href={m.link} target="_blank" rel="noreferrer" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>{m.pick}{m.artist ? ` · ${m.artist}` : ''}</a>
              : <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>{m.pick}{m.artist ? ` · ${m.artist}` : ''}</span>}
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 8px', borderRadius: '99px', background: m.source === 'verified-trend' ? 'var(--purple-light)' : 'var(--bg)', color: m.source === 'verified-trend' ? 'var(--purple)' : 'var(--text-muted)' }}>{tag}</span>
            {m.source_url && <a href={m.source_url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>source</a>}
          </>
        ) : <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Cap picks one when he reviews this video.</span>}
        {!editing && <button style={small} disabled={busy} onClick={() => { setText(m ? [m.pick, m.artist].filter(Boolean).join(' by ') : ''); setEditing(true) }}>{m ? 'Change' : 'Pick one'}</button>}
        {!editing && m && <button style={{ ...small, color: 'var(--text-subtle)' }} disabled={busy} onClick={() => save(null)} title="Clear it; Cap picks again on his next review">Clear</button>}
      </div>
      {m?.why && !editing && <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{m.why}</p>}
      {editing && (
        <form onSubmit={e => { e.preventDefault(); saveMine() }} style={{ display: 'flex', gap: '6px' }}>
          <input autoFocus onFocus={e => e.currentTarget.select()} value={text} onChange={e => setText(e.target.value)} placeholder="Song by Artist" style={{ flex: 1, padding: '6px 9px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12px' }} />
          <button type="submit" disabled={busy || !text.trim()} style={{ ...small, padding: '6px 10px', border: '1px solid var(--purple)', borderRadius: '8px' }}>Save</button>
          <button type="button" onClick={() => setEditing(false)} style={{ ...small, color: 'var(--text-subtle)' }}>Cancel</button>
        </form>
      )}
    </div>
  )
}
