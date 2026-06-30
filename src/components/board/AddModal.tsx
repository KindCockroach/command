'use client'
import { useState } from 'react'
import { ContentPiece } from '@/lib/db'
import { X, Plus } from 'lucide-react'

const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'facebook', 'linkedin', 'pinterest', 'beehiiv', 'substack', 'email']
const TYPES = ['video', 'podcast', 'post', 'image', 'workshop', 'other'] as const
const STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready to Publish' },
] as const

interface Props {
  defaultStatus?: string
  onClose: () => void
  onAdd: (p: ContentPiece) => void
}

export default function AddModal({ defaultStatus = 'idea', onClose, onAdd }: Props) {
  const [form, setForm] = useState({ title: '', description: '', type: 'video', status: defaultStatus, platforms: [] as string[], tags: [] as string[], notes: '' })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const togglePlatform = (p: string) => {
    set('platforms', form.platforms.includes(p) ? form.platforms.filter(x => x !== p) : [...form.platforms, p])
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '')
    if (!t || form.tags.includes(t)) return
    set('tags', [...form.tags, t])
    setTagInput('')
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const piece = await res.json()
    onAdd(piece)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#E8E5E0]">
          <h2 className="text-[17px] font-semibold text-[#1C1917]">Add Content</h2>
          <button onClick={onClose} className="text-[#78716C] hover:text-[#1C1917] p-1 rounded-md hover:bg-[#F4F2EF]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <input
            autoFocus
            value={form.title}
            onChange={e => set('title', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Title *"
            className="w-full px-3 py-2.5 rounded-lg border border-[#E8E5E0] text-[15px] font-medium focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20"
          />
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={2}
            placeholder="Short description (optional)"
            className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] text-[14px] focus:outline-none focus:border-[#7C3AED] resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wide mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] text-[14px] bg-white">
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wide mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] text-[14px] bg-white">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wide mb-1.5">Platforms</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)} className={`text-[12px] px-2.5 py-1 rounded-full border font-medium transition-all ${form.platforms.includes(p) ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'bg-white border-[#E8E5E0] text-[#78716C] hover:border-[#7C3AED]'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wide mb-1.5">Tags</label>
            <div className="flex gap-2 mb-1.5">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag" className="flex-1 px-3 py-1.5 rounded-lg border border-[#E8E5E0] text-[13px] focus:outline-none focus:border-[#7C3AED]" />
              <button onClick={addTag} className="text-[12px] px-3 py-1.5 bg-[#EDE9FE] text-[#7C3AED] rounded-lg font-medium hover:bg-[#7C3AED] hover:text-white transition-all">Add</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                  #{t}<button onClick={() => set('tags', form.tags.filter(x => x !== t))}><X size={10} /></button>
                </span>
              ))}
            </div>
          </div>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Notes (optional)" className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] text-[14px] focus:outline-none focus:border-[#7C3AED] resize-none" />
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-[#E8E5E0]">
          <button onClick={onClose} className="text-[13px] px-4 py-2 rounded-lg text-[#78716C] hover:bg-[#F4F2EF]">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} className="flex items-center gap-1.5 text-[13px] px-4 py-2 bg-[#7C3AED] text-white rounded-lg font-medium hover:bg-[#5B21B6] disabled:opacity-40 transition-all">
            <Plus size={13} /> {saving ? 'Adding…' : 'Add Content'}
          </button>
        </div>
      </div>
    </div>
  )
}
