'use client'
import { useState, useRef } from 'react'
import { Sparkles, Loader2, Copy, CheckCircle2, UploadCloud, X } from 'lucide-react'

type Variation = { angle: string; onscreen_text: string; caption: string; hashtags: string }
type ComposeResult = {
  account_id: string
  account_reason: string
  story_summary: string
  media_read?: string
  variations: Variation[]
  account: { handle: string; emoji: string; color: string } | null
}

// Sample frames from a video in the browser so the AI can actually see the footage
async function extractFrames(file: File, count = 4): Promise<string[]> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = URL.createObjectURL(file)
    const frames: string[] = []
    const canvas = document.createElement('canvas')
    const fail = setTimeout(() => resolve(frames), 20000)

    video.onloadedmetadata = () => {
      const duration = video.duration
      if (!duration || !isFinite(duration)) { clearTimeout(fail); resolve(frames); return }
      const scale = Math.min(1, 480 / (video.videoWidth || 480))
      canvas.width = Math.round((video.videoWidth || 480) * scale)
      canvas.height = Math.round((video.videoHeight || 852) * scale)
      const times = Array.from({ length: count }, (_, i) => duration * (0.12 + (0.76 * i) / Math.max(count - 1, 1)))
      let idx = 0
      const seekNext = () => {
        if (idx >= times.length) { clearTimeout(fail); URL.revokeObjectURL(video.src); resolve(frames); return }
        video.currentTime = times[idx]
      }
      video.onseeked = () => {
        try {
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
          frames.push(canvas.toDataURL('image/jpeg', 0.6))
        } catch { /* frame skipped */ }
        idx++
        seekNext()
      }
      seekNext()
    }
    video.onerror = () => { clearTimeout(fail); resolve(frames) }
  })
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: ok ? '#3DAA7C' : 'var(--text-muted)', flexShrink: 0 }}>
      {ok ? <CheckCircle2 size={11} /> : <Copy size={11} />} {ok ? 'Copied!' : label}
    </button>
  )
}

export default function InstantCompose() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [mediaUrl, setMediaUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [context, setContext] = useState('')
  const [composing, setComposing] = useState(false)
  const [result, setResult] = useState<ComposeResult | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [filedIdx, setFiledIdx] = useState<Record<number, boolean>>({})
  const [filingIdx, setFilingIdx] = useState<number | null>(null)
  const [frames, setFrames] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const [refining, setRefining] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptFile = async (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setMediaUrl('')
    setResult(null)
    setError('')
    setFrames([])
    // Videos: sample frames so RISE can actually watch the footage
    if (f.type.startsWith('video')) {
      extractFrames(f).then(setFrames).catch(() => {})
    }
    // Upload to R2 immediately — lands in the Media library
    setUploading(true)
    try {
      const presign = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: f.name, contentType: f.type, folder: 'media' }),
      }).then(r => r.json())
      if (!presign.uploadUrl) throw new Error(presign.error || 'upload not configured')
      const put = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': f.type }, body: f })
      if (!put.ok) throw new Error(`upload failed (${put.status})`)
      setMediaUrl(presign.publicUrl)
    } catch (e) {
      setError(`Media upload issue: ${e instanceof Error ? e.message : 'failed'} — you can still compose from your description.`)
    } finally {
      setUploading(false)
    }
  }

  const compose = async () => {
    if (!context.trim()) return
    setComposing(true)
    setError('')
    setResult(null)
    setFiledIdx({})
    try {
      const res = await fetch('/api/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, mediaUrl: mediaUrl || undefined, mediaType: file?.type, frames: frames.length ? frames : undefined }),
      })
      const d = await res.json()
      if (d.error) setError(d.error)
      else setResult(d)
    } catch {
      setError('Compose failed — try again.')
    } finally {
      setComposing(false)
    }
  }

  // Refinement loop: her feedback overrides everything, previous variations included for contrast
  const refine = async () => {
    if (!feedback.trim() || !result) return
    setRefining(true)
    setError('')
    try {
      const res = await fetch('/api/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context, mediaUrl: mediaUrl || undefined, mediaType: file?.type,
          frames: frames.length ? frames : undefined,
          previous: result.variations, feedback,
        }),
      })
      const d = await res.json()
      if (d.error) setError(d.error)
      else { setResult(d); setFiledIdx({}); setFeedback('') }
    } catch {
      setError('Refine failed — try again.')
    } finally {
      setRefining(false)
    }
  }

  // Optional: push a chosen variation onto the account card as a ready post (with media attached)
  const fileVariation = async (v: Variation, i: number) => {
    if (!result) return
    setFilingIdx(i)
    try {
      await fetch('/api/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: v.onscreen_text.slice(0, 60) || `Media post — ${result.account?.handle ?? ''}`,
          description: v.caption,
          status: 'ready',
          type: file?.type.startsWith('video') ? 'video' : 'image',
          platforms: ['instagram'],
          tags: ['media-drop', result.account_id],
          account_id: result.account_id,
          onscreen_text: v.onscreen_text,
          hashtags: v.hashtags,
          media_url: mediaUrl,
          river_source: 'media-drop',
        }),
      })
      setFiledIdx(prev => ({ ...prev, [i]: true }))
    } finally {
      setFilingIdx(null)
    }
  }

  const clear = () => { setFile(null); setPreview(''); setMediaUrl(''); setResult(null); setContext(''); setError('') }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--hot-pink)', borderRadius: '16px', padding: '20px' }}>
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)' }}>⚡ Instant Compose</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Drop your photo/video + tell the story → 3 ready post variations. Media saves to your library, story saves to Notes — automatically.
        </p>
      </div>

      {/* Drop zone / preview */}
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f) }}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? 'var(--hot-pink)' : 'var(--border)'}`, borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(232,68,138,0.04)' : 'var(--bg)', transition: 'all 0.15s', marginBottom: '12px' }}>
          <UploadCloud size={26} style={{ color: dragging ? 'var(--hot-pink)' : 'var(--text-subtle)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Drop your photo or video here</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>or click to browse</p>
          <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = '' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
          {file.type.startsWith('video')
            ? <video src={preview} controls style={{ width: '160px', borderRadius: '10px', background: '#000' }} />
            : <img src={preview} alt="" style={{ width: '160px', borderRadius: '10px', objectFit: 'cover' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{file.name}</p>
              {uploading ? <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> saving to Media library…</span>
                : mediaUrl ? <span style={{ fontSize: '10px', fontWeight: 700, color: '#3DAA7C' }}>✓ saved to Media library</span> : null}
              <button onClick={clear} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px', display: 'flex' }}><X size={13} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Context */}
      <textarea value={context} onChange={e => setContext(e.target.value)} rows={3}
        placeholder="Tell the story: what's happening, who's in it, what it means, which account it's for (optional — the station will pick if you don't say)…"
        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: '10px' }} />

      <button onClick={compose} disabled={composing || uploading || !context.trim()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: composing || uploading || !context.trim() ? 0.6 : 1 }}>
        {composing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Composing 3 variations…</> : <><Sparkles size={14} /> Compose Post — 3 Variations</>}
      </button>

      {error && <p style={{ fontSize: '11px', color: '#E05252', marginTop: '8px' }}>⚠ {error}</p>}

      {/* Results */}
      {result && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {result.account && <>Best fit: <strong style={{ color: result.account.color }}>{result.account.emoji} {result.account.handle}</strong> — {result.account_reason}</>}
            <span style={{ color: 'var(--text-subtle)' }}> · Story archived to Notes 📚 · Media in library 🎬</span>
          </p>
          {result.media_read && (
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              👁 What RISE saw: {result.media_read}
            </p>
          )}

          {result.variations?.map((v, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', background: 'var(--bg)', borderLeft: `3px solid ${result.account?.color ?? 'var(--hot-pink)'}` }}>
              <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: result.account?.color ?? 'var(--hot-pink)', marginBottom: '8px' }}>Variation {i + 1} — {v.angle}</p>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '2px' }}>On-screen text {v.onscreen_text.includes('\n') && <span style={{ color: 'var(--hot-pink)' }}>· {v.onscreen_text.split('\n').filter(Boolean).length} beats</span>}</p>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{v.onscreen_text}</p>
                </div>
                <CopyBtn text={v.onscreen_text} label="Copy text" />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '2px' }}>Caption + hashtags</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{v.caption}</p>
                  <p style={{ fontSize: '10px', color: result.account?.color ?? 'var(--purple)', lineHeight: 1.5, marginTop: '6px', wordBreak: 'break-word' }}>{v.hashtags}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <CopyBtn text={`${v.caption}\n\n${v.hashtags}`} label="Copy caption" />
                  <button onClick={() => fileVariation(v, i)} disabled={filingIdx === i || filedIdx[i]}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '7px', border: 'none', background: filedIdx[i] ? '#E8F7F1' : 'var(--purple)', color: filedIdx[i] ? '#3DAA7C' : '#fff', cursor: filedIdx[i] ? 'default' : 'pointer', fontSize: '10px', fontWeight: 700 }}>
                    {filingIdx === i ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : filedIdx[i] ? '✓ On account card' : '→ Queue for approval'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Refinement loop — feedback overrides everything */}
          <div style={{ border: '1px solid var(--border)', borderLeft: '3px solid var(--hot-pink)', borderRadius: '12px', padding: '14px', background: 'var(--surface)' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--hot-pink)', marginBottom: '6px' }}>Not quite right? Direct it.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2}
                placeholder='e.g. "Expand the on-screen text to 30 seconds — 5-10 punchy lines that tell the story" or "funnier" or "make variation 2 the base but softer"'
                style={{ flex: 1, padding: '10px 12px', borderRadius: '9px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
              <button onClick={refine} disabled={refining || !feedback.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 16px', borderRadius: '9px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-end', opacity: refining || !feedback.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                {refining ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Reworking…</> : <><Sparkles size={12} /> Refine</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
