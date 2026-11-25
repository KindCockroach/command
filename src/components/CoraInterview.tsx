'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Story desk: Cora interviews you for Medium (lived experience for people struggling with loss,
// depression, anxiety). She reads your captions into a notebook, asks one question at a time,
// marks the charged points in your words, then shapes the stories (they wait in Approve).

type Note = { id: string; theme: string; question: string; status: string }
type Turn = { role: 'cora' | 'mandi'; text: string; at: string; followup?: boolean; note_id?: string | null }
type Point = { id: string; theme: string; point: string; her_words: string }
type Iv = { id: string; status: string; notebook: Note[]; turns: Turn[]; charged: Point[]; error?: string | null; pitch_ids: string[] }

const post = (body: unknown) => fetch('/api/interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup.' }))

export default function CoraInterview() {
  const [iv, setIv] = useState<Iv | null>(null)
  const [said, setSaid] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/interview').then(x => x.json()).catch(() => null)
    const latest: Iv | undefined = r?.interviews?.[0]
    setIv(latest ?? null)
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (iv?.status !== 'reading' && iv?.status !== 'shaping') return; const t = setInterval(load, 6000); return () => clearInterval(t) }, [iv?.status, load])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [iv?.turns.length])

  const act = async (key: string, body: Record<string, unknown>, ok = '') => {
    setBusy(key); setMsg('')
    const r = await post(body)
    setBusy('')
    if (r?.error) setMsg(r.error); else { if (ok) setMsg(ok); if (r?.interview) setIv(r.interview) }
    return r
  }
  const send = async () => {
    const text = said.trim(); if (!text || !iv) return
    setSaid('')
    setIv({ ...iv, turns: [...iv.turns, { role: 'mandi', text, at: new Date().toISOString() }] })
    const r = await act('answer', { action: 'answer', id: iv.id, text })
    if (r?.error) setSaid(text)
  }

  const live = iv && (iv.status === 'reading' || iv.status === 'ready' || iv.status === 'shaping')
  const left = iv ? iv.notebook.filter(n => n.status === 'open').length : 0
  const answered = iv ? iv.notebook.filter(n => n.status !== 'off_limits' && iv.turns.some(t => t.role === 'mandi' && t.note_id === n.id)).length : 0

  return (
    <div className="ci">
      <style>{css}</style>
      <div className="ci-head">
        <div>
          <b>Cora’s interview · Medium stories</b>
          <p className="ci-d">Your lived experience, for someone struggling with loss, depression or anxiety. Cora reads your captions like a journalist, then interviews you one question at a time and marks where it’s charged. Skip anything. Nothing publishes.</p>
        </div>
        {!live && <button type="button" className="ci-p" disabled={busy === 'start'} onClick={async () => { await act('start', { action: 'start' }, 'Cora is reading your captions with her notebook open (a few minutes).'); setOpen(true); load() }}>{busy === 'start' ? <Loader2 size={12} className="spin" /> : null} {iv ? 'Start a new interview' : 'Start the interview'}</button>}
        {live && <button type="button" className="ci-g" onClick={() => setOpen(x => !x)}>{open ? 'Hide' : 'Open the interview'}</button>}
      </div>
      {msg && <p className="ci-msg">{msg}</p>}

      {iv && (open || !live) && (
        <>
          {iv.status === 'reading' && <p className="ci-d"><Loader2 size={12} className="spin" /> Cora is reading every caption and filling her notebook…</p>}
          {iv.status === 'failed' && <p className="ci-msg">Cora couldn’t finish: {iv.error ?? 'retry'}.</p>}
          {iv.notebook.length > 0 && <p className="ci-d">Notebook: {iv.notebook.length} questions · {answered} answered · {left} to go · {iv.charged.length} charged point{iv.charged.length === 1 ? '' : 's'}</p>}

          {iv.turns.length > 0 && (
            <div className="ci-thread">
              {iv.turns.map((t, k) => <p key={k} className={`ci-t ${t.role}`}><b>{t.role === 'cora' ? 'Cora' : 'You'}{t.followup ? ' (follow-up)' : ''}:</b> {t.text}</p>)}
              <div ref={end} />
            </div>
          )}

          {iv.status === 'ready' && (
            <>
              <textarea rows={4} placeholder="Answer as long or short as you want. Dictation works (Fn twice on a Mac)." value={said} onChange={e => setSaid(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} />
              <div className="ci-row">
                <button type="button" className="ci-p" disabled={!said.trim() || busy === 'answer'} onClick={send}>{busy === 'answer' ? <Loader2 size={12} className="spin" /> : null} Answer</button>
                <button type="button" className="ci-g" disabled={!!busy} onClick={() => act('skip', { action: 'skip', id: iv.id })}>Skip</button>
                <button type="button" className="ci-g" disabled={!!busy} onClick={() => act('off', { action: 'off_limits', id: iv.id })}>Off limits</button>
                <span className="ci-sp" />
                <button type="button" className="ci-p" disabled={busy === 'shape'} onClick={() => act('shape', { action: 'shape', id: iv.id }, 'Cora is shaping the stories. They’ll land in Approve.')}>{busy === 'shape' ? <Loader2 size={12} className="spin" /> : null} Shape the stories</button>
              </div>
              <p className="ci-d">⌘+Enter sends. If you’re not okay right now, call or text 988.</p>
            </>
          )}
          {iv.status === 'shaping' && <p className="ci-d"><Loader2 size={12} className="spin" /> Cora is shaping Medium pieces from the charged points…</p>}

          {iv.charged.length > 0 && (
            <details className="ci-ch">
              <summary>Charged points ({iv.charged.length})</summary>
              {iv.charged.map(c => <p key={c.id} className="ci-d"><b>{c.theme}</b> · {c.point}<br />“{c.her_words}”</p>)}
            </details>
          )}
        </>
      )}
    </div>
  )
}

const css = `
.ci{display:flex;flex-direction:column;gap:7px;border:1px solid var(--border,#E7E1D6);border-radius:14px;padding:11px 13px;background:var(--surface)}
.ci button{font-family:inherit}
.ci-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
.ci-head b{font-size:14px}
.ci-d{margin:2px 0 0;font-size:12px;color:var(--text-subtle);line-height:1.5}
.ci-msg{margin:0;font-size:12px;font-weight:600;color:var(--link)}
.ci-thread{display:flex;flex-direction:column;gap:7px;max-height:440px;overflow-y:auto;padding:9px 11px;border-radius:11px;background:var(--surface-raised,#F4F1EC)}
.ci-t{margin:0;font-size:14px;line-height:1.55;white-space:pre-wrap}
.ci-t.cora b{color:var(--link)}
.ci-t.mandi b{color:var(--gold)}
.ci textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;border:1px solid var(--border,#E7E1D6);border-radius:9px;padding:7px 9px;background:var(--bg,#fff);color:var(--text);resize:vertical}
.ci-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.ci-sp{flex:1}
.ci-p,.ci-g{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 13px;font-size:12px;font-weight:600;cursor:pointer}
.ci-p{border:0;background:#5A4FCF;color:#fff}
.ci-g{border:1px solid var(--border,#E7E1D6);background:var(--surface);color:var(--text)}
.ci-p:disabled,.ci-g:disabled{opacity:.5}
.ci-ch summary{cursor:pointer;font-size:12px;font-weight:600;color:var(--link)}
`
