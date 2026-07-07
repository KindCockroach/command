'use client'
import { useState, useEffect, useRef } from 'react'
import { Zap, Battery, BatteryLow, BatteryMedium, BatteryFull, Flame, CheckCheck, Sparkles, Loader2, ImageIcon, Target, Copy, Plus, HelpCircle, Crown, Waves } from 'lucide-react'

type DailyData = {
  date: string
  top3: string[]
  energy: 'low' | 'medium' | 'high' | ''
  notes: string
}

type UserTask = { id: number; title: string; notes: string; priority: string; status: string; checked?: boolean }

type FireItem = {
  key: string
  title: string
  detail: string
  repairPrompt: string   // paste-ready prompt to give Claude to fix it
  kind: 'goal' | 'questions' | 'account'
}

type GoalRow = {
  id: number; title: string; account_id: string | null; target_per_week: number
  deadline: string | null; active: boolean
  postedThisWeek: number; scheduled: number; queued: number; expectedByToday: number; behind: boolean; deadlineSoon: boolean
}

type RiverResult = {
  kind?: 'content' | 'task' | 'event'
  complete: boolean
  piece: { id: number; title: string; description: string; onscreen_text?: string; image_prompt?: string; hashtags?: string }
  account: { handle: string; emoji: string; color: string } | null
  open_questions: string[]
  needs: string[]
  researched: string | null
  task?: { id: number; title: string; due_date: string | null; priority: string }
  event?: { id: number; title: string; date: string; time: string; kind: string }
}

const today = new Date().toISOString().split('T')[0]
const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const ENERGY_OPTIONS = [
  { value: 'low',    label: 'Low — minimal mode',    icon: BatteryLow,    color: '#94a3b8' },
  { value: 'medium', label: 'Medium — steady build',  icon: BatteryMedium, color: '#f2a65a' },
  { value: 'high',   label: 'High — full send',        icon: BatteryFull,   color: '#3daa7c' },
]

export default function DailyCommand() {
  const [data, setData] = useState<DailyData>({ date: today, top3: ['', '', ''], energy: '', notes: '' })
  const [tasks, setTasks] = useState<UserTask[]>([])
  const [fire, setFire] = useState<FireItem[]>([])
  const [fireOpen, setFireOpen] = useState<string | null>(null)
  const [copiedFire, setCopiedFire] = useState<string | null>(null)
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [addingGoal, setAddingGoal] = useState(false)
  const [goalForm, setGoalForm] = useState({ title: '', target_per_week: 3 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [briefing, setBriefing] = useState('')
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [review, setReview] = useState<{ reviewed: number; plans?: { idea: string; plan: string }[]; tasks_created?: number; goal_suggestions?: string[]; hooks?: { hook: string; account_id: string }[]; message?: string } | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [pendingReview, setPendingReview] = useState(0)
  const [filedHook, setFiledHook] = useState<Record<number, boolean>>({})

  const runReview = async (auto = false) => {
    setReviewing(true)
    try {
      const res = await fetch('/api/ceo/review', { method: 'POST' })
      const d = await res.json()
      if (!d.error) {
        setReview(d)
        setPendingReview(0)
        if (d.reviewed > 0) { localStorage.setItem('ceo-review-date', today); fetch('/api/tasks?status=today').then(r => r.json()).then(setTasks).catch(() => {}) }
      }
    } finally { setReviewing(false) }
    if (auto) { /* silent */ }
  }

  const fileHook = async (h: { hook: string; account_id: string }, i: number) => {
    await fetch('/api/river', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: `HOOK from CEO idea review${h.account_id ? ` (for ${h.account_id})` : ''}: ${h.hook}`, source: 'ceo-review' }),
    }).catch(() => {})
    setFiledHook(prev => ({ ...prev, [i]: true }))
  }
  const [riverResult, setRiverResult] = useState<RiverResult | null>(null)
  const [riverRunning, setRiverRunning] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFire = async () => {
    try {
      const [goalRows, accounts, ideas] = await Promise.all([
        fetch('/api/goals').then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
        fetch('/api/content?status=idea').then(r => r.json()),
      ])
      setGoals(goalRows.filter((g: GoalRow) => g.active))

      const items: FireItem[] = []
      // Behind-schedule goals
      goalRows.filter((g: GoalRow) => g.behind).forEach((g: GoalRow) => {
        items.push({
          key: `goal-${g.id}`,
          kind: 'goal',
          title: `Behind: ${g.title}`,
          detail: `${g.postedThisWeek} posted this week — should be at ${g.expectedByToday} by today (target ${g.target_per_week}/wk). ${g.queued} in queue.`,
          repairPrompt: `We're behind on the goal "${g.title}" (${g.postedThisWeek}/${g.expectedByToday} posted this week, target ${g.target_per_week}/week${g.account_id ? `, account ${g.account_id}` : ''}). Generate ${Math.max(g.expectedByToday - g.postedThisWeek - g.scheduled, 2)} complete posts for this goal following the content audit rules, attach them to the right account, and tell me exactly what to approve.`,
        })
      })
      // Posts stuck waiting on Mandi's answers
      const stuck = ideas.filter((c: { open_questions?: string[] }) => c.open_questions && c.open_questions.length > 0)
      stuck.slice(0, 3).forEach((c: { id: number; title: string; open_questions: string[] }) => {
        items.push({
          key: `q-${c.id}`,
          kind: 'questions',
          title: `Needs your answers: ${c.title}`,
          detail: c.open_questions.join(' · '),
          repairPrompt: `The post "${c.title}" (content id ${c.id}) is stuck waiting on these answers: ${c.open_questions.join(' | ')}. Here are my answers: [FILL IN]. Now finish composing the post and set it to ready under its account.`,
        })
      })
      // Restricted accounts
      accounts.filter((a: { status: string }) => a.status === 'restricted').forEach((a: { id: string; handle: string; notes?: string }) => {
        items.push({
          key: `acct-${a.id}`,
          kind: 'account',
          title: `Account restricted: ${a.handle}`,
          detail: a.notes || 'Platform restriction active — publishing is limited.',
          repairPrompt: `The account ${a.handle} is restricted. Review its recent content strategy, propose a 2-week value-first recovery plan (give > ask), and generate the first 5 posts of that plan.`,
        })
      })
      setFire(items)
    } catch { /* fire board is best-effort */ }
  }

  useEffect(() => {
    fetch(`/api/daily?date=${today}`).then(r => r.json()).then(d => {
      if (d.top3?.length) setData(d)
    })
    fetch('/api/tasks?status=today').then(r => r.json()).then(setTasks).catch(() => {})
    loadFire()
    // CEO idea review — run automatically once per day when the station is opened
    fetch('/api/ceo/review').then(r => r.json()).then(d => {
      setPendingReview(d.pending ?? 0)
      if ((d.pending ?? 0) > 0 && localStorage.getItem('ceo-review-date') !== today) runReview(true)
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true)
    const captured = data.notes.trim()
    await fetch('/api/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Send capture through the River: sort → compose → file under account
    if (captured) {
      setRiverRunning(true)
      setRiverResult(null)
      try {
        const res = await fetch('/api/river', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: captured, source: 'quick-capture' }),
        })
        const result = await res.json()
        if (!result.error) {
          setRiverResult(result)
          setData(d => ({ ...d, notes: '' }))
          loadFire()
          if (result.kind === 'task') {
            fetch('/api/tasks?status=today').then(r => r.json()).then(setTasks).catch(() => {})
          }
        }
      } finally {
        setRiverRunning(false)
      }
    }
  }

  const toggleTask = async (t: UserTask) => {
    const next = !t.checked
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, checked: next } : x))
    if (next) {
      await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: 'done' }) }).catch(() => {})
    }
  }

  const copyRepair = (item: FireItem) => {
    navigator.clipboard.writeText(item.repairPrompt)
    setCopiedFire(item.key)
    setTimeout(() => setCopiedFire(null), 2000)
  }

  const addGoal = async () => {
    if (!goalForm.title.trim()) return
    await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goalForm) })
    setGoalForm({ title: '', target_per_week: 3 })
    setAddingGoal(false)
    loadFire()
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

      {/* Quick Capture — the mouth of the river, first thing on screen */}
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
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Quick Capture → The River</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ideas · stories · images — sorted to an account, composed into a post</span>
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
            placeholder="Drop an idea, story, or image. The river sorts it to the right account and composes the post — or asks you what it's missing."
            rows={3}
            style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'none', outline: 'none', lineHeight: 1.6 }}
          />
          <button onClick={save} disabled={saving || riverRunning}
            style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: saved ? '#3daa7c' : 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s', whiteSpace: 'nowrap' }}>
            {riverRunning ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sorting...</> : saved ? <><CheckCheck size={14} /> Saved</> : saving ? 'Saving...' : "Let's Go"}
          </button>
        </div>
      </div>

      {/* River verdict */}
      {riverResult && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${riverResult.kind === 'task' ? 'var(--purple)' : riverResult.kind === 'event' ? '#5a4fcf' : riverResult.complete ? '#3daa7c' : '#f2a65a'}`, borderRadius: '12px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: riverResult.kind === 'task' ? 'var(--purple)' : riverResult.kind === 'event' ? '#5a4fcf' : riverResult.complete ? '#3daa7c' : '#f2a65a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {riverResult.kind === 'task' ? '✓ Task captured' : riverResult.kind === 'event' ? '📅 Event added' : riverResult.complete ? '🌊 Composed & filed' : '🌊 Sorted — needs you'}
            </span>
            <button onClick={() => setRiverResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
          {riverResult.kind === 'task' && riverResult.task && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 700 }}>{riverResult.task.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Added to your tasks{riverResult.task.due_date ? ` · due ${new Date(riverResult.task.due_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''} · {riverResult.task.priority} priority — it&apos;s in the &quot;Your tasks today&quot; card and the Tasks tab.
              </p>
            </>
          )}
          {riverResult.kind === 'event' && riverResult.event && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 700 }}>{riverResult.event.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                On the calendar for <strong>{new Date(riverResult.event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>{riverResult.event.time ? ` at ${riverResult.event.time}` : ''} — the concept engine on the Goals tab will build content around it.
              </p>
            </>
          )}
          {(!riverResult.kind || riverResult.kind === 'content') && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 700 }}>{riverResult.piece?.title}</p>
              {/* The full processed post, right here — no hunting */}
              {riverResult.complete && riverResult.piece && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {riverResult.piece.onscreen_text && (
                    <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-subtle)', marginBottom: '4px' }}>On-screen / Hook</p>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>{riverResult.piece.onscreen_text}</p>
                    </div>
                  )}
                  <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-subtle)' }}>Composed post</p>
                      <button onClick={() => navigator.clipboard.writeText([riverResult.piece.description, riverResult.piece.hashtags].filter(Boolean).join('\n\n'))}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{riverResult.piece.description}</p>
                  </div>
                  {riverResult.piece.image_prompt && (
                    <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-subtle)', marginBottom: '4px' }}>🎨 Image / video prompt</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{riverResult.piece.image_prompt}</p>
                    </div>
                  )}
                  {riverResult.piece.hashtags && (
                    <p style={{ fontSize: '10px', color: riverResult.account?.color ?? 'var(--purple)', lineHeight: 1.5, wordBreak: 'break-word', padding: '0 2px' }}>{riverResult.piece.hashtags}</p>
                  )}
                </div>
              )}
            </>
          )}
          {riverResult.account && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {riverResult.complete
                ? <>Complete post created under <strong style={{ color: riverResult.account.color }}>{riverResult.account.emoji} {riverResult.account.handle}</strong> — flip its card in <strong>Accounts</strong> to review &amp; approve.</>
                : <>Filed under <strong style={{ color: riverResult.account.color }}>{riverResult.account.emoji} {riverResult.account.handle}</strong> as an idea.</>}
            </p>
          )}
          {riverResult.researched && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>📚 Research on “{riverResult.researched}” saved to Notes.</p>
          )}
          {riverResult.open_questions?.length > 0 && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(242,166,90,0.08)', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#f2a65a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}><HelpCircle size={12} /> Only you can answer:</p>
              {riverResult.open_questions.map((q, i) => (
                <p key={i} style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>{i + 1}. {q}</p>
              ))}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Answer these in the post&apos;s card (Content tab) or re-capture with the details added.</p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Your tasks — things only Mandi can do */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--purple)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
            <CheckCheck size={14} color="var(--purple)" />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--purple)' }}>Your tasks today</span>
          </div>
          {tasks.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', opacity: 0.6 }}>No tasks queued for today. Check the Tasks tab.</p>}
          {tasks.map((t, i) => (
            <div key={t.id} onClick={() => toggleTask(t)}
              style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, marginTop: '1px', border: t.checked ? 'none' : '2px solid var(--purple)', background: t.checked ? '#3daa7c' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.checked && <CheckCheck size={11} color="#fff" />}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: t.checked ? 'var(--text-muted)' : 'var(--text)', textDecoration: t.checked ? 'line-through' : 'none', opacity: t.checked ? 0.5 : 1 }}>{t.title}</p>
                {t.notes && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', opacity: t.checked ? 0.4 : 1 }}>{t.notes}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* What's on fire — breakdowns & behind-schedule only */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #e05', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
            <Flame size={14} color="#e05" />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e05' }}>What&apos;s on fire</span>
          </div>
          {fire.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', opacity: 0.6 }}>Nothing breaking down. On pace everywhere. 🙌</p>}
          {fire.map((item, i) => (
            <div key={item.key} style={{ padding: '8px 0', borderBottom: i < fire.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div onClick={() => setFireOpen(fireOpen === item.key ? null : item.key)} style={{ cursor: 'pointer' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#e05' }}>{item.title}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.detail}</p>
              </div>
              {fireOpen === item.key && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '4px' }}>What to do about it</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>{item.repairPrompt}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => { localStorage.setItem('station-open-agent', 'ceo'); localStorage.setItem('station-agent-prefill', item.repairPrompt); window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view: 'assistants' } })) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#C9956A', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                      👑 Hand to CEO to fix
                    </button>
                    <button onClick={() => copyRepair(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: copiedFire === item.key ? '#3daa7c' : 'var(--text-muted)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                      {copiedFire === item.key ? <CheckCheck size={11} /> : <Copy size={11} />}
                      {copiedFire === item.key ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CEO Idea Review */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #C9956A', borderRadius: '14px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: review ? '14px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Crown size={14} color="#C9956A" />
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C9956A' }}>CEO Idea Review</span>
              <p style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>Daily pass over your raw captures → plans, tasks, goal ideas, and fresh hooks</p>
            </div>
          </div>
          <button onClick={() => runReview(false)} disabled={reviewing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: 'none', background: '#C9956A', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer', opacity: reviewing ? 0.7 : 1 }}>
            {reviewing ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Reviewing…</> : <><Sparkles size={12} /> Review {pendingReview > 0 ? `${pendingReview} raw idea${pendingReview !== 1 ? 's' : ''}` : 'ideas'}</>}
          </button>
        </div>

        {review && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {review.message && review.reviewed === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{review.message}</p>}
            {(review.plans?.length ?? 0) > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '6px' }}>Plans</p>
                {review.plans!.map((p, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '5px', borderLeft: '3px solid #C9956A' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>{p.idea}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.5 }}>{p.plan}</p>
                  </div>
                ))}
              </div>
            )}
            {(review.tasks_created ?? 0) > 0 && (
              <p style={{ fontSize: '11px', color: '#3daa7c', fontWeight: 700 }}>✓ {review.tasks_created} task{review.tasks_created !== 1 ? 's' : ''} added to your list this week.</p>
            )}
            {(review.goal_suggestions?.length ?? 0) > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '6px' }}>Goal suggestions</p>
                {review.goal_suggestions!.map((g, i) => <p key={i} style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>🎯 {g}</p>)}
              </div>
            )}
            {(review.hooks?.length ?? 0) > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '6px' }}>Hooks mined from your words</p>
                {review.hooks!.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '5px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', fontStyle: 'italic' }}>“{h.hook}”{h.account_id && <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontStyle: 'normal', marginLeft: '6px' }}>· {h.account_id}</span>}</p>
                    <button onClick={() => fileHook(h, i)} disabled={filedHook[i]}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', border: 'none', background: filedHook[i] ? '#E8F7F1' : 'var(--purple)', color: filedHook[i] ? '#3DAA7C' : '#fff', fontWeight: 700, fontSize: '10px', cursor: filedHook[i] ? 'default' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {filedHook[i] ? '✓ Filed' : <><Waves size={10} /> To River</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goals — the pace-keeper */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #3daa7c', borderRadius: '14px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Target size={14} color="#3daa7c" />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3daa7c' }}>Goals & pace</span>
          </div>
          <button onClick={() => setAddingGoal(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-muted)' }}>
            <Plus size={11} /> Goal
          </button>
        </div>
        {addingGoal && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} placeholder="Goal (e.g. Grow @aimompodcast — 4 clips/week)"
              style={{ flex: 1, minWidth: '200px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
            <input type="number" min={1} max={21} value={goalForm.target_per_week} onChange={e => setGoalForm(f => ({ ...f, target_per_week: Number(e.target.value) }))} title="Posts per week"
              style={{ width: '64px', padding: '9px 8px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', textAlign: 'center' }} />
            <button onClick={addGoal} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#3daa7c', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Add</button>
          </div>
        )}
        {goals.length === 0 && !addingGoal && <p style={{ fontSize: '13px', color: 'var(--text-muted)', opacity: 0.6 }}>No goals yet — add one so the station can keep you on pace.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {goals.map(g => {
            const pct = Math.min(100, Math.round((g.postedThisWeek / g.target_per_week) * 100))
            return (
              <div key={g.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    {g.title} {g.behind && <span style={{ color: '#e05', fontWeight: 800 }}>· BEHIND</span>}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{g.postedThisWeek}/{g.target_per_week} this week · {g.queued} queued</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: '3px', background: g.behind ? '#e05' : '#3daa7c', transition: 'width 0.3s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Top 3 priorities */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--hot-pink)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '16px' }}>
            <Zap size={14} color="var(--hot-pink)" />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)' }}>Today&apos;s top 3</span>
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
