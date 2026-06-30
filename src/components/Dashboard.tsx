'use client'
import { useState, useEffect } from 'react'
import { ContentPiece } from '@/lib/db'
import KanbanBoard from './board/KanbanBoard'
import IntakeBar from './board/IntakeBar'
import AccountsPanel from './AccountsPanel'
import DailyBriefingPanel from './DailyBriefing'
import PipelineEngine from './PipelineEngine'
import DailyCommand from './DailyCommand'
import ProjectsPanel from './ProjectsPanel'
import VisionPanel from './VisionPanel'
import TasksPanel from './TasksPanel'
import NotesPanel from './NotesPanel'
import WorkflowsPanel from './WorkflowsPanel'
import AssistantsPanel from './AssistantsPanel'
import { Lightbulb, Loader2, CheckCircle2, Archive, LayoutGrid, Users, Zap, Brain, Star, CheckSquare, BookOpen, Workflow, Bot, FolderKanban, Sun, Moon } from 'lucide-react'
import Link from 'next/link'

interface Stats { ideas: number; inProgress: number; ready: number; totalActive: number }
interface Props { initialContent: ContentPiece[]; stats: Stats }
type View = 'command' | 'pipeline' | 'projects' | 'tasks' | 'assistants' | 'workflows' | 'vision' | 'notes' | 'accounts'

export default function Dashboard({ initialContent, stats: initialStats }: Props) {
  const [content, setContent] = useState(initialContent)
  const [stats, setStats] = useState(initialStats)
  const [view, setView] = useState<View>('command')
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('cc-theme')
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme', 'dark') }
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    if (next) { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('cc-theme', 'dark') }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('cc-theme', 'light') }
  }

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

  const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode; accent?: boolean }[] = [
    { id: 'command',    label: 'Daily Command', icon: <Zap size={12} />, accent: true },
    { id: 'pipeline',   label: 'Content',       icon: <LayoutGrid size={12} /> },
    { id: 'projects',   label: 'Projects',      icon: <FolderKanban size={12} /> },
    { id: 'tasks',      label: 'Tasks',         icon: <CheckSquare size={12} /> },
    { id: 'assistants', label: 'Assistants',    icon: <Bot size={12} /> },
    { id: 'workflows',  label: 'Workflows',     icon: <Workflow size={12} /> },
    { id: 'vision',     label: 'Vision',        icon: <Star size={12} /> },
    { id: 'notes',      label: 'Notes',         icon: <BookOpen size={12} /> },
    { id: 'accounts',   label: 'Accounts',      icon: <Users size={12} /> },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>🎈</span>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>AI Mom</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hot-pink)', marginLeft: '8px' }}>Command Center</span>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setView(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', border: item.accent && view !== item.id ? '1px solid var(--hot-pink)' : 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: view === item.id ? 'var(--hot-pink)' : 'transparent',
                  color: view === item.id ? '#fff' : item.accent ? 'var(--hot-pink)' : 'rgba(255,255,255,0.5)',
                }}>
                {item.icon} {item.label}
              </button>
            ))}
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />
            <Link href="/archive" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
              <Archive size={12} /> Archive
            </Link>
            <Link href="/brain" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
              <Brain size={12} /> Brain
            </Link>
            <Link href="/repurpose" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(232,68,138,0.4)', color: 'rgba(232,68,138,0.7)', textDecoration: 'none' }}>
              <Zap size={12} /> 1→30
            </Link>
            <button onClick={toggleTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s', marginLeft: '4px' }}>
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {view === 'command' && <DailyCommand />}

        {view === 'pipeline' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Content Pipeline</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', background: 'var(--hot-pink-light)', color: 'var(--hot-pink)' }}>🎙 3 podcasts queued</span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', background: 'var(--ready-bg)', color: 'var(--ready-color)' }}>✨ {stats.ready} ready to publish</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { key: 'ideas' as const,      label: 'Ideas',            sub: 'Seeds',          color: 'var(--idea-color)',     bg: 'var(--idea-bg)',     icon: <Lightbulb size={16} /> },
                { key: 'inProgress' as const, label: 'In Progress',      sub: 'Being built',    color: 'var(--progress-color)', bg: 'var(--progress-bg)', icon: <Loader2 size={16} /> },
                { key: 'ready' as const,       label: 'Ready to Publish', sub: 'Needs your ✓',  color: 'var(--ready-color)',    bg: 'var(--ready-bg)',    icon: <CheckCircle2 size={16} /> },
              ].map(s => (
                <div key={s.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: `4px solid ${s.color}` }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg, color: s.color, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize: '26px', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{stats[s.key]}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <DailyBriefingPanel content={content} />
            <PipelineEngine />
            <IntakeBar onIntake={handleIntake} />
            <KanbanBoard initialContent={content} />
          </>
        )}

        {view === 'projects'   && <ProjectsPanel />}
        {view === 'tasks'      && <TasksPanel />}
        {view === 'assistants' && <AssistantsPanel />}
        {view === 'workflows'  && <WorkflowsPanel />}
        {view === 'vision'     && <VisionPanel />}
        {view === 'notes'      && <NotesPanel />}
        {view === 'accounts'   && <AccountsPanel />}
      </main>

      <footer style={{ background: 'var(--navy)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          Command Center 5.0 · <span style={{ color: 'var(--hot-pink)', fontWeight: 700 }}>she said she would and so she did</span>
        </p>
      </footer>
    </div>
  )
}
