'use client'
import { useState } from 'react'
import { ContentPiece } from '@/lib/db'
import KanbanBoard from './board/KanbanBoard'
import IntakeBar from './board/IntakeBar'
import AccountsPanel from './AccountsPanel'
import DailyBriefingPanel from './DailyBriefing'
import PipelineEngine from './PipelineEngine'
import { Lightbulb, Loader2, CheckCircle2, Archive, LayoutGrid, Users, Zap, Brain } from 'lucide-react'
import Link from 'next/link'

interface Stats { ideas: number; inProgress: number; ready: number; totalActive: number }
interface Props { initialContent: ContentPiece[]; stats: Stats }
type View = 'board' | 'accounts'

export default function Dashboard({ initialContent, stats: initialStats }: Props) {
  const [content, setContent] = useState(initialContent)
  const [stats, setStats] = useState(initialStats)
  const [view, setView] = useState<View>('board')

  const recalc = (c: ContentPiece[]) => ({
    ideas: c.filter(x => x.status === 'idea').length,
    inProgress: c.filter(x => x.status === 'in_progress').length,
    ready: c.filter(x => x.status === 'ready').length,
    totalActive: c.length,
  })

  const handleIntake = (p: ContentPiece) => {
    const next = [p, ...content]
    setContent(next); setStats(recalc(next))
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── NAV ── dark navy with hot-pink accents, exactly like the workshop bottom banner */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>🎈</span>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>AI Mom</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hot-pink)', marginLeft: '8px' }}>Command Center</span>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {([
              { id: 'board' as View,    label: 'Pipeline',  icon: <LayoutGrid size={12} /> },
              { id: 'accounts' as View, label: 'Accounts',  icon: <Users size={12} /> },
            ]).map(item => (
              <button key={item.id} onClick={() => setView(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: view === item.id ? 'var(--hot-pink)' : 'transparent',
                  color: view === item.id ? '#fff' : 'rgba(255,255,255,0.5)',
                }}>
                {item.icon} {item.label}
              </button>
            ))}
            <Link href="/archive"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}>
              <Archive size={12} /> Archive
            </Link>
            <Link href="/brain"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
              <Brain size={12} /> Brain
            </Link>
            <Link href="/repurpose"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--hot-pink)', color: 'var(--hot-pink)', textDecoration: 'none' }}>
              <Zap size={12} /> 1→30 Studio
            </Link>
            <Link href="/studio"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
              Studio
            </Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {view === 'board' && (
          <>
            {/* Date + badges */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--hot-pink)', marginBottom: '2px' }}>{today}</p>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
                  Morning, Mandi. <span style={{ fontWeight: 400 }}>What are we building?</span>
                </h1>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', background: 'var(--hot-pink-light)', color: 'var(--hot-pink)' }}>
                  🎙 3 podcasts queued
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', background: 'var(--ready-bg)', color: 'var(--ready-color)' }}>
                  ✨ {stats.ready} ready to publish
                </span>
              </div>
            </div>

            {/* Stat cards — sticky note aesthetic */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { key: 'ideas' as const,      label: 'Ideas',            sub: 'Seeds',          color: 'var(--idea-color)',     bg: 'var(--idea-bg)',     icon: <Lightbulb size={16} />, tape: 'var(--sticky-yellow)' },
                { key: 'inProgress' as const, label: 'In Progress',      sub: 'Being built',    color: 'var(--progress-color)', bg: 'var(--progress-bg)', icon: <Loader2 size={16} />,   tape: 'var(--sticky-pink)' },
                { key: 'ready' as const,       label: 'Ready to Publish', sub: 'Needs your ✓',  color: 'var(--ready-color)',    bg: 'var(--ready-bg)',    icon: <CheckCircle2 size={16} />, tape: 'var(--sticky-blue)' },
              ].map(s => (
                <div key={s.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'var(--shadow-sm)', borderTop: `4px solid ${s.color}` }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg, color: s.color, flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '26px', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{stats[s.key]}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Briefing */}
            <DailyBriefingPanel content={content} />

            {/* Pipeline Engine */}
            <PipelineEngine />

            {/* Intake */}
            <IntakeBar onIntake={handleIntake} />

            {/* Pipeline label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <div style={{ height: '2px', width: '24px', background: 'var(--hot-pink)', borderRadius: '1px' }} />
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>Content Pipeline</span>
            </div>

            <KanbanBoard initialContent={content} />
          </>
        )}

        {view === 'accounts' && <AccountsPanel />}
      </main>

      {/* Footer — navy banner like the workshop promo */}
      <footer style={{ background: 'var(--navy)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          Command Center 5.0 · <span style={{ color: 'var(--hot-pink)', fontWeight: 700 }}>she said she would and so she did</span> · aiworksforyou.com
        </p>
      </footer>
    </div>
  )
}
