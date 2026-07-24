'use client'
import { useState, useEffect } from 'react'
import { ContentPiece } from '@/lib/db'
import AccountsPanel from './AccountsPanel'
import DailyBriefingPanel from './DailyBriefing'
import ProjectsPanel from './ProjectsPanel'
import VisionPanel from './VisionPanel'
import TasksPanel from './TasksPanel'
import NotesPanel from './NotesPanel'
import WorkflowsPanel from './WorkflowsPanel'
import AssistantsPanel from './AssistantsPanel'
import AvatarsPanel from './AvatarsPanel'
import MediaLibrary from './MediaLibrary'
import UniversalCapture from './UniversalCapture'
import ResearchPanel from './ResearchPanel'
import HomeScreen from './HomeScreen'
import InstantCompose from './InstantCompose'
import StationChat from './StationChat'
import PodcastEngine from './PodcastEngine'
import PitchStudio from './PitchStudio'
import StoryProcessor from './StoryProcessor'
import StoryStudio from './StoryStudio'
import AuditPanel from './AuditPanel'
import AudiencePanel from './AudiencePanel'
import GoalsPanel from './GoalsPanel'
import ContentScroller from './ContentScroller'
import { Lightbulb, Loader2, CheckCircle2, Archive, LayoutGrid, Users, Zap, Brain, Star, CheckSquare, BookOpen, Workflow, Bot, FolderKanban, Sun, Moon, Mic, Globe, PenLine, Radar, Target } from 'lucide-react'
import Link from 'next/link'

interface Stats { ideas: number; inProgress: number; ready: number; totalActive: number }
interface Props { initialContent: ContentPiece[]; stats: Stats }
type View = 'command' | 'pipeline' | 'projects' | 'tasks' | 'assistants' | 'workflows' | 'vision' | 'notes' | 'accounts' | 'audience' | 'avatars' | 'media' | 'podcast' | 'story' | 'pitch' | 'audit' | 'goals' | 'research'

// Renders children on first activation and KEEPS them mounted after — hidden with
// display:none when inactive — so long-running work (podcast generation) and state
// survive tab switches instead of being torn down.
function KeepAlive({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [everActive, setEverActive] = useState(active)
  useEffect(() => { if (active && !everActive) setEverActive(true) }, [active, everActive])
  if (!everActive) return null
  return <div style={{ display: active ? 'block' : 'none' }}>{children}</div>
}

export default function Dashboard({ initialContent, stats: initialStats }: Props) {
  const [content, setContent] = useState(initialContent)
  const [stats, setStats] = useState(initialStats)
  const [view, setView] = useState<View>('command')
  const [dark, setDark] = useState(false)
  const [scroller, setScroller] = useState<{ status: string; label: string } | null>(null)
  const [navOrder, setNavOrder] = useState<View[]>([])
  const [dragId, setDragId] = useState<View | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('cc-theme')
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme', 'dark') }
    // Cross-tab navigation (e.g. briefing "Publish now" → Accounts approval queue)
    const nav = (e: Event) => {
      const view = (e as CustomEvent).detail?.view
      if (view) setView(view as View)
    }
    window.addEventListener('station:navigate', nav)
    return () => window.removeEventListener('station:navigate', nav)
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

  const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode; accent?: boolean }[] = [
    { id: 'command',    label: 'Daily Command', icon: <Zap size={12} />, accent: true },
    { id: 'goals',      label: 'Goals',         icon: <Target size={12} /> },
    { id: 'pipeline',   label: 'Content',       icon: <LayoutGrid size={12} /> },
    { id: 'projects',   label: 'Projects',      icon: <FolderKanban size={12} /> },
    { id: 'tasks',      label: 'Tasks',         icon: <CheckSquare size={12} /> },
    { id: 'assistants', label: 'Assistants',    icon: <Bot size={12} /> },
    { id: 'workflows',  label: 'Workflows',     icon: <Workflow size={12} /> },
    { id: 'vision',     label: 'Vision',        icon: <Star size={12} /> },
    { id: 'notes',      label: 'Notes',         icon: <BookOpen size={12} /> },
    { id: 'accounts',   label: 'Accounts',      icon: <Users size={12} /> },
    { id: 'audience',   label: 'Audience',      icon: <span style={{fontSize:'12px'}}>👤</span> },
    { id: 'audit',      label: 'Trends',        icon: <Radar size={12} /> },
    { id: 'research',   label: 'Research',      icon: <span style={{fontSize:'12px'}}>🔬</span> },
    { id: 'avatars',    label: 'Avatars',       icon: <span style={{fontSize:'12px'}}>🎭</span> },
    { id: 'media',      label: 'Media',         icon: <span style={{fontSize:'12px'}}>🎬</span> },
    { id: 'podcast',    label: 'Podcast',       icon: <Mic size={12} /> },
    { id: 'story',      label: 'Story',         icon: <PenLine size={12} /> },
    { id: 'pitch',      label: 'Travel Pitch',  icon: <Globe size={12} /> },
  ]

  // Draggable, per-device tab order (falls back to the default order until loaded).
  const NAV_IDS = NAV_ITEMS.map(i => i.id)
  const navById: Record<string, typeof NAV_ITEMS[number]> = {}
  for (const it of NAV_ITEMS) navById[it.id] = it
  const order: View[] = navOrder.length ? navOrder : NAV_IDS

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rise-nav-order-v1')
      if (saved) {
        const parsed = JSON.parse(saved) as View[]
        const known = parsed.filter(id => NAV_IDS.includes(id))
        // append any tabs added since she last saved, drop any that no longer exist
        setNavOrder([...known, ...NAV_IDS.filter(id => !known.includes(id))])
        return
      }
    } catch { /* fall back to default order */ }
    setNavOrder(NAV_IDS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (navOrder.length) { try { localStorage.setItem('rise-nav-order-v1', JSON.stringify(navOrder)) } catch { /* non-fatal */ } }
  }, [navOrder])

  const reorderNav = (fromId: View, toId: View) => setNavOrder(cur => {
    const base = cur.length ? cur : NAV_IDS
    const from = base.indexOf(fromId), to = base.indexOf(toId)
    if (from < 0 || to < 0 || from === to) return base
    const next = [...base]; next.splice(from, 1); next.splice(to, 0, fromId)
    return next
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>

          {/* Brand — fixed left, never scrolls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <img src="/logo.png" alt="RISE AI" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '19px', fontWeight: 700, color: '#fff', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>RISE AI</span>
          </div>

          {/* Nav — scrollable on small windows */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px', overflowX: 'auto', flex: 1, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="hide-scrollbar">
            {order.map(id => {
              const item = navById[id]
              if (!item) return null
              return (
              <button key={item.id} onClick={() => setView(item.id)}
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragOver={e => { e.preventDefault(); if (dragId && dragId !== item.id) reorderNav(dragId, item.id) }}
                onDragEnd={() => setDragId(null)}
                title="Click to open · drag to reorder"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, padding: '6px 11px', borderRadius: '8px', border: item.accent && view !== item.id ? '1px solid rgba(107,45,110,0.6)' : 'none', cursor: dragId === item.id ? 'grabbing' : 'pointer', transition: 'all 0.15s', flexShrink: 0, opacity: dragId === item.id ? 0.4 : 1,
                  background: view === item.id ? 'var(--purple)' : 'transparent',
                  color: view === item.id ? '#fff' : item.accent ? 'rgba(180,130,183,1)' : 'rgba(255,255,255,0.55)',
                }}>
                {item.icon} {item.label}
              </button>
              )
            })}
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 4px', flexShrink: 0 }} />
            <Link href="/archive" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, padding: '6px 11px', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', flexShrink: 0 }}>
              <Archive size={13} /> Archive
            </Link>
            <Link href="/brain" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, padding: '6px 11px', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', flexShrink: 0 }}>
              <Brain size={13} /> Brain
            </Link>
            <Link href="/repurpose" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, padding: '6px 11px', borderRadius: '8px', border: '1px solid rgba(107,45,110,0.5)', color: 'rgba(180,130,183,0.9)', textDecoration: 'none', flexShrink: 0 }}>
              <Zap size={13} /> 1→30
            </Link>
          </nav>

          {/* Theme toggle — fixed right, never scrolls */}
          <button onClick={toggleTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Home stays alive so the Commander chat + Daily Command survive navigation */}
        <KeepAlive active={view === 'command'}><HomeScreen /></KeepAlive>

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
                <button key={s.key}
                  onClick={() => setScroller({ status: s.key === 'ideas' ? 'idea' : s.key === 'inProgress' ? 'in_progress' : 'ready', label: s.label })}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: `4px solid ${s.color}`, cursor: 'pointer', textAlign: 'left', transition: 'transform 0.12s, box-shadow 0.12s', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg, color: s.color, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize: '26px', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{stats[s.key]}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub} · click to review →</p>
                  </div>
                </button>
              ))}
            </div>
            {scroller && <ContentScroller status={scroller.status} label={scroller.label} onClose={() => setScroller(null)} />}
            <DailyBriefingPanel content={content} onReview={() => setScroller({ status: 'ready', label: 'Ready to Publish' })} />
          </>
        )}

        {view === 'projects'   && <ProjectsPanel />}
        {view === 'tasks'      && <TasksPanel />}
        {view === 'assistants' && <AssistantsPanel />}
        {view === 'workflows'  && <WorkflowsPanel />}
        {view === 'vision'     && <VisionPanel />}
        {view === 'notes'      && <NotesPanel />}
        {view === 'accounts'   && <AccountsPanel />}
        {view === 'audience'   && <AudiencePanel />}
        {view === 'audit'      && <AuditPanel />}
        <KeepAlive active={view === 'research'}><ResearchPanel /></KeepAlive>
        {view === 'goals'      && <GoalsPanel />}
        {view === 'avatars'    && <AvatarsPanel />}
        {/* Podcast stays mounted once opened, so a running generation survives
            clicking to another tab and finishes into the still-live component. */}
        <KeepAlive active={view === 'podcast'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PodcastEngine />
          </div>
        </KeepAlive>
        {view === 'story'      && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <StoryStudio />
            <InstantCompose />
            <StoryProcessor />
          </div>
        )}
        {view === 'pitch'      && <PitchStudio />}
        {/* Media stays alive so a Universal Capture 'You do it' build survives navigation */}
        <KeepAlive active={view === 'media'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <UniversalCapture />
            <MediaLibrary />
          </div>
        </KeepAlive>
      </main>

      <footer style={{ background: 'var(--navy)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          RISE Station · <span style={{ color: 'rgba(201,149,106,0.8)', fontWeight: 700 }}>she said she would and so she did</span>
        </p>
      </footer>
      <StationChat />
    </div>
  )
}
