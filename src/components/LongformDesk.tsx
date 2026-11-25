'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import CoraInterview from './CoraInterview'

// Story tab, top: the long-form desks (Phase 6b).
//   Story desk (Loop 11): Cap sends a story to Cora → Owl + Ten → Cora outlines → Pod → Ed → Cap dates → you approve.
//   Substack (Loop 13): ONE Substack, WFH. Cap's backlog series from the build history → Biz + Cap → Pod → Ed → you approve and publish it yourself.
//   Ready to send (Loop 15): finished work Cap found in Notes that already serves a goal.
// Agents propose and draft; nothing here publishes or sends.

type Ed = { verdict: 'pass' | 'sent_back' | 'let_through'; reasons: string[]; notes: string[]; round: number }
type Draft = { title: string; subtitle?: string; body: string }
type Story = { id: string; title: string; goal: string; branch: string; status: string; outline?: { take: string; headline: string; beats: string[]; emphasis: string; form: string } | null; facts?: { solid: string[]; uncertain: string[]; live: boolean } | null; angle?: { open: string; live: boolean } | null; draft?: Draft | null; ed?: Ed | null; date?: string | null; date_note?: string | null; kill_reason?: string | null }
type Issue = { n: number; title: string; turn: string; lesson: string; parenting: string | null; status: string; biz_angle?: string | null; outline?: { beats: string[]; date_note: string } | null; draft?: Draft | null; ed?: Ed | null; published_url?: string | null }
type Sub = { account_id: string; cadence: string | null; history_note_ids: number[]; series_status: string; series_summary?: string; issues: Issue[] }
type Reuse = { id: string; note_id: number; note_title: string; goal: string; who_for: string; by_when: string | null; kind: string; why: string; status: string; ed?: Ed | null; replies?: { text: string }[] }

const STATUS: Record<string, string> = { forming: 'Cora is forming it', outlined: 'Outlined', writing: 'Pod is writing', checking: 'Ed is checking', ready: 'Ready for your approval', approved: 'Approved', killed: 'Didn’t hold / parked', split: 'Split into separate stories', failed: 'Failed (retry in Activity)', proposed: 'Proposed', outlining: 'Biz + Cap are outlining', published: 'Published' }
const post = (url: string, body: unknown, method = 'POST') => fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup.' }))

function EdLine({ ed }: { ed?: Ed | null }) {
  if (!ed) return null
  const t = ed.verdict === 'pass' ? `✓ Ed passed it (check ${ed.round})` : ed.verdict === 'let_through' ? `✓ Ed let it through after ${ed.round - 1} rewrites` : `↩ Ed sent it back (check ${ed.round})`
  return <p className="lf-ed">{t}{ed.notes.length ? <><br />Ed noticed: {ed.notes.join(' · ')}</> : null}</p>
}
function DraftView({ d }: { d?: Draft | null }) {
  const [open, setOpen] = useState(false)
  if (!d) return null
  return <div className="lf-draft"><button type="button" className="lf-link" onClick={() => setOpen(x => !x)}>{open ? 'Hide draft' : `Read the draft: “${d.title}”`}</button>{open && <div className="lf-body"><b>{d.title}</b>{d.subtitle && <i>{d.subtitle}</i>}<p>{d.body}</p></div>}</div>
}

export default function LongformDesk() {
  const [tab, setTab] = useState<'story' | 'substack' | 'reuse'>('story')
  const [stories, setStories] = useState<Story[]>([])
  const [sub, setSub] = useState<Sub | null>(null)
  const [reuse, setReuse] = useState<Reuse[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const [form, setForm] = useState({ text: '', goal: '', campaign: '', branch: 'joyful_media' })
  const [hist, setHist] = useState('')
  const [cad, setCad] = useState('')

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([fetch('/api/stories').then(r => r.json()).catch(() => null), fetch('/api/substack').then(r => r.json()).catch(() => null), fetch('/api/sweep').then(r => r.json()).catch(() => null)])
    if (a?.stories) setStories(a.stories); if (b) setSub(b); if (c?.proposals) setReuse(c.proposals)
  }, [])
  useEffect(() => { load() }, [load])
  const working = stories.some(s => ['forming', 'writing', 'checking'].includes(s.status)) || (sub?.issues ?? []).some(i => ['outlining', 'writing', 'checking'].includes(i.status))
  useEffect(() => { if (!working) return; const t = setInterval(load, 5000); return () => clearInterval(t) }, [working, load])

  const act = async (key: string, url: string, body: unknown, method = 'POST', ok = '') => {
    setBusy(key); setMsg('')
    const r = await post(url, body, method)
    setBusy(''); setMsg(r?.error ? r.error : ok)
    load()
    return r
  }

  return (
    <div className="lf">
      <style>{css}</style>
      <div className="lf-tabs">
        {([['story', 'Story desk'], ['substack', 'Substack (WFH)'], ['reuse', `Ready to send${reuse.filter(r => r.status === 'ready').length ? ` · ${reuse.filter(r => r.status === 'ready').length}` : ''}`]] as const).map(([k, l]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {msg && <p className="lf-msg">{msg}</p>}

      {tab === 'story' && (
        <>
          <CoraInterview />
          <div className="lf-row"><button type="button" disabled={busy === 'find'} onClick={() => act('find', '/api/stories', { action: 'find' }, 'POST', 'Cora is reading your captions (a few minutes). Her story ideas will land in Approve.')}>{busy === 'find' ? <Loader2 size={12} className="spin" /> : null} Cora: find stories in my captions</button><span className="lf-d">She reads all your captions in the Well and pitches 6–8 stories with clickable headlines.</span></div>
          <p className="lf-s">Cap sends a story to Cora with the goal it serves. Cora untangles it, checks facts with Owl and the open angle with Ten, and outlines it. Pod writes it (Medium for Joyful Media, teleprompter for either), Ed checks it, Cap dates it, you approve.</p>
          <div className="lf-form">
            <textarea rows={4} placeholder="The story, as you'd tell it (several tangled together is fine)" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} />
            <div className="lf-row">
              <input placeholder="Goal it serves" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} />
              <input placeholder="Campaign (optional)" value={form.campaign} onChange={e => setForm({ ...form, campaign: e.target.value })} />
              <select value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}><option value="joyful_media">Joyful Media</option><option value="wfh">WFH</option></select>
              <button type="button" disabled={busy === 'send'} onClick={async () => { const r = await act('send', '/api/stories', form, 'POST', 'Sent to Cora.'); if (!r?.error) setForm({ ...form, text: '' }) }}>{busy === 'send' ? <Loader2 size={12} className="spin" /> : null} Cap: send to Cora</button>
            </div>
          </div>
          {stories.map(s => (
            <div key={s.id} className="lf-card">
              <div className="lf-top"><b>{s.outline?.headline || s.title}</b><span className={`lf-st ${s.status}`}>{STATUS[s.status] ?? s.status}</span></div>
              <p className="lf-d">Goal: {s.goal} · {s.branch === 'wfh' ? 'WFH' : 'Joyful Media'}{s.outline ? ` · ${s.outline.form === 'medium' ? 'Medium article' : 'Teleprompter'}` : ''}</p>
              {s.kill_reason && <p className="lf-d">Why: {s.kill_reason}</p>}
              {s.outline && <p className="lf-d"><b>The take:</b> {s.outline.take}<br /><b>Emphasis:</b> “{s.outline.emphasis}”</p>}
              {(s.facts || s.angle) && <p className="lf-d">Owl: {s.facts?.solid.length ?? 0} solid, {s.facts?.uncertain.length ?? 0} uncertain{s.facts && !s.facts.live ? ' (not checked live)' : ''} · Ten’s open angle: {s.angle?.open || '—'}</p>}
              <DraftView d={s.draft} />
              <EdLine ed={s.ed} />
              {s.date_note && <p className="lf-d">{s.date ? `📅 ${s.date} · ` : ''}{s.date_note}</p>}
              {s.status === 'ready' && (
                <div className="lf-row">
                  <button type="button" onClick={() => act(s.id, '/api/stories', { id: s.id, action: 'approve' }, 'PATCH', 'Approved.')}>Approve</button>
                  <button type="button" className="ghost" onClick={() => { const reason = prompt('Why park it? (goes to Notes with it)') ?? ''; if (reason) act(s.id, '/api/stories', { id: s.id, action: 'kill', reason }, 'PATCH', 'Parked in Notes.') }}>Park it</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'substack' && sub && (
        <>
          <p className="lf-s">ONE Substack, on WFH: an honest build-in-public report for moms who want to use AI to make money. Built from the build history, never from scratch. The only call to action is the AI Mom podcast. You publish it yourself.</p>
          <div className="lf-row">
            <span className="lf-d">Account card: {sub.account_id ? `${sub.account_id} (WFH)` : 'not set up'}</span>
            {!sub.account_id && <button type="button" onClick={() => act('acct', '/api/substack', { action: 'ensure_account' }, 'POST', 'Substack card set up under WFH.')}>Set up the Substack card</button>}
            <span className="lf-d">· How often: {sub.cadence ?? 'not set (your call; nothing gets a date until you say)'}</span>
            <input style={{ maxWidth: 160 }} placeholder="e.g. every Friday" value={cad} onChange={e => setCad(e.target.value)} />
            <button type="button" className="ghost" onClick={() => act('cad', '/api/substack', { action: 'cadence', cadence: cad }, 'POST', 'Cadence saved.')}>Save</button>
          </div>
          <details className="lf-hist"><summary>Build history Cap mines ({sub.history_note_ids.length} note{sub.history_note_ids.length === 1 ? '' : 's'} loaded)</summary>
            <textarea rows={4} placeholder="Paste build history (audit sections, the build log, git log…). It's saved to Notes tagged build-history." value={hist} onChange={e => setHist(e.target.value)} />
            <button type="button" onClick={async () => { const r = await act('hist', '/api/substack', { action: 'load_history', text: hist }, 'POST', 'Loaded into Notes.'); if (!r?.error) setHist('') }}>Load it</button>
          </details>
          <div className="lf-row">
            {!sub.issues.some(i => i.status !== 'proposed') && <button type="button" disabled={busy === 'series'} onClick={() => act('series', '/api/substack', { action: 'propose_series' }, 'POST', 'Cap is mining the build history…')}>{sub.series_status === 'none' ? 'Cap: propose the backlog series' : 'Cap: propose it again'}</button>}
            {sub.series_status === 'proposed' && <button type="button" onClick={() => act('ok', '/api/substack', { action: 'approve_series' }, 'POST', 'Series approved.')}>Approve the series</button>}
            <span className="lf-d">Series: {sub.series_status}</span>
          </div>
          {sub.series_summary && <p className="lf-d">{sub.series_summary}</p>}
          {sub.issues.map(i => (
            <div key={i.n} className="lf-card">
              <div className="lf-top"><b>{i.n}. {i.title}</b><span className={`lf-st ${i.status}`}>{STATUS[i.status] ?? i.status}</span></div>
              <p className="lf-d"><b>Turn:</b> {i.turn}<br /><b>Lesson:</b> {i.lesson}<br /><b>Parenting moment:</b> {i.parenting ?? 'none yet (only you have these)'}{' '}
                <button type="button" className="lf-link" onClick={() => { const p = prompt('Your parenting moment for this issue (your words; no kids’ names):', i.parenting ?? ''); if (p !== null) act(`p${i.n}`, '/api/substack', { action: 'edit_issue', n: i.n, parenting: p }, 'POST', 'Saved.') }}>add yours</button></p>
              {i.biz_angle && <p className="lf-d"><b>Biz:</b> {i.biz_angle}</p>}
              {i.outline && <p className="lf-d">{i.outline.date_note}</p>}
              <DraftView d={i.draft} />
              <EdLine ed={i.ed} />
              <div className="lf-row">
                {sub.series_status === 'approved' && i.status === 'proposed' && <button type="button" disabled={busy === `o${i.n}`} onClick={() => act(`o${i.n}`, '/api/substack', { action: 'outline', n: i.n }, 'POST', 'Biz and Cap are outlining it…')}>Biz + Cap: outline it</button>}
                {i.status === 'ready' && <button type="button" onClick={() => act(`a${i.n}`, '/api/substack', { action: 'approve_issue', n: i.n }, 'POST', 'Approved. Publish it on Substack yourself, then mark it here.')}>Approve</button>}
                {i.status === 'approved' && <button type="button" onClick={() => { const url = prompt('Link to the published issue:') ?? ''; act(`u${i.n}`, '/api/substack', { action: 'published', n: i.n, url }, 'POST', 'Marked published.') }}>I published it</button>}
                {i.status === 'published' && <button type="button" className="ghost" onClick={() => { const text = prompt('A reply or signup that came in:') ?? ''; if (text) act(`r${i.n}`, '/api/substack', { action: 'response', n: i.n, kind: /sign/i.test(text) ? 'signup' : 'reply', text }, 'POST', 'Passed to Cap and Biz.') }}>Log a reply / signup</button>}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'reuse' && (
        <>
          <p className="lf-s">Finished work Cap found in Notes that already serves a goal on the map. Ed checked each one. You send it yourself and mark it sent; replies go back to Cap. Cap never puts it on the plan from here.</p>
          <div className="lf-row"><button type="button" disabled={busy === 'sweep'} onClick={() => act('sweep', '/api/sweep', {}, 'POST', 'Cap is sweeping Notes…')}>Cap: sweep Notes now</button></div>
          {reuse.filter(r => r.status !== 'dismissed').map(r => (
            <div key={r.id} className="lf-card">
              <div className="lf-top"><b>{r.note_title}</b><span className={`lf-st ${r.status}`}>{r.status === 'ready' ? 'Ready for you to send' : r.status === 'sent' ? 'Sent' : 'Ed is checking'}</span></div>
              <p className="lf-d">Goal: {r.goal} · To: {r.who_for}{r.by_when ? ` · By ${r.by_when}` : ''} · {r.kind}<br />Why: {r.why}</p>
              <EdLine ed={r.ed} />
              {(r.replies ?? []).map((x, k) => <p key={k} className="lf-d">↩ {x.text}</p>)}
              <div className="lf-row">
                {r.status === 'ready' && <><button type="button" onClick={() => act(r.id, '/api/sweep', { id: r.id, action: 'sent' }, 'PATCH', 'Marked sent. Cap watches for replies.')}>I sent it</button><button type="button" className="ghost" onClick={() => act(r.id, '/api/sweep', { id: r.id, action: 'dismiss' }, 'PATCH', 'Set aside.')}>Not now</button></>}
                {r.status === 'sent' && <button type="button" className="ghost" onClick={() => { const text = prompt('What did they say?') ?? ''; if (text) act(r.id, '/api/sweep', { id: r.id, action: 'reply', text }, 'PATCH', 'Passed to Cap.') }}>Log a reply</button>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const css = `
.lf{display:flex;flex-direction:column;gap:10px;border:1px solid var(--border,#E7E1D6);border-radius:16px;background:var(--surface,#fff);padding:14px 16px}
.lf button{font-family:inherit}
.lf-tabs{display:flex;gap:4px;flex-wrap:wrap}
.lf-tabs button{border:1px solid var(--border,#E7E1D6);background:none;color:var(--text);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:800;cursor:pointer}
.lf-tabs button.on{background:#5A4FCF;border-color:#5A4FCF;color:#fff}
.lf-s{margin:0;font-size:12px;color:var(--text-subtle)}
.lf-msg{margin:0;font-size:12px;color:#5A4FCF;font-weight:700}
.lf-form{display:flex;flex-direction:column;gap:6px}
.lf textarea,.lf input,.lf select{font:inherit;font-size:12.5px;color:var(--text);border:1px solid var(--border,#E7E1D6);border-radius:9px;padding:6px 9px;background:var(--bg,#fff);box-sizing:border-box}
.lf textarea{width:100%;resize:vertical}
.lf-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.lf-row input{flex:1;min-width:140px}
.lf-row button,.lf-hist button{display:inline-flex;align-items:center;gap:5px;border:0;background:#5A4FCF;color:#fff;border-radius:999px;padding:6px 13px;font-size:12px;font-weight:800;cursor:pointer}
.lf-row button.ghost{background:none;color:var(--text);border:1px solid var(--border,#E7E1D6)}
.lf-row button:disabled{opacity:.5}
.lf-card{border-top:1px solid var(--border,#E7E1D6);padding-top:8px;display:flex;flex-direction:column;gap:4px}
.lf-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;font-size:13px;color:var(--text)}
.lf-st{font-size:10.5px;font-weight:800;border-radius:999px;padding:2px 8px;background:#F4EEE3;color:#8A6A3A;white-space:nowrap}
.lf-st.ready{background:#E3F4EA;color:#2F7A4F}
.lf-st.approved,.lf-st.published,.lf-st.sent{background:#E6E4FA;color:#4B3FB0}
.lf-st.killed,.lf-st.failed{background:#F8E4E6;color:#9A2F3C}
.lf-d{margin:0;font-size:12px;color:var(--text-subtle);line-height:1.5}
.lf-ed{margin:0;font-size:12px;color:#2F7A4F}
.lf-link{all:unset;cursor:pointer;font-size:12px;font-weight:700;color:#7C4DDB}
.lf-body{display:flex;flex-direction:column;gap:4px;margin-top:4px;padding:10px;border-radius:10px;background:var(--surface-raised,#F4F1EC);font-size:13px;color:var(--text)}
.lf-body p{margin:0;white-space:pre-wrap;line-height:1.55}
.lf-hist summary{cursor:pointer;font-size:12px;font-weight:700;color:var(--text)}
.lf-hist{display:flex;flex-direction:column;gap:6px}
.spin{animation:spin 1s linear infinite}
`
