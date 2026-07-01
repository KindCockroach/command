'use client'
import { useState, useEffect } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, Edit3, CheckCheck, X } from 'lucide-react'
import type { Project, ProjectStatus, ProjectPriority } from '@/lib/db'
import ContentOrderForm from './ContentOrderForm'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: '#3daa7c', paused: '#f2a65a', complete: '#5a4fcf', archived: '#94a3b8'
}
const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  urgent: '#e05', high: '#e8448a', medium: '#f2a65a', low: '#94a3b8'
}
const ASSISTANTS = ['strategist', 'cfo', 'operator', 'contrarian', 'content_director', 'future_her', 'healing', 'client_offer', 'research']

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: value >= 80 ? '#3daa7c' : value >= 40 ? '#f2a65a' : 'var(--hot-pink)', borderRadius: '2px', transition: 'width 0.3s' }} />
    </div>
  )
}

function ProjectCard({ project, onUpdate, onDelete }: { project: Project; onUpdate: (id: number, u: Partial<Project>) => void; onDelete: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project)
  const [showGenerator, setShowGenerator] = useState(false)
  const [lastGenCount, setLastGenCount] = useState<number | null>(null)

  const save = () => { onUpdate(project.id, draft); setEditing(false) }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${PRIORITY_COLORS[project.priority]}`, borderRadius: '12px' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }} onClick={() => setOpen(v => !v)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{project.name}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: `${STATUS_COLORS[project.status]}20`, color: STATUS_COLORS[project.status], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{project.status}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: `${PRIORITY_COLORS[project.priority]}18`, color: PRIORITY_COLORS[project.priority], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{project.priority}</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{project.description}</p>
          <div style={{ marginTop: '10px' }}>
            <ProgressBar value={project.progress} />
          </div>
        </div>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '14px' }}>
              <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={inputSt} placeholder="Project name" />
              <textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} rows={2} style={{ ...inputSt, resize: 'vertical' }} placeholder="Description" />
              <input value={draft.next_action} onChange={e => setDraft(d => ({ ...d, next_action: e.target.value }))} style={inputSt} placeholder="Next action" />
              <textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} rows={2} style={{ ...inputSt, resize: 'vertical' }} placeholder="Notes" />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value as ProjectStatus }))} style={inputSt}>
                  {(['active', 'paused', 'complete', 'archived'] as ProjectStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value as ProjectPriority }))} style={inputSt}>
                  {(['urgent', 'high', 'medium', 'low'] as ProjectPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={draft.assistant} onChange={e => setDraft(d => ({ ...d, assistant: e.target.value }))} style={inputSt}>
                  {ASSISTANTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Progress</label>
                  <input type="range" min={0} max={100} value={draft.progress} onChange={e => setDraft(d => ({ ...d, progress: Number(e.target.value) }))} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>{draft.progress}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={save} style={{ ...btnSt, background: 'var(--hot-pink)', color: '#fff' }}><CheckCheck size={13} /> Save</button>
                <button onClick={() => setEditing(false)} style={{ ...btnSt, background: 'var(--border)', color: 'var(--text)' }}><X size={13} /> Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {project.next_action && (
                <div style={{ background: 'rgba(232,68,138,0.07)', borderRadius: '8px', padding: '10px 12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--hot-pink)', marginBottom: '4px' }}>Next action</p>
                  <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{project.next_action}</p>
                </div>
              )}
              {project.notes && <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{project.notes}</p>}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assistant: <strong>{project.assistant}</strong> · Progress: <strong>{project.progress}%</strong></p>

              {/* Generate content */}
              <div style={{ background: 'rgba(107,45,110,0.07)', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showGenerator ? '12px' : '0' }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--purple)' }}>Generate Content</p>
                    {lastGenCount && !showGenerator && <p style={{ fontSize: '11px', color: '#3daa7c', marginTop: '2px' }}>✓ {lastGenCount} assets in Content Pipeline</p>}
                  </div>
                  <button onClick={() => setShowGenerator(v => !v)}
                    style={{ ...btnSt, background: 'var(--purple)', color: '#fff', fontSize: '11px' }}>
                    {showGenerator ? 'Close' : '+ Order Content'}
                  </button>
                </div>
                {showGenerator && (
                  <ContentOrderForm
                    projectName={project.name}
                    projectDescription={project.description}
                    projectNotes={project.notes}
                    onDone={(count) => { setLastGenCount(count); setShowGenerator(false) }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditing(true)} style={{ ...btnSt, background: 'var(--bg)', color: 'var(--text)' }}><Edit3 size={12} /> Edit</button>
                <button onClick={() => onDelete(project.id)} style={{ ...btnSt, background: 'rgba(220,0,0,0.08)', color: '#e05' }}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([])
  const [adding, setAdding] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', next_action: '', priority: 'medium' as ProjectPriority, assistant: 'strategist' })

  useEffect(() => { fetch('/api/projects').then(r => r.json()).then(setProjects) }, [])

  const add = async () => {
    if (!newProject.name.trim()) return
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProject) })
    const p = await res.json()
    setProjects(ps => [p, ...ps])
    setNewProject({ name: '', description: '', next_action: '', priority: 'medium', assistant: 'strategist' })
    setAdding(false)
  }

  const update = async (id: number, updates: Partial<Project>) => {
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
    const updated = await res.json()
    setProjects(ps => ps.map(p => p.id === id ? updated : p))
  }

  const remove = async (id: number) => {
    await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
    setProjects(ps => ps.filter(p => p.id !== id))
  }

  const active = projects.filter(p => p.status === 'active')
  const other = projects.filter(p => p.status !== 'active')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Projects</h2>
        <button onClick={() => setAdding(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          <Plus size={14} /> New Project
        </button>
      </div>

      {adding && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hot-pink)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input value={newProject.name} onChange={e => setNewProject(d => ({ ...d, name: e.target.value }))} placeholder="Project name *" style={inputSt} autoFocus />
          <input value={newProject.description} onChange={e => setNewProject(d => ({ ...d, description: e.target.value }))} placeholder="Short description" style={inputSt} />
          <input value={newProject.next_action} onChange={e => setNewProject(d => ({ ...d, next_action: e.target.value }))} placeholder="First next action" style={inputSt} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={newProject.priority} onChange={e => setNewProject(d => ({ ...d, priority: e.target.value as ProjectPriority }))} style={inputSt}>
              {(['urgent', 'high', 'medium', 'low'] as ProjectPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={newProject.assistant} onChange={e => setNewProject(d => ({ ...d, assistant: e.target.value }))} style={inputSt}>
              {ASSISTANTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={add} style={{ ...btnSt, background: 'var(--hot-pink)', color: '#fff' }}>Add Project</button>
            <button onClick={() => setAdding(false)} style={{ ...btnSt, background: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          </div>
        </div>
      )}

      {active.length > 0 && (
        <>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3daa7c' }}>Active ({active.length})</p>
          {active.map(p => <ProjectCard key={p.id} project={p} onUpdate={update} onDelete={remove} />)}
        </>
      )}
      {other.length > 0 && (
        <>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: '8px' }}>Other</p>
          {other.map(p => <ProjectCard key={p.id} project={p} onUpdate={update} onDelete={remove} />)}
        </>
      )}
    </div>
  )
}

const inputSt = { padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
const btnSt = { display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }
