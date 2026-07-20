'use client'
import { useState, useRef } from 'react'
import { Sparkles, Loader2, Upload, X, ArrowRight, CheckCircle2, FileText, Video, Music, Image, Link, Brain } from 'lucide-react'

interface Classification {
  received?: string
  understood?: boolean
  questions?: string[]
  type: string
  title: string
  summary: string
  route: string
  avatar: string | null
  avatar_reason: string | null
  suggested_action: string
  tags: string[]
  priority: string
  content_angles: string[]
}

const AVATAR_EMOJIS: Record<string, string> = {
  mandi: '🎈', evra: '🐊', luna: '🌙', max: '⚡', sage: '🪴'
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  content_idea: <Sparkles size={14} />,
  podcast: <Music size={14} />,
  social_post: <Brain size={14} />,
  task: <CheckCircle2 size={14} />,
  project: <FileText size={14} />,
  note: <FileText size={14} />,
  media: <Video size={14} />,
  research: <Link size={14} />,
  question: <Brain size={14} />,
}

export default function UniversalCapture() {
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<Classification | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedRoute, setSavedRoute] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<string | null>(null)   // what RISE received (formatted echo)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const uploadFile = async (f: File) => {
    setUploading(true)
    try {
      const folder = f.type.startsWith('video') ? 'videos'
        : f.type.startsWith('audio') ? 'audio'
        : f.type.startsWith('image') ? 'images' : 'files'

      const fd = new FormData()
      fd.append('file', f)
      fd.append('folder', folder)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const { publicUrl } = await res.json()
      return { publicUrl, fileType: f.type, fileName: f.name }
    } finally {
      setUploading(false)
    }
  }

  const classify = async (extraContext?: string) => {
    const base = input.trim()
    if (!base && !file) return
    // Instant "received" feedback — show what she gave, formatted, the moment she submits
    const echo = [base, file ? `📎 ${file.name}` : ''].filter(Boolean).join('\n')
    setSubmitted(echo)
    setLoading(true)
    setResult(null)
    setError(null)
    setSavedRoute(null)

    const composed = extraContext ? `${base}\n\nMORE CONTEXT FROM MANDI:\n${extraContext}` : base

    try {
      let fileData: { publicUrl: string; fileType: string; fileName: string } | null = null
      if (file) fileData = await uploadFile(file)

      const res = await fetch('/api/intake/smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: composed,
          fileUrl: fileData?.publicUrl,
          fileType: fileData?.fileType,
          fileName: fileData?.fileName,
        }),
      })
      const data = await res.json()
      if (data.classification) { setResult(data.classification); setAnswers({}) }
      else setError('Could not read that — try adding a bit more context')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Mandi answered RISE's clarifying questions → re-run the sort with her answers folded in
  const sendAnswers = () => {
    const qs = result?.questions ?? []
    const extra = qs.map((q, i) => `${q} → ${answers[i] ?? ''}`).filter(a => a.split('→')[1]?.trim()).join('\n')
    classify(extra)
  }

  const saveToRoute = async () => {
    if (!result) return
    // Route to appropriate API based on classification
    const route = result.route
    if (route === 'pipeline' || route === 'tasks' || route === 'projects' || route === 'notes') {
      const endpoint = route === 'pipeline' ? '/api/intake'
        : route === 'tasks' ? '/api/tasks'
        : route === 'projects' ? '/api/projects'
        : '/api/notes'

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          description: result.summary,
          content: result.summary,
          status: 'idea',
          priority: result.priority,
          tags: result.tags,
          avatar: result.avatar,
        }),
      })
    }
    setSavedRoute(route)
    setTimeout(() => {
      setResult(null)
      setInput('')
      setFile(null)
      setSavedRoute(null)
      setSubmitted(null)
      setAnswers({})
    }, 2500)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const PRIORITY_COLOR: Record<string, string> = {
    high: '#E8448A', medium: '#F2A65A', low: '#9494B0'
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} style={{ color: 'var(--purple)' }} />
        </div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>Universal Capture</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Drop anything — URL, idea, file, voice memo, transcript — the station figures out the rest</p>
        </div>
      </div>

      {/* Drop zone */}
      <div ref={dropRef} onDrop={onDrop} onDragOver={e => e.preventDefault()}
        onClick={() => !file && fileRef.current?.click()}
        style={{ border: `2px dashed ${file ? 'var(--purple)' : 'var(--border)'}`, borderRadius: '12px', padding: '14px', background: file ? 'var(--purple-light)' : 'var(--surface-raised)', cursor: file ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} accept="video/*,audio/*,image/*,.pdf,.txt,.doc,.docx" />
        {file ? (
          <>
            <div style={{ fontSize: '20px' }}>
              {file.type.startsWith('video') ? '🎬' : file.type.startsWith('audio') ? '🎙️' : file.type.startsWith('image') ? '🖼️' : '📄'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)' }}>{file.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '4px' }}>
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Upload size={16} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
              Drop a file or click to browse — video, audio, image, PDF, transcript
            </p>
          </>
        )}
      </div>

      {/* Text input */}
      <textarea value={input} onChange={e => setInput(e.target.value)}
        placeholder="Or type/paste anything — a URL, raw idea, voice memo transcript, social post you want to remake, podcast topic, task, question..."
        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', lineHeight: 1.6 }}
        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) classify() }}
      />

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button onClick={() => classify()} disabled={loading || uploading || (!input.trim() && !file)}
          style={{ flex: 1, padding: '11px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: (!input.trim() && !file) ? 0.5 : 1 }}>
          {loading || uploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {uploading ? 'Uploading...' : 'Analyzing...'}</> : <><Sparkles size={14} /> Let the station decide</>}
        </button>
        <p style={{ fontSize: '11px', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>⌘ + Enter</p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#FEF5EA', borderRadius: '10px', fontSize: '13px', color: '#F2A65A', fontWeight: 600 }}>
          ⚠ {error}
        </div>
      )}

      {/* 📥 RECEIVED — instant proof RISE has what she gave it, formatted & separated */}
      {submitted && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-raised)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px' }}>📥</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>RISE received this</span>
            {loading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: 'var(--purple)', marginLeft: 'auto' }} />}
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {submitted.split('\n').filter(l => l.trim()).map((line, i) => (
              <p key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, paddingLeft: '10px', borderLeft: '2px solid var(--purple)' }}>{line}</p>
            ))}
          </div>
          {result?.received && (
            <div style={{ padding: '10px 12px', background: 'var(--purple-light)', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--purple)', fontWeight: 600 }}>
              {result.received}
            </div>
          )}
        </div>
      )}

      {/* 🤔 NEEDS CONTEXT — RISE asks before it sorts */}
      {result && result.understood === false && (result.questions?.length ?? 0) > 0 && (
        <div style={{ border: '1px solid #F2A65A', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', background: '#FEF5EA', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>🤔</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#C97B2C' }}>A couple things so I sort this right</span>
          </div>
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(result.questions ?? []).map((q, i) => (
              <div key={i}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '5px' }}>{q}</p>
                <input value={answers[i] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                  placeholder="Your answer…"
                  style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit' }} />
              </div>
            ))}
            <button onClick={sendAnswers} disabled={loading}
              style={{ width: '100%', padding: '11px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Re-sorting…</> : <><ArrowRight size={14} /> Send answers — sort it now</>}
            </button>
          </div>
        </div>
      )}

      {/* Classification result — only once RISE understands the assignment */}
      {result && result.understood !== false && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#EAF7F0', borderBottom: '1px solid #CDEBDB', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} style={{ color: '#3DAA7C' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#2E8B60' }}>RISE Command Center understands the assignment</span>
          </div>
          <div style={{ padding: '14px 16px', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#fff' }}>{TYPE_ICONS[result.type] ?? <Sparkles size={14} />}</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{result.title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.15)', color: '#fff' }}>{result.type.replace('_', ' ')}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: PRIORITY_COLOR[result.priority] ?? '#9494B0', color: '#fff' }}>{result.priority}</span>
            </div>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{result.summary}</p>

            {result.avatar && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                <span style={{ fontSize: '18px' }}>{AVATAR_EMOJIS[result.avatar] ?? '🎭'}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>{result.avatar} should own this</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{result.avatar_reason}</p>
                </div>
              </div>
            )}

            {result.content_angles?.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Content Angles</p>
                {result.content_angles.map((angle, i) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--surface-raised)', borderRadius: '6px', marginBottom: '4px', borderLeft: '3px solid var(--purple)' }}>
                    {angle}
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '10px 12px', background: 'var(--purple-light)', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--purple)', marginBottom: '3px' }}>Suggested Next Step</p>
              <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{result.suggested_action}</p>
            </div>

            {result.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {result.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', background: 'var(--surface-raised)', color: 'var(--text-subtle)' }}>#{tag}</span>
                ))}
              </div>
            )}

            <button onClick={saveToRoute}
              style={{ width: '100%', padding: '11px', background: savedRoute ? '#3DAA7C' : 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.2s' }}>
              {savedRoute ? <><CheckCircle2 size={14} /> Saved to {savedRoute}!</> : <><ArrowRight size={14} /> Save to {result.route}</>}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
