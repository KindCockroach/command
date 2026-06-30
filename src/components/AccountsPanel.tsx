'use client'
import { useState } from 'react'
import { ExternalLink, CheckCircle2, AlertCircle, Clock, Lock } from 'lucide-react'

type AccountStatus = 'active' | 'restricted' | 'planned' | 'paused'

type Account = {
  id: string
  platform: string
  handle: string
  brand: string
  purpose: string
  status: AccountStatus
  priority: 'high' | 'medium' | 'low'
  url?: string
  notes?: string
  color: string
  emoji: string
}

const ACCOUNTS: Account[] = [
  { id: 'yt-aimom', platform: 'YouTube', handle: 'AI Mom 888', brand: 'AI Mom', purpose: 'Podcast clips, vlogs, live builds, screen shares', status: 'active', priority: 'high', color: '#FF0000', emoji: '▶️', notes: 'Informal, human, go live here' },
  { id: 'beehiiv-podcast', platform: 'Beehiiv', handle: 'AI Mom Podcast', brand: 'AI Mom Podcast', purpose: 'Podcast episodes, newsletter, show notes', status: 'active', priority: 'high', color: '#FF6B35', emoji: '🎙', notes: 'No sales asks. Pure give.' },
  { id: 'ig-aimomatwork', platform: 'Instagram', handle: '@aimomatwork', brand: 'AI Mom at Work', purpose: 'Sales funnel for Room30.ai', status: 'restricted', priority: 'high', color: '#E1306C', emoji: '📱', notes: 'Too salesy — building value ratio back up. New avatar coming.' },
  { id: 'ig-aimom', platform: 'Instagram', handle: '@aimom (TBD)', brand: 'AI Mom', purpose: 'Wizard of Oz visual storyboard, podcast clips', status: 'planned', priority: 'high', color: '#833AB4', emoji: '🎠', notes: 'Not started. Separate from At Work.' },
  { id: 'ig-storyboard', platform: 'Instagram', handle: 'Mom Storyboard (TBD)', brand: 'Mom Storyboard', purpose: 'AI visual storytelling only', status: 'planned', priority: 'medium', color: '#D98AB7', emoji: '🖼', notes: 'Faceless AI image content' },
  { id: 'ig-avatar2', platform: 'Instagram', handle: 'New Avatar (TBD)', brand: 'Room30.ai', purpose: 'Room30 sales — replaces restricted account', status: 'planned', priority: 'high', color: '#F2A65A', emoji: '🤖', notes: 'Pregnant Professional Mandy replacement' },
  { id: 'ig-personal', platform: 'Instagram', handle: '@mandibeck (private)', brand: 'Personal', purpose: 'Community of a decade. Ideas, engagement, real people.', status: 'paused', priority: 'medium', color: '#9B8FA6', emoji: '🔒', notes: 'Private. Source of insight, not publishing.' },
  { id: 'li-mandi', platform: 'LinkedIn', handle: 'Mandy Beck', brand: 'Mandy Beck', purpose: 'Professional AI/life presence', status: 'active', priority: 'medium', color: '#0A66C2', emoji: '💼', notes: 'How we use AI, how it changes our life' },
  { id: 'tiktok-aimom', platform: 'TikTok', handle: 'AI Mom at Work', brand: 'AI Mom at Work', purpose: 'Sales funnel, short-form content', status: 'active', priority: 'medium', color: '#171C3A', emoji: '🎵', notes: 'More intentional posting needed' },
]

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:     { label: 'Active',      color: '#3DAA7C', bg: '#E8F7F1',   icon: <CheckCircle2 size={11} /> },
  restricted: { label: 'Restricted',  color: '#E05252', bg: '#FEF2F2',   icon: <AlertCircle size={11} /> },
  planned:    { label: 'Planned',     color: '#F2A65A', bg: '#FEF5EA',   icon: <Clock size={11} /> },
  paused:     { label: 'Paused',      color: '#9B8FA6', bg: '#F5F3F7',   icon: <Lock size={11} /> },
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function AccountsPanel() {
  const [filter, setFilter] = useState<AccountStatus | 'all'>('all')

  const sorted = [...ACCOUNTS]
    .filter(a => filter === 'all' || a.status === filter)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const counts = {
    all: ACCOUNTS.length,
    active: ACCOUNTS.filter(a => a.status === 'active').length,
    restricted: ACCOUNTS.filter(a => a.status === 'restricted').length,
    planned: ACCOUNTS.filter(a => a.status === 'planned').length,
    paused: ACCOUNTS.filter(a => a.status === 'paused').length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--cosmic-midnight)' }}>Accounts</h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          All platforms, one view. No passwords stored here.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'active', 'restricted', 'planned', 'paused'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-[11px] px-3 py-1.5 rounded-full font-medium capitalize transition-all"
            style={filter === f
              ? { background: 'var(--cosmic-midnight)', color: 'var(--soft-light)' }
              : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
            }
          >
            {f === 'all' ? 'All' : f} · {counts[f]}
          </button>
        ))}
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map(acct => {
          const s = STATUS_CONFIG[acct.status]
          return (
            <div key={acct.id} className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: acct.color + '18' }}>
                    {acct.emoji}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--cosmic-midnight)' }}>{acct.handle}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{acct.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
                  {s.icon} {s.label}
                </div>
              </div>

              {/* Brand badge */}
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide" style={{ background: 'var(--nebula-light)', color: 'var(--electric-nebula)' }}>
                  {acct.brand}
                </span>
              </div>

              {/* Purpose */}
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {acct.purpose}
              </p>

              {/* Notes */}
              {acct.notes && (
                <p className="text-[10px] px-2.5 py-1.5 rounded-lg italic" style={{ background: 'var(--ember-light)', color: 'var(--solar-ember)' }}>
                  {acct.notes}
                </p>
              )}

              {/* Priority */}
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: acct.priority === 'high' ? 'var(--aurora-pink)' : 'var(--text-subtle)' }}>
                  {acct.priority} priority
                </span>
                {acct.url && (
                  <a href={acct.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--electric-nebula)' }}>
                    <ExternalLink size={10} /> Open
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Security reminder */}
      <div className="rounded-xl border p-4 flex items-start gap-3" style={{ background: 'var(--nebula-light)', borderColor: 'var(--electric-nebula)' }}>
        <Lock size={15} style={{ color: 'var(--electric-nebula)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--electric-nebula)' }}>Security reminder</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Passwords are never stored here. Use a password manager (1Password or Bitwarden recommended) and enable 2FA on every account. This panel tracks connection status only.
          </p>
        </div>
      </div>
    </div>
  )
}
