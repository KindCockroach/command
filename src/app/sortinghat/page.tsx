'use client'

import { useState } from 'react'

// Watch the Sorting Hat agent think: drop a raw brain-dump, hit Sort, and see
// every decision + tool call it makes, then the drafts it proposed (all
// propose-only — nothing publishes). Internal page, gated by middleware.

type TraceStep =
  | { type: 'thinking'; text: string }
  | { type: 'action'; tool: string; input: unknown; result: string }
  | { type: 'done'; summary: string }
type CreatedItem = { id: number; status: string; account_id: string | null; title: string }
type Result = { summary: string; trace: TraceStep[]; created: CreatedItem[] }

const TOOL_LABEL: Record<string, string> = {
  search_past_posts: '🔍 Searched past posts',
  get_account_voice: '🎙️ Pulled account voice',
  create_post_card: '✍️ Drafted a post-card',
  park_idea: '🅿️ Parked an idea',
}

export default function SortingHatPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle')
  const [error, setError] = useState('')

  async function run() {
    if (!input.trim()) return
    setStatus('running')
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/agents/sorting-hat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setResult(data as Result)
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <main className="sh">
      <style>{css}</style>
      <div className="wrap">
        <p className="eyebrow">RISE · AUTONOMOUS AGENT</p>
        <h1>The Sorting Hat</h1>
        <p className="sub">Drop a raw brain-dump. It decides what to do — searches for duplicates, picks the
          account, drafts a post-card, or parks an idea that needs more from you. It only ever
          <strong> proposes</strong>; nothing publishes.</p>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. Today my 3yo had a total meltdown at the store and I realized I do the same thing when I'm overwhelmed — I just hide it better…"
          rows={5}
        />
        <button className="go" onClick={run} disabled={status === 'running' || !input.trim()}>
          {status === 'running' ? 'Sorting…' : 'Sort it →'}
        </button>

        {status === 'error' && <p className="err">{error}</p>}

        {result && (
          <div className="out">
            <h2>What it did</h2>
            <p className="summary">{result.summary}</p>

            {result.created.length > 0 && (
              <div className="created">
                <h3>Drafts to review</h3>
                <ul>
                  {result.created.map(c => (
                    <li key={c.id}>
                      <span className={`badge ${c.status}`}>{c.status === 'held' ? 'PARKED' : 'DRAFT'}</span>
                      <span className="ct">{c.title}</span>
                      <span className="cacc">{c.account_id || 'unassigned'}</span>
                      <span className="cid">#{c.id}</span>
                    </li>
                  ))}
                </ul>
                <a className="link" href="/station">Open the queue to review →</a>
              </div>
            )}

            <h3>Its thinking, step by step</h3>
            <ol className="trace">
              {result.trace.map((s, i) => {
                if (s.type === 'thinking') return <li className="t-think" key={i}>{s.text}</li>
                if (s.type === 'done') return <li className="t-done" key={i}>✅ {s.summary}</li>
                return (
                  <li className="t-act" key={i}>
                    <span className="tlabel">{TOOL_LABEL[s.tool] || s.tool}</span>
                    <code className="tin">{JSON.stringify(s.input)}</code>
                    <span className="tres">{s.result}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
    </main>
  )
}

const css = `
.sh { --midnight:#171C3A; --nebula:#5A4FCF; --ember:#F2A65A; --pink:#D98AB7; --light:#F5EFE6;
  background:var(--midnight); color:#e7e2f2; min-height:100vh; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.55; }
.sh .wrap { max-width:760px; margin:0 auto; padding:40px 22px 90px; }
.sh .eyebrow { letter-spacing:3px; font-size:12px; font-weight:700; color:var(--ember); margin:0; }
.sh h1 { font-family:Georgia,serif; font-size:34px; color:#fff; margin:6px 0 10px; }
.sh .sub { font-size:17px; color:#c9c3e4; margin:0 0 22px; }
.sh .sub strong { color:#fff; }
.sh textarea { width:100%; box-sizing:border-box; background:#20204a; border:1px solid #2c2a52; border-radius:14px;
  color:#fff; font-size:16px; font-family:inherit; padding:16px; resize:vertical; }
.sh textarea:focus { outline:none; border-color:var(--ember); box-shadow:0 0 0 3px rgba(242,166,90,.3); }
.sh .go { margin-top:14px; background:var(--ember); color:var(--midnight); font-weight:800; font-size:17px;
  border:none; border-radius:999px; padding:14px 30px; cursor:pointer; }
.sh .go:disabled { opacity:.55; cursor:default; }
.sh .err { color:#ffd7c2; background:#3a1f1f; border:1px solid #6a3030; border-radius:10px; padding:12px 14px; margin-top:16px; }
.sh h2 { font-family:Georgia,serif; color:#fff; font-size:22px; margin:34px 0 10px; }
.sh h3 { font-size:13px; letter-spacing:1px; text-transform:uppercase; color:var(--ember); margin:26px 0 10px; }
.sh .summary { font-size:18px; color:#fff; background:#20204a; border-left:4px solid var(--ember); border-radius:10px; padding:14px 16px; }
.sh .created ul { list-style:none; padding:0; margin:0; }
.sh .created li { display:flex; align-items:center; gap:10px; padding:10px 0; border-top:1px solid #26264e; font-size:15px; }
.sh .created li:first-child { border-top:none; }
.sh .badge { font-size:11px; font-weight:800; letter-spacing:.5px; padding:3px 8px; border-radius:6px; }
.sh .badge.in_progress { background:#1c3324; color:#bfe6c9; }
.sh .badge.held { background:#33231f; color:#e6c2b5; }
.sh .ct { font-weight:600; color:#fff; flex:1; }
.sh .cacc { font-family:ui-monospace,monospace; font-size:12px; color:#a9a3c7; }
.sh .cid { font-family:ui-monospace,monospace; font-size:12px; color:#6f6a90; }
.sh .link { display:inline-block; margin-top:12px; color:var(--ember); font-weight:700; text-decoration:none; }
.sh .trace { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
.sh .trace li { border-radius:12px; padding:12px 14px; font-size:14px; }
.sh .t-think { background:#1b1b3d; color:#c9c3e4; font-style:italic; }
.sh .t-act { background:#20204a; border:1px solid #2c2a52; display:flex; flex-direction:column; gap:6px; }
.sh .tlabel { font-weight:800; color:#fff; }
.sh .tin { font-family:ui-monospace,monospace; font-size:12px; color:#8f8ab0; word-break:break-word; }
.sh .tres { color:#bfe6c9; white-space:pre-wrap; }
.sh .t-done { background:#1c3324; color:#dff3e6; font-weight:600; }
`
