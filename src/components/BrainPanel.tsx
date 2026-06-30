'use client'
import { useState, useEffect } from 'react'
import { Brain, Plus, Trash2, Tag, Loader2, Save, X } from 'lucide-react'
import type { Memory } from '@/lib/db'

const CATEGORIES: Memory['category'][] = ['decision', 'pattern', 'voice', 'lesson', 'goal', 'fact', 'note']
const ALL_AGENTS = ['strategist', 'cfo', 'operator', 'contrarian', 'content_director', 'future_her']

const CAT_COLORS: Record<string, string> = {
  decision: '#5A4FCF', pattern: '#F2A65A', voice: 'var(--hot-pink)',
  lesson: '#3DAA7C',   goal: '#E8448A',     fact: '#69C9D0',   note: 'var(--text-muted)',
}

export default function BrainPanel() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')

  // New memory form
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newCat, setNewCat] = useState<Memory['category']>('fact')
  const [newAgents, setNewAgents] = useState<string[]>([])

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/memory')
    const data = await res.json()
    setMemories(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const save = async () => {
    if (!newTitle.trim() || !newBody.trim()) return
    setSaving(true)
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, body: newBody, category: newCat, agent_tags: newAgents }),
    })
    setNewTitle(''); setNewBody(''); setNewAgents([])
    setAdding(false); setSaving(false)
    load()
  }

  const remove = async (id: number) => {
    await fetch(`/api/memory?id=${id}`, { method: 'DELETE' })
    setMemories(m => m.filter(x => x.id !== id))
  }

  const toggleAgent = (a: string) =>
    setNewAgents(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const filtered = filterCat === 'all' ? memories : memories.filter(m => m.category === filterCat)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={16} color="var(--hot-pink)" />
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy)' }}>Mandi's Brain</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            {memories.length} memories · injected into every agent call
          </span>
        </div>
        <button onClick={() => setAdding(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: 'var(--hot-pink)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>
          {adding ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Memory</>}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: 'var(--surface)', border: '2px solid var(--hot-pink)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--hot-pink)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>New Memory</p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setNewCat(c)}
                style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', border: '1px solid', cursor: 'pointer',
                  background: newCat === c ? CAT_COLORS[c] : 'transparent',
                  borderColor: newCat === c ? CAT_COLORS[c] : 'var(--border)',
                  color: newCat === c ? '#fff' : 'var(--text-muted)' }}>
                {c}
              </button>
            ))}
          </div>

          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title — short, memorable"
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />

          <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="The memory — be specific. 'Mandi converts better on TikTok than Instagram for the $10 offer' beats 'TikTok works.'" rows={3}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none' }} />

          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Tag size={10} style={{ display: 'inline', marginRight: '4px' }} />Which agents see this?
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ALL_AGENTS.map(a => (
                <button key={a} onClick={() => toggleAgent(a)}
                  style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', border: '1px solid', cursor: 'pointer',
                    background: newAgents.includes(a) ? 'var(--navy)' : 'transparent',
                    borderColor: newAgents.includes(a) ? 'var(--navy)' : 'var(--border)',
                    color: newAgents.includes(a) ? '#fff' : 'var(--text-muted)' }}>
                  {a}
                </button>
              ))}
              <button onClick={() => setNewAgents(newAgents.length === ALL_AGENTS.length ? [] : [...ALL_AGENTS])}
                style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)' }}>
                {newAgents.length === ALL_AGENTS.length ? 'none' : 'all'}
              </button>
            </div>
          </div>

          <button onClick={save} disabled={saving || !newTitle.trim() || !newBody.trim()}
            style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: 'var(--hot-pink)', color: '#fff', fontSize: '12px', fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            Save to Brain
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {['all', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', border: '1px solid', cursor: 'pointer',
              background: filterCat === c ? (CAT_COLORS[c] ?? 'var(--navy)') : 'transparent',
              borderColor: filterCat === c ? (CAT_COLORS[c] ?? 'var(--navy)') : 'var(--border)',
              color: filterCat === c ? '#fff' : 'var(--text-muted)' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Memory list */}
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Loader2 size={18} color="var(--hot-pink)" style={{ animation: 'spin 1s linear infinite' }} /></div>}

      {!loading && filtered.length === 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
          No memories yet in this category. Add the first one.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(m => (
          <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', borderLeft: `3px solid ${CAT_COLORS[m.category] ?? 'var(--border)'}`, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: CAT_COLORS[m.category] }}>{m.category}</span>
                {m.agent_tags.map(t => (
                  <span key={t} style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{t}</span>
                ))}
              </div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{m.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{m.body}</p>
            </div>
            <button onClick={() => remove(m.id)} title="Delete memory"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', flexShrink: 0, opacity: 0.5 }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
