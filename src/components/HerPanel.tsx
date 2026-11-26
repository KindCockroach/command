'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send, Plus } from 'lucide-react'
import DictateButton from './DictateButton'
import { HandoffItem, type HandoffRow } from './HandoffList'
import ManReport from './ManReport'
import GrowBox from './GrowBox'

// Her, the front door. Say or type it; Her works out what you mean, saves your words to
// Notes as they are, and hands it to Commander, Cap or the build log with a receipt.
// Every conversation stays here, so you can come back and pick it up without repeating it.

type Turn = { role: 'mandi' | 'her'; text: string; at: string; handoff_ids?: string[]; spoken?: boolean }
type Outcome = { id: string; kind: string; from: string; to: string; what: string; state: HandoffRow['state']; receipt: string | null; error: string | null; can_retry: boolean; content_id: number | null; created_at: string; updated_at: string; attempts?: number }
type Thread = { id: string; title: string; turns: Turn[]; questions: { id: string; text: string; answered?: boolean }[]; updated_at: string; outcome: Outcome[] }

const KEY = 'rise-her-thread'

export default function HerPanel() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [cur, setCur] = useState<Thread | null>(null)
  const [text, setText] = useState('')
  const [spoken, setSpoken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const end = useRef<HTMLDivElement>(null)

  const loadList = useCallback(async () => {
    const d = await fetch('/api/her').then(r => r.json()).catch(() => null)
    if (d?.threads) setThreads(d.threads)
    return (d?.threads ?? []) as Thread[]
  }, [])
  const open = useCallback(async (id: string) => {
    const d = await fetch(`/api/her?id=${encodeURIComponent(id)}`).then(r => r.json()).catch(() => null)
    if (d?.thread) { setCur(d.thread); try { localStorage.setItem(KEY, id) } catch { /* private mode */ } }
  }, [])
  useEffect(() => {
    loadList().then(list => {
      let last: string | null = null
      try { last = localStorage.getItem(KEY) } catch { /* private mode */ }
      if (last && list.some(t => t.id === last)) open(last)
    })
  }, [loadList, open])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [cur?.turns.length])
  // Commander reads a handed-over note after Her answers; keep the thread fresh until he's done.
  const working = cur?.outcome.some(o => o.state === 'open')
  useEffect(() => {
    if (!working || !cur) return
    const t = setInterval(() => open(cur.id), 4000)
    return () => clearInterval(t)
  }, [working, cur, open])

  const send = async () => {
    const t = text.trim(); if (!t) return
    setBusy(true); setErr('')
    const d = await fetch('/api/her', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t, thread_id: cur?.id ?? null, spoken }) }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup. Your words are still here; send again.' }))
    setBusy(false)
    if (d.error) { setErr(d.error); return }
    setText(''); setSpoken(false)
    setCur(d.thread); try { localStorage.setItem(KEY, d.thread.id) } catch { /* private mode */ }
    loadList()
  }
  const fresh = () => { setCur(null); try { localStorage.removeItem(KEY) } catch { /* private mode */ } }

  const openQs = cur?.questions.filter(q => !q.answered) ?? []
  const byId = new Map((cur?.outcome ?? []).map(o => [o.id, o]))

  return (
    <div className="her">
      <style>{css}</style>
      <div className="her-head">
        <div>
          <p className="her-t">Her</p>
          <p className="her-s">Say it messy. I’ll work out what you mean and hand it to the right agent.</p>
        </div>
        {cur && <button type="button" className="her-new" onClick={fresh}><Plus size={13} /> New</button>}
      </div>

      {/* Phase 6: Man's report — what needs you from the health check, and the agents' ideas. */}
      {!cur && <ManReport />}

      {!cur && threads.length > 0 && (
        <div className="her-threads">
          <p className="her-h">Pick up where you left off</p>
          {threads.slice(0, 5).map(t => {
            const bad = t.outcome.filter(o => o.state === 'failed' || o.state === 'stuck').length
            const q = t.questions.filter(x => !x.answered).length
            return (
              <button key={t.id} type="button" className="her-th" onClick={() => open(t.id)}>
                <b>{t.title}</b>
                <span>{t.turns.length} turn{t.turns.length === 1 ? '' : 's'}{q ? ` · ${q} question${q > 1 ? 's' : ''} for you` : ''}{bad ? ` · ⚠ ${bad} need${bad > 1 ? '' : 's'} a look` : ''}</span>
              </button>
            )
          })}
        </div>
      )}

      {cur && (
        <div className="her-log">
          {cur.turns.map((t, i) => (
            <div key={i} className={`her-msg ${t.role}`}>
              <div className="her-b">{t.spoken ? '🎙 ' : ''}{t.text}</div>
              {(t.handoff_ids ?? []).map(id => { const o = byId.get(id); return o ? <HandoffItem key={id} h={o} onChanged={() => open(cur.id)} /> : null })}
            </div>
          ))}
          {cur.outcome.filter(o => o.from !== 'her').length > 0 && (
            <div className="her-out">
              <p className="her-h">What came of it</p>
              {cur.outcome.filter(o => o.from !== 'her').map(o => <HandoffItem key={o.id} h={o} onChanged={() => open(cur.id)} />)}
            </div>
          )}
          {openQs.length > 0 && (
            <div className="her-q">
              <p className="her-h">Commander asks</p>
              {openQs.map(q => <p key={q.id}>{q.text}</p>)}
              <p className="her-s">Answer here and I’ll pass it back.</p>
            </div>
          )}
          <div ref={end} />
        </div>
      )}

      <div className="her-in">
        <GrowBox value={text} rows={2} maxHeight={260} placeholder={cur ? 'Keep going…' : 'What’s on your mind?'} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} />
        <div className="her-row">
          <DictateButton title="Talk to Her" onText={t => setText(x => (x ? x + ' ' : '') + t)} onSpoken={() => setSpoken(true)} />
          <button type="button" className="her-send" disabled={busy || !text.trim()} onClick={send}>
            {busy ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Thinking…</> : <><Send size={14} /> Send</>}
          </button>
        </div>
        {err && <p className="her-err">{err}</p>}
      </div>
    </div>
  )
}

const css = `
.her{display:flex;flex-direction:column;gap:10px;border:1px solid var(--border,#E7E1D6);border-radius:16px;background:var(--surface,#fff);padding:14px 15px;min-width:0}
.her button{font-family:inherit}
.her-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.her-t{margin:0;font-size:16px;font-weight:600;color:var(--text)}
.her-s{margin:2px 0 0;font-size:12px;color:var(--text-subtle)}
.her-new{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border,#E7E1D6);background:none;color:var(--text);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:600;cursor:pointer}
.her-h{margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle)}
.her-threads{display:flex;flex-direction:column;gap:6px}
.her-th{all:unset;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;padding:9px 11px;border:1px solid var(--border,#E7E1D6);border-radius:11px;cursor:pointer;font-size:12px;color:var(--text)}
.her-th span{font-size:12px;color:var(--text-subtle)}
.her-th:hover{border-color:#7C4DDB}
.her-log{display:flex;flex-direction:column;gap:9px;max-height:420px;overflow-y:auto}
.her-msg{display:flex;flex-direction:column;gap:5px;max-width:88%}
.her-msg.mandi{align-self:flex-end}
.her-msg.her{align-self:flex-start}
.her-b{padding:9px 12px;border-radius:13px;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
.her-msg.mandi .her-b{background:#7C4DDB;color:#fff;border-bottom-right-radius:4px}
.her-msg.her .her-b{background:var(--surface-raised,#F4F1EC);color:var(--text);border-bottom-left-radius:4px}
.her-out,.her-q{display:flex;flex-direction:column;gap:6px;border-top:1px dashed var(--border,#E7E1D6);padding-top:8px}
.her-q p{margin:0;font-size:14px;color:var(--text)}
.her-in{display:flex;flex-direction:column;gap:6px}
.her-in textarea{font:inherit;font-size:14px;line-height:1.45;color:var(--text);background:var(--bg,#fff);border:1px solid var(--border,#E7E1D6);border-radius:12px;padding:9px 11px;resize:vertical;width:100%;box-sizing:border-box}
.her-row{display:flex;gap:6px;justify-content:space-between;align-items:center;flex-wrap:wrap}
.her-send{display:inline-flex;align-items:center;gap:6px;border:0;background:#7C4DDB;color:#fff;border-radius:999px;padding:8px 16px;font-size:14px;font-weight:600;cursor:pointer}
.her-send:disabled{opacity:.45;cursor:default}
.her-err{margin:0;font-size:12px;color:var(--bad)}
`
