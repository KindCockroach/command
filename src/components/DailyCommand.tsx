'use client'
import { useState, useEffect } from 'react'
import { Zap, Battery, BatteryLow, BatteryMedium, BatteryFull, Flame, CheckCheck, AlertCircle, Sparkles, Loader2 } from 'lucide-react'

type DailyData = {
  date: string
  top3: string[]
  energy: 'low' | 'medium' | 'high' | ''
  notes: string
}

type OnFireItem = { title: string; status: string; label: string; checked?: boolean }

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
      tasks.filter((t: { priority: string }) => t.priority === 'urgent').slice(0, 3).forEach((t: { title: string; status: string }) =>
        fire.push({ title: t.title, status: 'Task', label: 'urgent' })
      )
      projects.filter((p: { priority: string; status: string }) => p.priority === 'urgent' && p.status === 'active').forEach((p: { name: string; next_action: string }) =>
        fire.push({ title: p.name, status: 'Project', label: p.next_action })
      )
      setOnFire(fire)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const getBriefing = async () => {
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'briefing' }) })
      const d = await res.json()
      setBriefing(d.result ?? '')
    } finally { setBriefingLoading(false) }
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
              onClick={() => setOnFire(prev => prev.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it))}
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
      <div style={{ display: 'flex', gap: '12px' }}>
        <textarea
          value={data.notes}
          onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
          placeholder="Quick capture — thoughts, ideas, reminders, anything..."
          rows={3}
          style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', resize: 'none', outline: 'none' }}
        />
        <button onClick={save} disabled={saving}
          style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: saved ? '#3daa7c' : 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}>
          {saved ? <><CheckCheck size={14} /> Saved</> : saving ? 'Saving...' : 'Save Day'}
        </button>
      </div>

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
