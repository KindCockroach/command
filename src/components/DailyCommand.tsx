'use client'
import { useState, useEffect, useRef } from 'react'
import { Zap, Battery, BatteryLow, BatteryMedium, BatteryFull, Flame, CheckCheck, Sparkles, Loader2, ImageIcon, X } from 'lucide-react'

type DailyData = {
  date: string
  top3: string[]
  energy: 'low' | 'medium' | 'high' | ''
  notes: string
}

type OnFireItem = { id?: string; title: string; status: string; label: string; checked?: boolean }

const today = new Date().toISOString().split('T')[0]
const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const ENERGY_OPTIONS = [
  { value: 'low',    label: 'Low — minimal mode',    icon: BatteryLow,    color: '#94a3b8' },
  { value: 'medium', label: 'Medium — steady build',  icon: BatteryMedium, color: '#f2a65a' },
  { value: 'high',   label: 'High — full send',        icon: BatteryFull,   color: '#3daa7c' },
]

export default function DailyCommand() {
  const [data, setData] = useState<DailyData>({ date: today, top3: ['', '', ''], energy: '', notes: '' })
  const [onFire, setOnFire] = useState<OnFireItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [briefing, setBriefing] = useState('')
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/daily?date=${today}`).then(r => r.json()).then(d => {
      if (d.top3?.length) setData(d)
    })
    // What's on fire — urgent tasks + urgent projects
    Promise.all([
      fetch('/api/tasks?status=today').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([tasks, projects]) => {
      const fire: OnFireItem[] = []
      tasks.filter((t: { priority: string }) => t.priority === 'urgent').slice(0, 3).forEach((t: { id: string; title: string; status: string }) =>
        fire.push({ id: t.id, title: t.title, status: 'Task', label: 'urgent' })
      )
      projects.filter((p: { priority: string; status: string }) => p.priority === 'urgent' && p.status === 'active').forEach((p: { name: string; next_action: string }) =>
        fire.push({ title: p.name, status: 'Project', label: p.next_action })
      )
      setOnFire(fire)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const captured = data.notes.trim()
    await fetch('/api/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setSaving(false)
    setSaved(true)
    if (captured) setSavedNote(captured)
    setTimeout(() => setSaved(false), 2000)
  }

  const getBriefing = async () => {
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'briefing' }) })
      const d = await res.json()
      setBriefing(d.result ?? '')
    } finally { setBriefingLoading(false) }
  }

  const analyzeImage = async (base64: string) => {
    setPendingImage(base64)
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'content_director', image: base64, message: 'Describe this image in 2-3 sentences as a content idea or visual reference. Be specific and actionable.' }),
      })
      const d = await res.json()
      if (d.result) {
        setData(prev => ({ ...prev, notes: prev.notes ? `${prev.notes}\n\n[Image] ${d.result}` : `[Image] ${d.result}` }))
      }
    } finally {
      setAnalyzing(false)
      setPendingImage(null)
    }
  }

  const loadImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => { if (e.target?.result) analyzeImage(e.target.result as string) }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) loadImage(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile()
    if (file) { e.preventDefault(); loadImage(file) }
  }

  const EnergyIcon = ENERGY_OPTIONS.find(e => e.value === data.energy)?.icon ?? Battery
  const energyColor = ENERGY_OPTIONS.find(e => e.value === data.energy)?.color ?? 'var(--text-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Daily Command</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{todayLabel}</p>
        </div>
        <button onClick={getBriefing} disabled={briefingLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          {briefingLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
          AI Briefing
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* What's on fire */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #e05', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
            <Flame size={14} color="#e05" />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e05' }}>What's on fire</span>
          </div>
          {onFire.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', opacity: 0.6 }}>Nothing urgent right now. 🙌</p>}
          {onFire.map((item, i) => (
            <div
              key={i}
              onClick={async () => {
                const next = !item.checked
                setOnFire(prev => prev.map((it, idx) => idx === i ? { ...it, checked: next } : it))
                if (item.id && next) {
                  await fetch(`/api/tasks/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' }) }).catch(() => {})
                }
              }}
              style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < onFire.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
            >
              <div style={{
                width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, marginTop: '1px',
                border: item.checked ? 'none' : '2px solid #e05',
                background: item.checked ? '#3daa7c' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.checked && <CheckCheck size={11} color="#fff" />}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: item.checked ? 'var(--text-muted)' : 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.5 : 1 }}>{item.title}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', opacity: item.checked ? 0.4 : 1 }}>{item.status} — {item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Energy check-in */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${energyColor}`, borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
            <EnergyIcon size={14} color={energyColor} />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: energyColor }}>Energy check-in</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ENERGY_OPTIONS.map(opt => {
              const Icon = opt.icon
              return (
                <button key={opt.value} onClick={() => setData(d => ({ ...d, energy: opt.value as 'low' | 'medium' | 'high' }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '9px', border: `1px solid ${data.energy === opt.value ? opt.color : 'var(--border)'}`, background: data.energy === opt.value ? `${opt.color}18` : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                  <Icon size={14} color={opt.color} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: data.energy === opt.value ? opt.color : 'var(--text-muted)' }}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top 3 priorities */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--hot-pink)', borderRadius: '14px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '16px' }}>
          <Zap size={14} color="var(--hot-pink)" />
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)' }}>Today's top 3</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i === 0 ? 'var(--hot-pink)' : i === 1 ? '#f2a65a' : '#5a4fcf', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#fff' }}>{i + 1}</span>
              </div>
              <input
                value={data.top3[i] ?? ''}
                onChange={e => setData(d => { const t = [...d.top3]; t[i] = e.target.value; return { ...d, top3: t } })}
                placeholder={i === 0 ? 'The needle-mover for today...' : i === 1 ? 'Second priority...' : 'Third priority...'}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '14px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontWeight: i === 0 ? 600 : 400 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notes + save */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{ background: 'var(--surface)', border: `1px solid ${dragging ? 'var(--hot-pink)' : 'var(--border)'}`, borderTop: `3px solid ${dragging ? 'var(--hot-pink)' : 'var(--purple)'}`, borderRadius: '14px', padding: '18px', transition: 'border-color 0.15s', position: 'relative' }}>
        {dragging && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(214,31,120,0.06)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--hot-pink)', fontWeight: 700, fontSize: '14px' }}>
              <ImageIcon size={20} /> Drop to analyze with AI
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Quick Capture</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Brain dump · drop images · paste screenshots</span>
            <button onClick={() => fileInputRef.current?.click()} title="Attach image" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '2px' }}>
              <ImageIcon size={13} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) loadImage(f); e.target.value = '' }} />
          </div>
        </div>
        {analyzing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: '10px' }}>
            {pendingImage && <img src={pendingImage} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--hot-pink)', fontSize: '12px', fontWeight: 600 }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              AI is reading your image...
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <textarea
            value={data.notes}
            onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
            onPaste={handlePaste}
            placeholder="Thoughts, ideas, reminders, free write fragments... Drop or paste an image to analyze it. Saved to your daily log when you click Let's Go."
            rows={3}
            style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'none', outline: 'none', lineHeight: 1.6 }}
          />
          <button onClick={save} disabled={saving}
            style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: saved ? '#3daa7c' : 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s', whiteSpace: 'nowrap' }}>
            {saved ? <><CheckCheck size={14} /> Saved</> : saving ? 'Saving...' : "Let's Go"}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          💡 Generated content lives in <strong>Content</strong> tab → Kanban board. Free write → <strong>Story</strong> tab.
        </p>
      </div>

      {/* Save confirmation */}
      {savedNote && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid #3daa7c', borderRadius: '12px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCheck size={15} color="#3daa7c" />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#3daa7c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Day saved — idea captured</span>
            </div>
            <button onClick={() => setSavedNote('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text)', fontStyle: 'italic', marginBottom: '12px', lineHeight: 1.5, background: 'var(--bg)', padding: '10px 12px', borderRadius: '8px', borderLeft: '2px solid var(--border)' }}>
            "{savedNote}"
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            This is saved to your <strong>daily log for {todayLabel}</strong>. To turn it into something, pick a path:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>✍️</span>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Story tab → turn it into content</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Paste this into Story Processor → get IG captions, TikTok hook, carousel, Medium article in one pass.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>📁</span>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Projects tab → give it a home</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>If this is a multi-step idea (a design, a product, a visual series), open Projects → + New Project → paste this as the description.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Content tab → add it as an idea</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click the + in the Kanban Idea column → add title + description → it enters your pipeline as a seed to be developed.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Briefing output */}
      {briefing && (
        <div style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)', borderRadius: '14px', padding: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)', marginBottom: '12px' }}>
            🔮 Your Daily Briefing
          </p>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{briefing}</div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
