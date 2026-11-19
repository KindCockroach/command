import type { ReactNode } from 'react'

// Platform badge: a small brand-colored mark plus the platform's name.
export const PLAT: Record<string, { bg: string; fg?: string; name: string; glyph: ReactNode }> = {
  instagram: { bg: 'linear-gradient(135deg,#F58529,#DD2A7B 55%,#8134AF)', name: 'Instagram', glyph: <><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="12" cy="12" r="3.6" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="16.8" cy="7.2" r="1.2" fill="#fff" /></> },
  facebook: { bg: '#1877F2', name: 'Facebook', glyph: <path d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.3c0-.8.3-1.4 1.4-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.7v2.2H8.2V14h2.4v7z" fill="#fff" /> },
  linkedin: { bg: '#0A66C2', name: 'LinkedIn', glyph: <><rect x="5" y="9.5" width="3" height="9" fill="#fff" /><circle cx="6.5" cy="6.5" r="1.7" fill="#fff" /><path d="M10.5 9.5h2.9v1.3c.5-.9 1.6-1.5 2.9-1.5 2.4 0 2.9 1.6 2.9 3.6v5.6h-3v-5c0-1.1-.2-1.9-1.3-1.9s-1.5.8-1.5 1.9v5h-2.9z" fill="#fff" /></> },
  tiktok: { bg: '#111', name: 'TikTok', glyph: <path d="M14.5 4h2.6c.2 1.9 1.4 3.1 3.2 3.3v2.7c-1.2 0-2.3-.4-3.2-1v5.6a5 5 0 1 1-5-5h.4v2.7h-.4a2.3 2.3 0 1 0 2.4 2.3z" fill="#fff" /> },
  youtube: { bg: '#FF0000', name: 'YouTube', glyph: <path d="M10 8.5v7l6-3.5z" fill="#fff" /> },
  medium: { bg: '#000', name: 'Medium', glyph: <><circle cx="8" cy="12" r="4" fill="#fff" /><ellipse cx="15" cy="12" rx="2" ry="3.8" fill="#fff" /><ellipse cx="19" cy="12" rx="0.9" ry="3.4" fill="#fff" /></> },
  substack: { bg: '#FF6719', name: 'Substack', glyph: <><rect x="6" y="5" width="12" height="2" fill="#fff" /><rect x="6" y="8.5" width="12" height="2" fill="#fff" /><path d="M6 12h12v8l-6-3.3L6 20z" fill="#fff" /></> },
}
export const PLATFORM_CHOICES = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'Pinterest', 'Medium', 'Substack']
export function platKey(platform?: string, handle?: string) {
  const s = `${platform || ''} ${handle || ''}`.toLowerCase()
  return Object.keys(PLAT).find(k => s.includes(k)) || ''
}
export function PlatformBadge({ platform, handle }: { platform?: string; handle?: string }) {
  const k = platKey(platform, handle); const p = PLAT[k]
  if (!p) return <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-subtle)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{platform || 'Platform?'}</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
      <span aria-hidden style={{ width: 20, height: 20, borderRadius: 6, background: p.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <svg viewBox="0 0 24 24" width="15" height="15">{p.glyph}</svg>
      </span>
      {p.name}
    </span>
  )
}
