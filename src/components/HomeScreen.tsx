'use client'
import { useState, useEffect } from 'react'
import { Settings2, X, ChevronUp, ChevronDown, Check } from 'lucide-react'
import DailyCommand from './DailyCommand'
import CommanderChat from './CommanderChat'
import ResearchBrief from './ResearchBrief'
import GoalsPanel from './GoalsPanel'
import TasksPanel from './TasksPanel'
import NotesPanel from './NotesPanel'
import ProjectsPanel from './ProjectsPanel'
import AssistantsPanel from './AssistantsPanel'
import AuditPanel from './AuditPanel'
import UniversalCapture from './UniversalCapture'
import MediaLibrary from './MediaLibrary'
import PodcastEngine from './PodcastEngine'
import StoryStudio from './StoryStudio'

// ── The widget registry — every tab available as a homescreen widget ──────────
// DailyCommand stays the anchor widget (quick capture + brief + tasks + fire).
const WIDGETS: { id: string; label: string; emoji: string; render: () => React.ReactNode }[] = [
  { id: 'commander',  label: 'The Commander',   emoji: '⚡', render: () => <CommanderChat /> },
  { id: 'command',    label: 'Daily Command',   emoji: '⚡', render: () => <DailyCommand /> },
  { id: 'research',   label: 'Must-Reads',      emoji: '🔬', render: () => <ResearchBrief /> },
  { id: 'goals',      label: 'Goals',           emoji: '🎯', render: () => <GoalsPanel /> },
  { id: 'tasks',      label: 'Tasks',           emoji: '✅', render: () => <TasksPanel /> },
  { id: 'projects',   label: 'Projects',        emoji: '📁', render: () => <ProjectsPanel /> },
  { id: 'notes',      label: 'Notes',           emoji: '📓', render: () => <NotesPanel /> },
  { id: 'assistants', label: 'Assistants',      emoji: '🤖', render: () => <AssistantsPanel /> },
  { id: 'trends',     label: 'Trends',          emoji: '📡', render: () => <AuditPanel /> },
  { id: 'capture',    label: 'Universal Capture', emoji: '✨', render: () => <UniversalCapture /> },
  { id: 'media',      label: 'Media Library',   emoji: '🎬', render: () => <MediaLibrary /> },
  { id: 'podcast',    label: 'Podcast Engine',  emoji: '🎙️', render: () => <PodcastEngine /> },
  { id: 'story',      label: 'Story Studio',    emoji: '✍️', render: () => <StoryStudio /> },
]

const STORAGE_KEY = 'rise-home-widgets-v1'
const DEFAULT_LAYOUT = ['commander', 'command']   // the Commander chat leads the home screen

// The customizable homescreen: pick which widgets show and in what order,
// so Daily Command bends to the current focus (launch mode, research season…).
export default function HomeScreen() {
  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT)
  const [editing, setEditing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length) {
          let ids = parsed.filter((id: string) => WIDGETS.some(w => w.id === id))
          // one-time: surface the new Commander at the top of an existing homescreen
          if (!localStorage.getItem('rise-home-commander-added')) {
            if (!ids.includes('commander')) ids = ['commander', ...ids]
            localStorage.setItem('rise-home-commander-added', '1')
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
          }
          setLayout(ids)
        }
      }
    } catch { /* fall back to default */ }
    setLoaded(true)
  }, [])

  const persist = (next: string[]) => {
    setLayout(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* non-fatal */ }
  }

  const toggle = (id: string) =>
    persist(layout.includes(id) ? layout.filter(x => x !== id) : [...layout, id])

  const move = (id: string, dir: -1 | 1) => {
    const i = layout.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= layout.length) return
    const next = [...layout]
    ;[next[i], next[j]] = [next[j], next[i]]
    persist(next)
  }

  if (!loaded) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Edit-home control */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setEditing(e => !e)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: editing ? 'var(--purple)' : 'var(--surface)', color: editing ? '#fff' : 'var(--text-subtle)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
          {editing ? <><Check size={12} /> Done</> : <><Settings2 size={12} /> Edit home</>}
        </button>
      </div>

      {/* Widget picker — only in edit mode */}
      {editing && (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--purple)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Build your homescreen — toggle widgets on, reorder with the arrows</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {WIDGETS.map(w => {
              const on = layout.includes(w.id)
              return (
                <button key={w.id} onClick={() => toggle(w.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '20px', border: `1px solid ${on ? 'var(--purple)' : 'var(--border)'}`, background: on ? 'var(--purple-light)' : 'var(--surface-raised)', color: on ? 'var(--purple)' : 'var(--text-subtle)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  {w.emoji} {w.label} {on && <Check size={11} />}
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>Layout saves on this device. Every tab stays reachable from the top nav regardless of what&apos;s here.</p>
        </div>
      )}

      {/* The widgets, in her order */}
      {layout.map(id => {
        const w = WIDGETS.find(x => x.id === id)
        if (!w) return null
        return (
          <div key={id} style={{ position: 'relative' }}>
            {editing && (
              <div style={{ position: 'absolute', top: '-10px', right: '10px', zIndex: 5, display: 'flex', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '2px 6px' }}>{w.emoji} {w.label}</span>
                <button onClick={() => move(id, -1)} title="Move up" style={{ border: 'none', background: 'var(--surface-raised)', borderRadius: '5px', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 5px' }}><ChevronUp size={12} /></button>
                <button onClick={() => move(id, 1)} title="Move down" style={{ border: 'none', background: 'var(--surface-raised)', borderRadius: '5px', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 5px' }}><ChevronDown size={12} /></button>
                <button onClick={() => toggle(id)} title="Remove from home" style={{ border: 'none', background: 'var(--surface-raised)', borderRadius: '5px', cursor: 'pointer', color: '#E05252', padding: '2px 5px' }}><X size={12} /></button>
              </div>
            )}
            {w.render()}
          </div>
        )
      })}

      {layout.length === 0 && (
        <p style={{ textAlign: 'center', padding: '40px', fontSize: '13px', color: 'var(--text-subtle)' }}>Homescreen is empty — hit &quot;Edit home&quot; and pick your widgets.</p>
      )}
    </div>
  )
}
