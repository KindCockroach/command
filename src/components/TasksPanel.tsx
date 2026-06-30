'use client'
import { useState, useEffect } from 'react'
import { Plus, CheckCheck, Trash2, Circle } from 'lucide-react'
import type { Task, TaskStatus, TaskEnergy } from '@/lib/db'

const BUCKETS: { status: TaskStatus; label: string; color: string; emoji: string }[] = [
  { status: 'today',     label: 'Today',      color: '#e8448a', emoji: '⚡' },
  { status: 'this_week', label: 'This Week',  color: '#f2a65a', emoji: '📅' },
  { status: 'waiting',   label: 'Waiting On', color: '#64748b', emoji: '⏳' },
  { status: 'someday',   label: 'Someday',    color: '#94a3b8', emoji: '💭' },
]

const ENERGY_COLORS: Record<TaskEnergy, string> = { high: '#3daa7c', medium: '#f2a65a', low: '#94a3b8' }
const PRIORITY_COLORS = { urgent: '#e05', high: '#e8448a', medium: '#f2a65a', low: '#94a3b8' }

function TaskItem({ task, onUpdate, onDelete }: { task: Task; onUpdate: (id: number, u: Partial<Task>) => void; onDelete: (id: number) => void }) {
  const done = task.status === 'done'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: done ? 'transparent' : 'var(--bg)', borderRadius: '9px', marginBottom: '6px', border: `1px solid ${done ? 'transparent' : 'var(--border)'}`, opacity: done ? 0.5 : 1, transition: 'opacity 0.2s' }}>
      <button onClick={() => onUpdate(task.id, { status: done ? 'today' : 'done' })}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: done ? '#3daa7c' : 'var(--text-muted)', padding: 0, flexShrink: 0, marginTop: '1px' }}>
        {done ? <CheckCheck size={16} /> : <Circle size={16} />}
      </button>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>{task.title}</p>
        {task.notes && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{task.notes}</p>}
        <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: `${PRIORITY_COLORS[task.priority]}18`, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: `${ENERGY_COLORS[task.energy]}18`, color: ENERGY_COLORS[task.energy] }}>{task.energy} energy</span>
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, flexShrink: 0, opacity: 0.4 }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [adding, setAdding] = useState<TaskStatus | null>(null)
  const [newTask, setNewTask] = useState({ title: '', notes: '', priority: 'medium' as Task['priority'], energy: 'medium' as TaskEnergy, status: 'today' as TaskStatus })
  const [energyFilter, setEnergyFilter] = useState<TaskEnergy | ''>('')

  useEffect(() => { fetch('/api/tasks').then(r => r.json()).then(setTasks) }, [])

  const add = async (status: TaskStatus) => {
    if (!newTask.title.trim()) return
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newTask, status }) })
    const t = await res.json()
    setTasks(ts => [t, ...ts])
    setNewTask({ title: '', notes: '', priority: 'medium', energy: 'medium', status: 'today' })
    setAdding(null)
  }

  const update = async (id: number, updates: Partial<Task>) => {
    const res = await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
    const updated = await res.json()
    setTasks(ts => ts.map(t => t.id === id ? updated : t))
  }

  const remove = async (id: number) => {
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  const filtered = energyFilter ? tasks.filter(t => t.energy === energyFilter) : tasks

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Tasks + Execution</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['' , 'high', 'medium', 'low'] as const).map(e => (
            <button key={e} onClick={() => setEnergyFilter(e as TaskEnergy | '')}
              style={{ fontSize: '11px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', borderColor: energyFilter === e ? ENERGY_COLORS[e as TaskEnergy] || 'var(--hot-pink)' : 'var(--border)', background: energyFilter === e ? (ENERGY_COLORS[e as TaskEnergy] ? `${ENERGY_COLORS[e as TaskEnergy]}18` : 'rgba(232,68,138,0.1)') : 'transparent', color: energyFilter === e ? (ENERGY_COLORS[e as TaskEnergy] || 'var(--hot-pink)') : 'var(--text-muted)' }}>
              {e === '' ? 'All' : `${e} energy`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {BUCKETS.map(bucket => {
          const bucketTasks = filtered.filter(t => t.status === bucket.status)
          const done = filtered.filter(t => t.status === 'done' && bucket.status === 'today').slice(0, 3)
          return (
            <div key={bucket.status} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${bucket.color}`, borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: bucket.color }}>{bucket.emoji} {bucket.label} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({bucketTasks.length})</span></span>
                <button onClick={() => setAdding(bucket.status)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: bucket.color }}>
                  <Plus size={16} />
                </button>
              </div>

              {adding === bucket.status && (
                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input value={newTask.title} onChange={e => setNewTask(d => ({ ...d, title: e.target.value })) } onKeyDown={e => e.key === 'Enter' && add(bucket.status)} placeholder="Task title..." autoFocus style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${bucket.color}`, fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select value={newTask.priority} onChange={e => setNewTask(d => ({ ...d, priority: e.target.value as Task['priority'] }))} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}>
                      {['urgent', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={newTask.energy} onChange={e => setNewTask(d => ({ ...d, energy: e.target.value as TaskEnergy }))} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}>
                      {['high', 'medium', 'low'].map(e => <option key={e} value={e}>{e} energy</option>)}
                    </select>
                    <button onClick={() => add(bucket.status)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: bucket.color, color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>Add</button>
                    <button onClick={() => setAdding(null)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'var(--border)', color: 'var(--text)', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              )}

              {bucketTasks.length === 0 && adding !== bucket.status && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.5, textAlign: 'center', padding: '16px 0' }}>Nothing here</p>
              )}
              {bucketTasks.map(t => <TaskItem key={t.id} task={t} onUpdate={update} onDelete={remove} />)}
              {bucket.status === 'today' && done.length > 0 && (
                <>
                  <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3daa7c', margin: '10px 0 6px' }}>Completed</p>
                  {done.map(t => <TaskItem key={t.id} task={t} onUpdate={update} onDelete={remove} />)}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
