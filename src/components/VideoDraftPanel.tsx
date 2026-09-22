'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, Check, ChevronDown, ChevronUp, X, Wand2 } from 'lucide-react'

type Shot = { type: string; shot: string }
type Draft = { transcript: string; title: string; hooks: string[]; caption: string; hashtags: string[]; script: string; footage: Shot[]; keywords: string[] }
type Acct = { id: string; handle: string; status: string }

// The clean video-post review panel. Drop a video → RISE transcribes it and writes
// 3-5 hooks, one title, one caption, 3-5 real hashtags — from her ACTUAL words.
// Regenerate with feedback, or retry with the title as the caption's first line.
export default function VideoDraftPanel({ videoUrl, fileName, onClose }: { videoUrl: string; fileName?: string; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [regen, setRegen] = useState(false)
  const [err, setErr] = useState('')
  const [hookIdx, setHookIdx] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [showTx, setShowTx] = useState(false)
  const [accounts, setAccounts] = useState<Acct[]>([])
  const [account, setAccount] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then((a: Acct[]) => setAccounts(a.filter(x => ['active', 'restricted', 'planned'].includes(x.status)))).catch(() => {})
  }, [])

  // Initial draft (transcribe + write).
  const runInitial = useCallback(() => {
    setLoading(true); setErr('')
    fetch('/api/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl }) })
      .then(r => r.json())
      .then(d => { if (d.title || d.hooks?.length) { setDraft(d); setHookIdx(0) } else setErr(d.error || 'Could not write from that video') })
      .catch(() => setErr('Connection error'))
      .finally(() => setLoading(false))
  }, [videoUrl])
  useEffect(() => { runInitial() }, [runInitial])

  // Regenerate from the existing transcript (cheap) — with feedback or title-first.
  const redraft = (opts: { feedback?: string; titleFirst?: boolean }) => {
    if (!draft) return
    setRegen(true); setErr('')
    fetch('/api/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: draft.transcript, accountId: account || undefined, ...opts }) })
      .then(r => r.json())
      .then(d => { if (d.title || d.hooks?.length) { setDraft({ ...d, transcript: draft.transcript }); setHookIdx(0) } else setErr(d.error || 'Regenerate failed') })
      .catch(() => setErr('Connection error'))
      .finally(() => setRegen(false))
  }

  const save = () => {
    if (!draft) return
    setSaving(true); setSaved('')
    fetch('/api/video', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ save: true, videoUrl, title: draft.title, onscreen: draft.hooks[hookIdx] || '', caption: draft.caption, hashtags: draft.hashtags, keywords: draft.keywords, script: draft.script, footage: draft.footage, accountId: account || undefined }),
    }).then(r => r.json())
      .then(d => { if (d.piece) setSaved(`✓ Saved as post #${d.piece.id}${account ? ` in ${accounts.find(a => a.id === account)?.handle || account} — ready to approve` : ' — assign an account on the card'}. Video renamed to the title.`); else setSaved(d.error || 'Save failed') })
      .catch(() => setSaved('Connection error'))
      .finally(() => setSaving(false))
  }

  const label: React.CSSProperties = { fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-subtle)', marginBottom: '5px' }
  const box: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px 12px' }

  return (
    <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface-raised)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 15px', borderBottom: '1px solid var(--border)', background: 'var(--purple-light)' }}>
        <span style={{ fontSize: '16px' }}>🎬</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>Your video, written up</p>
          <p style={{ fontSize: '10.5px', color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'from your spoken words'}</p>
        </div>
        <button onClick={onClose} title="Close" style={{ border: 'none', background: 'var(--surface)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', display: 'flex' }}><X size={15} /></button>
      </div>

      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {loading && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', padding: '10px 0' }}><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Listening to your video and writing it up…</div>}
        {!loading && err && <p style={{ fontSize: '12px', color: '#E05252' }}>{err} <button onClick={runInitial} style={{ marginLeft: '6px', color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }}>try again</button></p>}

        {draft && !loading && (
          <div style={{ opacity: regen ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: '15px', transition: 'opacity .2s' }}>
            {/* TITLE */}
            <div>
              <p style={label}>Title</p>
              <div style={{ ...box, fontSize: '14px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{draft.title}</div>
            </div>

            {/* HOOKS — pick the on-screen line */}
            <div>
              <p style={label}>On-screen hooks — pick one ({draft.hooks.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {draft.hooks.map((h, i) => (
                  <button key={i} onClick={() => setHookIdx(i)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', textAlign: 'left', padding: '10px 11px', borderRadius: '10px', cursor: 'pointer', background: i === hookIdx ? 'var(--purple-light)' : 'var(--surface)', border: `1.5px solid ${i === hookIdx ? 'var(--purple)' : 'var(--border)'}` }}>
                    <span style={{ flexShrink: 0, marginTop: '1px', width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${i === hookIdx ? 'var(--purple)' : 'var(--border)'}`, background: i === hookIdx ? 'var(--purple)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i === hookIdx && <Check size={10} color="#fff" />}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>{h}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CAPTION */}
            <div>
              <p style={label}>Caption</p>
              <div style={{ ...box, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{draft.caption}</div>
            </div>

            {/* HASHTAGS */}
            <div>
              <p style={label}>Hashtags</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {draft.hashtags.map((t, i) => <span key={i} style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: 'var(--purple-light)', color: 'var(--purple)' }}>{t.startsWith('#') ? t : `#${t}`}</span>)}
              </div>
            </div>

            {/* KEYWORDS */}
            {draft.keywords?.length > 0 && (
              <div>
                <p style={label}>Keywords (SEO / discovery)</p>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{draft.keywords.join(' · ')}</p>
              </div>
            )}

            {/* SCRIPT */}
            {draft.script && (
              <div>
                <p style={label}>Script (say this / voiceover)</p>
                <div style={{ ...box, fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{draft.script}</div>
              </div>
            )}

            {/* FOOTAGE / B-ROLL */}
            {draft.footage?.length > 0 && (
              <div>
                <p style={label}>Footage &amp; B-roll to intercut</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {draft.footage.map((f, i) => (
                    <div key={i} style={{ ...box, display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 11px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', padding: '2px 7px', borderRadius: '20px', background: 'var(--purple-light)', color: 'var(--purple)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '1px' }}>{f.type || 'b-roll'}</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.45 }}>{f.shot}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TRANSCRIPT */}
            <div>
              <button onClick={() => setShowTx(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '5px', ...label, marginBottom: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {showTx ? <ChevronUp size={12} /> : <ChevronDown size={12} />} The words you said (transcript)
              </button>
              {showTx && <div style={{ ...box, marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, maxHeight: '180px', overflowY: 'auto' }}>{draft.transcript}</div>}
            </div>
          </div>
        )}

        {/* REGENERATE + TITLE-FIRST */}
        {draft && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border)', paddingTop: '13px' }}>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Tell RISE what to change, then Regenerate (e.g. 'punchier hook', 'less formal', 'lead with the tab story')…" rows={2}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => redraft({ feedback: feedback.trim() || undefined })} disabled={regen}
                className="rise-tactile" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 140px', justifyContent: 'center', padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: regen ? 'default' : 'pointer' }}>
                {regen ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />} {feedback.trim() ? 'Regenerate with feedback' : 'Try again'}
              </button>
              <button onClick={() => redraft({ titleFirst: true })} disabled={regen}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--purple)', background: 'var(--surface)', color: 'var(--purple)', fontWeight: 700, fontSize: '12px', cursor: regen ? 'default' : 'pointer' }}>
                <Wand2 size={13} /> Title as first line
              </button>
            </div>
          </div>
        )}

        {/* SAVE */}
        {draft && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={account} onChange={e => setAccount(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>
                <option value="">Choose account (or assign later)</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.handle}</option>)}
              </select>
              <button onClick={save} disabled={saving} className="rise-tactile"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#2E8B60', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: saving ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Save post
              </button>
            </div>
            {saved && <p style={{ fontSize: '11.5px', fontWeight: 600, color: saved.startsWith('✓') ? '#2E8B60' : '#E05252', lineHeight: 1.4 }}>{saved}</p>}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
