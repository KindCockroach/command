'use client'
import { useState, useEffect } from 'react'
import AccountsPanel from './AccountsPanel'
import ProjectsPanel from './ProjectsPanel'
import VisionPanel from './VisionPanel'
import TasksPanel from './TasksPanel'
import NotesPanel from './NotesPanel'
import WorkflowsPanel from './WorkflowsPanel'
import AssistantsPanel from './AssistantsPanel'
import MediaLibrary from './MediaLibrary'
import UniversalCapture from './UniversalCapture'
import ResearchPanel from './ResearchPanel'
import HomeScreen from './HomeScreen'
import LinesPanel from './LinesPanel'
import ContentDay from './ContentDay'
import ActivityStation from './ActivityStation'
import InstantCompose from './InstantCompose'
import StationChat from './StationChat'
import PodcastEngine from './PodcastEngine'
import PodcastStudio from './PodcastStudio'
import PeoplePanel from './PeoplePanel'
import CampaignsPanel from './CampaignsPanel'
import PitchStudio from './PitchStudio'
import StoryProcessor from './StoryProcessor'
import StoryStudio from './StoryStudio'
import AuditPanel from './AuditPanel'
import AudiencePanel from './AudiencePanel'
import GoalsPanel from './GoalsPanel'
import SitesPanel from './SitesPanel'
import { Archive, Users, Zap, Brain, Star, CheckSquare, BookOpen, Workflow, Bot, FolderKanban, Sun, Moon, Mic, Globe, PenLine, Radar, Target, Megaphone } from 'lucide-react'
import Link from 'next/link'

interface Stats { ideas: number; inProgress: number; ready: number; totalActive: number }
// Props are still passed by the page; the old Kanban pipeline view that used them is gone.
interface Props { initialContent: unknown[]; stats: Stats }
type View = 'lines' | 'command' | 'activity' | 'contentday' | 'projects' | 'tasks' | 'assistants' | 'workflows' | 'vision' | 'notes' | 'accounts' | 'sites' | 'audience' | 'media' | 'podcast' | 'people' | 'campaigns' | 'story' | 'pitch' | 'audit' | 'goals' | 'research'

// Renders children on first activation and KEEPS them mounted after — hidden with
// display:none when inactive — so long-running work (podcast generation) and state
// survive tab switches instead of being torn down.
function KeepAlive({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [everActive, setEverActive] = useState(active)
  useEffect(() => { if (active && !everActive) setEverActive(true) }, [active, everActive])
  if (!everActive) return null
  return <div style={{ display: active ? 'block' : 'none' }}>{children}</div>
}

export default function Dashboard(_props: Props) {
  const [view, setView] = useState<View>('lines')
  const [dark, setDark] = useState(false)
  const [navOrder, setNavOrder] = useState<View[]>([])
  const [dragId, setDragId] = useState<View | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('cc-theme')
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme', 'dark') }
    // Cross-tab navigation (e.g. briefing "Publish now" → Accounts approval queue)
    const nav = (e: Event) => {
      const view = (e as CustomEvent).detail?.view
      // 'pipeline' was the old Kanban view — it now lives in Daily Command
      if (view) setView((view === 'pipeline' ? 'command' : view) as View)
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

  const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode; accent?: boolean }[] = [
    { id: 'lines',      label: 'Quick Post',    icon: <PenLine size={12} />, accent: true },
    { id: 'command',    label: 'Daily Command', icon: <Zap size={12} />, accent: true },
    { id: 'activity',   label: 'Activity',      icon: <Radar size={12} /> },
    { id: 'contentday', label: 'Content Day',   icon: <Mic size={12} /> },
    { id: 'goals',      label: 'Goals',         icon: <Target size={12} /> },
    { id: 'projects',   label: 'Projects',      icon: <FolderKanban size={12} /> },
    { id: 'tasks',      label: 'Tasks',         icon: <CheckSquare size={12} /> },
    { id: 'assistants', label: 'Assistants',    icon: <Bot size={12} /> },
    { id: 'workflows',  label: 'Workflows',     icon: <Workflow size={12} /> },
    { id: 'vision',     label: 'Vision',        icon: <Star size={12} /> },
    { id: 'notes',      label: 'Notes',         icon: <BookOpen size={12} /> },
    { id: 'accounts',   label: 'Accounts',      icon: <Users size={12} /> },
    { id: 'sites',      label: 'Sites',         icon: <Globe size={12} /> },
    { id: 'audience',   label: 'Audience',      icon: <span style={{fontSize:'12px'}}>👤</span> },
    { id: 'audit',      label: 'Trends',        icon: <Radar size={12} /> },
    { id: 'research',   label: 'Research',      icon: <span style={{fontSize:'12px'}}>🔬</span> },
    { id: 'media',      label: 'Media',         icon: <span style={{fontSize:'12px'}}>🎬</span> },
    { id: 'podcast',    label: 'Podcast',       icon: <Mic size={12} /> },
    { id: 'people',     label: 'People',        icon: <Users size={12} /> },
    { id: 'campaigns',  label: 'Campaigns',     icon: <Megaphone size={12} /> },
    { id: 'story',      label: 'Story',         icon: <PenLine size={12} /> },
    { id: 'pitch',      label: 'Travel Pitch',  icon: <Globe size={12} /> },
  ]

  // Draggable, per-device tab order (falls back to the default order until loaded).
  const NAV_IDS = NAV_ITEMS.map(i => i.id)
  const navById: Record<string, typeof NAV_ITEMS[number]> = {}
  for (const it of NAV_ITEMS) navById[it.id] = it
  const order: View[] = navOrder.length ? navOrder : NAV_IDS

  // "Send to Instant Compose" from Media → jump to the Story tab (where it lives)
  useEffect(() => {
    const go = () => setView('story')
    window.addEventListener('rise-goto-compose', go)
    return () => window.removeEventListener('rise-goto-compose', go)
  }, [])

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
            <img src="/balloon-512.png" alt="RISE AI" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '19px', fontWeight: 700, color: '#fff', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>RISE AI</span>
          </div>

          {/* Nav — scrollable on small windows */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px', overflowX: 'auto', flex: 1, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="hide-scrollbar">
            <Link href="/brief" title="Your calm morning Brief"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, padding: '6px 11px', borderRadius: '8px', border: '1px solid rgba(107,45,110,0.6)', color: 'rgba(180,130,183,1)', textDecoration: 'none', flexShrink: 0 }}>
              ☀️ Brief
            </Link>
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
        <KeepAlive active={view === 'lines'}><LinesPanel /></KeepAlive>
        <KeepAlive active={view === 'command'}><HomeScreen /></KeepAlive>
        <KeepAlive active={view === 'activity'}><ActivityStation /></KeepAlive>
        <KeepAlive active={view === 'contentday'}><ContentDay /></KeepAlive>

        {view === 'projects'   && <ProjectsPanel />}
        {view === 'tasks'      && <TasksPanel />}
        {view === 'assistants' && <AssistantsPanel />}
        {view === 'workflows'  && <WorkflowsPanel />}
        {view === 'vision'     && <VisionPanel />}
        {view === 'notes'      && <NotesPanel />}
        {view === 'accounts'   && <AccountsPanel />}
        {view === 'sites'      && <SitesPanel />}
        {view === 'audience'   && <AudiencePanel />}
        {view === 'audit'      && <AuditPanel />}
        <KeepAlive active={view === 'research'}><ResearchPanel /></KeepAlive>
        {view === 'goals'      && <GoalsPanel />}
        {/* Podcast stays mounted once opened, so a running generation survives
            clicking to another tab and finishes into the still-live component. */}
        <KeepAlive active={view === 'podcast'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <PodcastStudio />
            <PodcastEngine />
          </div>
        </KeepAlive>
        {view === 'people'     && <PeoplePanel />}
        {view === 'campaigns'  && <CampaignsPanel />}
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
