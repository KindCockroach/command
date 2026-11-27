'use client'
import { useState, useEffect, useRef } from 'react'
import AccountsPanel from './AccountsPanel'
import ProjectsPanel from './ProjectsPanel'
import VisionPanel from './VisionPanel'
import TasksPanel from './TasksPanel'
import NotesPanel from './NotesPanel'
import WorkflowsPanel from './WorkflowsPanel'
import AssistantsPanel from './AssistantsPanel'
import SkillsPanel from './SkillsPanel'
import ApprovalsPanel from './ApprovalsPanel'
import LongformDesk from './LongformDesk'
import MediaLibrary from './MediaLibrary'
import UniversalCapture from './UniversalCapture'
import ResearchPanel from './ResearchPanel'
import HomeScreen from './HomeScreen'
// LinesPanel ("Quick Post") retired Nov 25: off the menu, code + data kept; the old view forwards to Home.
import ContentDay from './ContentDay'
import ActivityStation from './ActivityStation'
import QuickCaption from './QuickCaption'   // B5: replaces InstantCompose (file kept until Phase 10)
import BudgetConfirm from './BudgetConfirm'
import FloatingChat from './FloatingChat'   // StationChat (old bubble) retired Nov 25, code kept
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
import WinnersPanel from './WinnersPanel'
import PlanPanel from './PlanPanel'
import { Archive, Brain, Zap, Sun, Moon, LayoutGrid, Home as HomeIcon, CheckSquare, Clapperboard, CalendarDays, MoreHorizontal } from 'lucide-react'
import HomeChat from './HomeChat'
import AgentsRoster from './AgentsRoster'
import Banner from './glow/Banner'
import { showRecord, parseRecord } from '@/lib/openRecord'
import SubTabs from './glow/SubTabs'
import Link from 'next/link'

interface Stats { ideas: number; inProgress: number; ready: number; totalActive: number }
// Props are still passed by the page; the old Kanban pipeline view that used them is gone.
interface Props { initialContent: unknown[]; stats: Stats }

// ── Phase 7: eight tabs, each with sub-tabs (pills). Every old tab name forwards. ──────────
type TabId = 'home' | 'approve' | 'create' | 'plan' | 'campaigns' | 'library' | 'agents' | 'business'
type Sub = { id: string; label: string; old?: string; keep?: boolean; render: () => React.ReactNode }
type Tab = { id: TabId; label: string; sub: string; subs: Sub[]; links?: { href: string; label: string; icon?: React.ReactNode }[] }

const stack = (...n: React.ReactNode[]) => <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>{n}</div>

const TABS: Tab[] = [
  { id: 'home', label: 'Home', sub: 'Talk to Her, Man or Cap. Start here; RISE AI always brings you back.', subs: [
    { id: 'chat', label: 'Chat', keep: true, render: () => stack(<QuickCaption key="qc" />, <HomeChat key="chat" />) },
    { id: 'board', label: 'My board', old: 'Daily Command', keep: true, render: () => <HomeScreen /> },
  ] },
  { id: 'approve', label: 'Approve', sub: 'Everything waiting on your yes, in one list.', subs: [
    { id: 'approve', label: 'Approve', render: () => <ApprovalsPanel /> },
  ] },
  { id: 'create', label: 'Create', sub: 'Film, write and record. What you make starts here.', links: [{ href: '/repurpose', label: '1→30', icon: <Zap size={14} /> }], subs: [
    { id: 'contentday', label: 'Content Day', keep: true, render: () => <ContentDay /> },
    { id: 'story', label: 'Story', render: () => stack(<LongformDesk key="a" />, <StoryStudio key="b" />, <StoryProcessor key="d" />) },
    { id: 'podcast', label: 'Podcast', keep: true, render: () => stack(<PodcastStudio key="a" />, <PodcastEngine key="b" />) },
  ] },
  { id: 'plan', label: 'Plan', sub: 'Cap’s plans, the calendar, your goals and what’s working.', subs: [
    { id: 'plan', label: 'Calendar', old: 'Plan', render: () => <PlanPanel /> },
    { id: 'goals', label: 'Goals', render: () => <GoalsPanel /> },
    { id: 'winners', label: 'Winners', render: () => <WinnersPanel embedded /> },
    { id: 'trends', label: 'Trends', render: () => <AuditPanel /> },
  ] },
  { id: 'campaigns', label: 'Campaigns', sub: 'Your emails and the people who get them.', subs: [
    { id: 'campaigns', label: 'Campaigns', render: () => <CampaignsPanel /> },
    { id: 'people', label: 'People', render: () => <PeoplePanel /> },
  ] },
  { id: 'library', label: 'Library', sub: 'Everything you’ve saved: notes, media, research, vision.', links: [{ href: '/brain', label: 'Brain', icon: <Brain size={14} /> }, { href: '/archive', label: 'Archive', icon: <Archive size={14} /> }], subs: [
    { id: 'notes', label: 'Notes', render: () => <NotesPanel /> },
    { id: 'media', label: 'Media', keep: true, render: () => stack(<UniversalCapture key="a" />, <MediaLibrary key="b" />) },
    { id: 'research', label: 'Research', keep: true, render: () => <ResearchPanel /> },
    { id: 'vision', label: 'Vision', render: () => <VisionPanel /> },
  ] },
  { id: 'agents', label: 'Agents', sub: 'Who does what in RISE, what they did, and how RISE is running.', subs: [
    { id: 'roster', label: 'Agents', old: 'Assistants', render: () => stack(<AgentsRoster key="a" />, <SkillsPanel key="b" />) },
    { id: 'activity', label: 'Activity', keep: true, render: () => <ActivityStation /> },
    { id: 'oldchats', label: 'Old chats', render: () => <AssistantsPanel /> },
  ] },
  { id: 'business', label: 'Business', sub: 'Your accounts, sites, audience, projects and pitches.', subs: [
    { id: 'accounts', label: 'Accounts', render: () => <AccountsPanel /> },
    { id: 'sites', label: 'Sites', render: () => <SitesPanel /> },
    { id: 'audience', label: 'Audience', render: () => <AudiencePanel /> },
    { id: 'projects', label: 'Projects', old: 'Projects + Tasks', render: () => stack(<ProjectsPanel key="a" />, <TasksPanel key="b" />) },
    { id: 'pitch', label: 'Pitch', old: 'Travel Pitch', render: () => <PitchStudio /> },
  ] },
]
const TAB_IDS = TABS.map(t => t.id)

// Every old tab name → its new tab + sub-tab (links, Approve, Commander, her saved menu order).
// Lines and Workflows are retired: off the menu, code and data kept, names forward here.
const FORWARD: Record<string, [TabId, string]> = {
  lines: ['home', 'chat'], command: ['home', 'chat'], pipeline: ['home', 'board'], board: ['home', 'board'],
  approve: ['approve', 'approve'],
  contentday: ['create', 'contentday'], story: ['create', 'story'], podcast: ['create', 'podcast'],
  plan: ['plan', 'plan'], goals: ['plan', 'goals'], winners: ['plan', 'winners'], audit: ['plan', 'trends'], trends: ['plan', 'trends'],
  campaigns: ['campaigns', 'campaigns'], people: ['campaigns', 'people'],
  notes: ['library', 'notes'], media: ['library', 'media'], research: ['library', 'research'], vision: ['library', 'vision'],
  assistants: ['agents', 'roster'], workflows: ['agents', 'roster'], activity: ['agents', 'activity'], skills: ['agents', 'roster'],
  accounts: ['business', 'accounts'], sites: ['business', 'sites'], audience: ['business', 'audience'], projects: ['business', 'projects'], tasks: ['business', 'projects'], pitch: ['business', 'pitch'],
}
function resolve(view: string): [TabId, string | null] | null {
  if (!view) return null
  const [a, b] = view.split('/')
  if ((TAB_IDS as string[]).includes(a)) return [a as TabId, b ?? null]
  return FORWARD[a] ?? null
}

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
  const [tab, setTab] = useState<TabId>('home')
  const [subs, setSubs] = useState<Record<string, string>>({})
  const [dark, setDark] = useState(false)
  const [navOrder, setNavOrder] = useState<TabId[]>([])
  const [allTools, setAllTools] = useState(false)
  const [dragId, setDragId] = useState<TabId | null>(null)
  const [more, setMore] = useState(false)   // B0: the phone's More sheet
  // How many things wait on her yes (the Approve tab's badge). Checked every minute.
  const [approveCount, setApproveCount] = useState(0)
  useEffect(() => {
    const tick = () => fetch('/api/approvals').then(r => r.json()).then(d => setApproveCount(d?.total ?? 0)).catch(() => {})
    tick(); const t = setInterval(tick, 60000); return () => clearInterval(t)
  }, [])

  const subOf = (t: TabId) => { const tb = TABS.find(x => x.id === t)!; const s = subs[t]; return tb.subs.some(x => x.id === s) ? s! : tb.subs[0].id }
  // B1: one-step Back inside RISE. Every view change is pushed into the URL (?view=tab/sub), so the
  // gold arrow, the browser's Back and a refresh all land on the right view. depth = steps we can go back.
  const loc = useRef<{ tab: TabId; sub: string; record?: string | null }>({ tab: 'home', sub: 'chat', record: null })
  const subsRef = useRef<Record<string, string>>({})
  const [depth, setDepth] = useState(0)
  const depthRef = useRef(0)
  const viewUrl = (t: TabId, s: string, record?: string | null) => { const u = new URL(window.location.href); u.searchParams.set('view', `${t}/${s}`); if (record) u.searchParams.set('open', record); else u.searchParams.delete('open'); return u.pathname + u.search + u.hash }
  // B3: `record` ('note:310', 'card:25') makes an opened record its own Back step.
  const open = (t: TabId, s?: string | null, how: 'push' | 'replace' | 'none' = 'push', record: string | null = null) => {
    const tb = TABS.find(x => x.id === t)!
    const saved = subsRef.current[t]
    const target = s && tb.subs.some(x => x.id === s) ? s : (tb.subs.some(x => x.id === saved) ? saved! : tb.subs[0].id)
    const same = loc.current.tab === t && loc.current.sub === target && (loc.current.record ?? null) === record
    try {
      if (how === 'push' && !same) { depthRef.current += 1; window.history.pushState({ rise: depthRef.current }, '', viewUrl(t, target, record)) }
      else if (how === 'replace' || (how === 'push' && same)) window.history.replaceState({ rise: depthRef.current }, '', viewUrl(t, target, record))
    } catch { /* history unavailable: the view still switches */ }
    setDepth(depthRef.current)
    loc.current = { tab: t, sub: target, record }
    setTab(t)
    if (s) setSubs(cur => { const next = { ...cur, [t]: s }; subsRef.current = next; try { localStorage.setItem('rise-subtab-v1', JSON.stringify(next)) } catch { /* fine */ } return next })
    setAllTools(false); setMore(false)
    window.scrollTo({ top: 0 })
  }
  const goHome = () => open('home', 'chat')

  useEffect(() => {
    const saved = localStorage.getItem('cc-theme')
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme', 'dark') }
    try { const s = JSON.parse(localStorage.getItem('rise-subtab-v1') ?? '{}'); if (s && typeof s === 'object') { setSubs(s); subsRef.current = s } } catch { /* fresh */ }
    // Cross-tab navigation (old tab names forward to their new home)
    const nav = (e: Event) => {
      const view = String((e as CustomEvent).detail?.view ?? '')
      // The old "open the Commander / an agent" links still open that chat, as before.
      if (view === 'assistants') { try { if (localStorage.getItem('station-open-agent')) { open('agents', 'oldchats'); return } } catch { /* fine */ } }
      const r = resolve(view)
      if (!r) return
      const rec = String((e as CustomEvent).detail?.record ?? '') || null
      open(r[0], r[1], 'push', parseRecord(rec) ? rec : null)
      if (view === 'command') window.dispatchEvent(new CustomEvent('rise-home-who', { detail: { who: 'her' } }))
    }
    window.addEventListener('station:navigate', nav)
    // Deep link: /station?view=contentday (Her's Brief "Open" link) opens that view once on load.
    // B1: the view in the URL (a refresh or a shared link) opens without adding a Back step.
    try {
      const v = new URLSearchParams(window.location.search).get('view')
      const r = v ? resolve(v) : null
      const rec = new URLSearchParams(window.location.search).get('open')
      const pr = parseRecord(rec)
      if (r) setTimeout(() => { open(r[0], r[1], 'replace', pr ? rec : null); if (pr) showRecord(pr[0], pr[1]) }, 0)
      else window.history.replaceState({ rise: 0 }, '', viewUrl('home', 'chat'))
    } catch { /* fine */ }
    // Browser Back/Forward (and the gold arrow, which calls history.back()) step one view at a time.
    const onPop = (e: PopStateEvent) => {
      depthRef.current = typeof e.state?.rise === 'number' ? e.state.rise : 0
      const q = new URLSearchParams(window.location.search)
      const r = resolve(q.get('view') ?? '') ?? ['home', 'chat']
      const pr = parseRecord(q.get('open'))
      open(r[0] as TabId, r[1], 'none', pr ? q.get('open') : null)
      showRecord(pr ? pr[0] : null, pr ? pr[1] : undefined)   // B3: step into / out of the record
    }
    window.addEventListener('popstate', onPop)
    // "Send to Quick Caption" from Media → Home, where Quick Caption lives (B5)
    const compose = () => open('home', 'chat')
    window.addEventListener('rise-goto-compose', compose)
    return () => { window.removeEventListener('station:navigate', nav); window.removeEventListener('rise-goto-compose', compose); window.removeEventListener('popstate', onPop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    if (next) { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('cc-theme', 'dark') }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('cc-theme', 'light') }
  }

  // Draggable, per-device tab order. Her old order (v1, 25 tabs) carries over: each old tab
  // maps to its new group, first one wins; Home always leads the first time.
  useEffect(() => {
    try {
      const v2 = localStorage.getItem('rise-nav-order-v2')
      if (v2) {
        const known = (JSON.parse(v2) as string[]).filter((id): id is TabId => (TAB_IDS as string[]).includes(id))
        setNavOrder([...known, ...TAB_IDS.filter(id => !known.includes(id))]); return
      }
      const v1 = localStorage.getItem('rise-nav-order-v1')
      if (v1) {
        const mapped: TabId[] = ['home']
        for (const old of JSON.parse(v1) as string[]) { const r = FORWARD[old]; if (r && !mapped.includes(r[0])) mapped.push(r[0]) }
        setNavOrder([...mapped, ...TAB_IDS.filter(id => !mapped.includes(id))]); return
      }
    } catch { /* default order */ }
    setNavOrder(TAB_IDS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (navOrder.length) { try { localStorage.setItem('rise-nav-order-v2', JSON.stringify(navOrder)) } catch { /* non-fatal */ } } }, [navOrder])
  const reorderNav = (fromId: TabId, toId: TabId) => setNavOrder(cur => {
    const base = cur.length ? cur : TAB_IDS
    const from = base.indexOf(fromId), to = base.indexOf(toId)
    if (from < 0 || to < 0 || from === to) return base
    const next = [...base]; next.splice(from, 1); next.splice(to, 0, fromId)
    return next
  })
  const order: TabId[] = navOrder.length ? navOrder : TAB_IDS
  const cur = TABS.find(t => t.id === tab)!
  const curSub = subOf(tab)
  const mainRef = useRef<HTMLElement>(null)

  // A panel's own big title that repeats the banner ("Approve" under Approve, "Your Accounts"
  // under Accounts) is hidden, so each screen has one heading. Its buttons and description stay.
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const norm = (x: string) => x.toLowerCase().replace(/^your\s+/, '').replace(/[^a-z ]/g, '').trim()
    const sub = cur.subs.find(s => s.id === curSub)
    const names = new Set([cur.label, sub?.label, sub?.old].filter(Boolean).map(x => norm(x as string)))
    let raf = 0
    const mark = () => {
      raf = 0
      const heads = [...el.querySelectorAll<HTMLElement>('h1, h2')].filter(h => !h.closest('.rp-banner, [aria-label="All tools"]') && h.offsetParent !== null)
      for (const h of heads.slice(0, 2)) if (names.has(norm(h.textContent ?? ''))) h.classList.add('rp-dup-title')
    }
    mark()
    const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(mark) })
    mo.observe(el, { childList: true, subtree: true })
    return () => { mo.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [tab, curSub, cur])

  return (
    <div className="rise-app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <header className="rp-top">
        <div style={{ padding: '0 16px', height: '60px', display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          {/* RISE AI → Home, always */}
          <button type="button" className="rp-brand" onClick={goHome} title="Home: talk to Her, Man or Cap">
            <img src="/balloon-512.png" alt="" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span className="rp-wordmark">RISE AI</span>
          </button>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', flex: 1, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
            {order.map(id => {
              const t = TABS.find(x => x.id === id)
              if (!t) return null
              return (
                <button key={t.id} type="button" className={`rp-tab${tab === t.id ? ' on' : ''}`} onClick={() => open(t.id)}
                  draggable onDragStart={() => setDragId(t.id)}
                  onDragOver={e => { e.preventDefault(); if (dragId && dragId !== t.id) reorderNav(dragId, t.id) }}
                  onDragEnd={() => setDragId(null)} title="Click to open · drag to reorder" style={{ opacity: dragId === t.id ? 0.4 : 1 }}>
                  {t.label}{t.id === 'approve' && approveCount ? <span className="rp-count">{approveCount}</span> : null}
                </button>
              )
            })}
            <Link href="/brief" className="rp-tab" title="Your calm morning Brief">☀️ Brief</Link>
            <button type="button" className={`rp-tab${allTools ? ' on' : ''}`} onClick={() => setAllTools(v => !v)} title="Every tool, including where the old tabs went">
              <LayoutGrid size={14} /> All tools
            </button>
          </nav>

          {/* B0: on a phone the top bar is just logo, Approve count and theme */}
          <span style={{ flex: 1 }} className="rp-top-approve" aria-hidden />
          <button type="button" className="rp-tab rp-top-approve" onClick={() => open('approve')} title="Waiting on your yes" style={{ display: 'none' }}>
            Approve{approveCount ? <span className="rp-count">{approveCount}</span> : null}
          </button>
          <button type="button" onClick={toggleTheme} title={dark ? 'Switch to Day' : 'Switch to Night'} className="rp-tab" style={{ padding: '7px 10px' }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main ref={mainRef} style={{ flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {allTools && (
          <section className="rp-card" aria-label="All tools">
            <h2 style={{ margin: '0 0 4px', fontSize: 'var(--fs-lg)' }}>All tools</h2>
            <p style={{ margin: '0 0 14px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Every tool and where it lives now. Old names are in brackets. Lines (Quick Post) and Workflows are retired; their data is kept.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {TABS.map(t => (
                <div key={t.id}>
                  <p style={{ margin: '0 0 6px', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{t.label}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {t.subs.map(s => <button key={s.id} type="button" className="rp-pill rp-secondary" onClick={() => open(t.id, s.id)}>{s.label}{s.old ? ` (${s.old})` : ''}</button>)}
                    {(t.links ?? []).map(l => <Link key={l.href} href={l.href} className="rp-pill rp-quiet">{l.icon}{l.label}</Link>)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <Banner title={cur.label} sub={cur.sub} back={{ can: depth > 0, onBack: () => { if (depthRef.current > 0) window.history.back() } }}>
          {(cur.subs.length > 1 || cur.links) && (
            <div className="rp-subtabs">
              <SubTabs tabs={cur.subs.map(s => ({ id: s.id, label: s.label }))} active={curSub} onPick={s => open(tab, s)} />
              {(cur.links ?? []).map(l => <Link key={l.href} href={l.href} className="rp-pill rp-secondary">{l.icon}{l.label}</Link>)}
            </div>
          )}
        </Banner>

        {TABS.flatMap(t => t.subs.map(s => {
          const active = tab === t.id && curSub === s.id
          const key = `${t.id}/${s.id}`
          return s.keep ? <KeepAlive key={key} active={active}>{s.render()}</KeepAlive> : (active ? <div key={key}>{s.render()}</div> : null)
        }))}
      </main>

      <footer style={{ padding: '14px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          RISE Station · <span style={{ color: 'var(--act)', fontWeight: 600 }}>she said she would and so she did</span>
        </p>
      </footer>
      {/* B0: the phone's bottom tab bar (hidden on desktop by CSS) */}
      {more && (
        <div className="rp-more" role="menu" aria-label="More">
          {(['campaigns', 'library', 'agents', 'business'] as TabId[]).map(id => <button key={id} type="button" className="rp-pill rp-secondary" onClick={() => open(id)}>{TABS.find(t => t.id === id)!.label}</button>)}
          <Link href="/brief" className="rp-pill rp-secondary">☀️ Brief</Link>
          <button type="button" className="rp-pill rp-secondary" onClick={() => { setMore(false); setAllTools(true); window.scrollTo({ top: 0 }) }}>All tools</button>
        </div>
      )}
      <nav className="rp-bottom" aria-label="Main">
        {([['home', 'Home', <HomeIcon key="i" size={20} />], ['approve', 'Approve', <CheckSquare key="i" size={20} />], ['create', 'Create', <Clapperboard key="i" size={20} />], ['plan', 'Plan', <CalendarDays key="i" size={20} />]] as [TabId, string, React.ReactNode][]).map(([id, label, icon]) => (
          <button key={id} type="button" className={tab === id && !more ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => open(id)}>
            {icon}{label}{id === 'approve' && approveCount ? <span className="rp-count">{approveCount}</span> : null}
          </button>
        ))}
        <button type="button" className={more || ['campaigns', 'library', 'agents', 'business'].includes(tab) ? 'on' : ''} aria-expanded={more} onClick={() => setMore(v => !v)}>
          <MoreHorizontal size={20} />More
        </button>
      </nav>
      <FloatingChat hidden={tab === 'home' && curSub === 'chat'} />
      <BudgetConfirm />
    </div>
  )
}
