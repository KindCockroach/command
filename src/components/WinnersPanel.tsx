'use client'

import { useCallback, useEffect, useState } from 'react'
import { parseMetaExport, guessAccount, type ExportGroup } from '@/lib/metaExport'

// The Winner Loop, retroactive: Mandi posts natively, then pastes the week's
// reel results here (copy the rows from the spreadsheet, headers included).
// RISE scores each reel against that account's typical reel and says what to
// make more of. Internal page, gated by middleware.

type Verdict = 'make_more' | 'rehook' | 'neutral' | 'retire' | 'reupload'
type Scored = {
  id: number; account_id: string; media_id: string; onscreen_text: string; visual: string
  views: number; follows: number; saves: number; shares: number; fb_views: number | null
  pct_from_followers: number | null; content_id: number | null
  platform?: string
  verdict: Verdict; reasons: string[]; engagement_rate: number; keep_per_1k: number; views_vs_median: number; ig_views: number
}
type Account = { id: string; handle?: string; name?: string; status?: string }
type Review = { id: string; account_id: string; platform: string; created_at: string; posts: number; period: string; evidence: string[]; guesses: string[]; missing: string[]; hypothesis: string; experiment: { what: string; how: string; measure: string }; status: 'proposed' | 'in_plan' | 'dismissed'; plan_id?: string | null }

const GROUPS: { verdict: Verdict; title: string; sub: string }[] = [
  { verdict: 'make_more', title: 'Make more of this', sub: 'Beat this account’s typical reel. Re-angle the same pain point with new footage and new words.' },
  { verdict: 'rehook', title: 'Great idea, weak hook', sub: 'People saved or shared it, but few saw it. Keep the line, test a new opening.' },
  { verdict: 'neutral', title: 'Typical', sub: 'Nothing to act on yet.' },
  { verdict: 'retire', title: 'Retire this angle', sub: 'Under typical on views and engagement.' },
  { verdict: 'reupload', title: 'Re-uploads', sub: 'Same text as an earlier reel. Exact re-posts get buried.' },
]

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n)))

export default function WinnersPanel({ embedded = false }: { embedded?: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('mandijoybeck')
  const [results, setResults] = useState<Scored[]>([])
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [capBusy, setCapBusy] = useState(false)

  // Winners go to Cap (Cap 4): he weighs what shipped against how it did, and proposes ONE
  // experiment for the next weekly plan. Nothing becomes a card from here.
  async function askCap(account: string, platform: string): Promise<string | null> {
    const r = await fetch('/api/results/cap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: account, platform }) })
    const d = await r.json().catch(() => ({}))
    return r.ok ? null : (d.error || 'Cap couldn’t weigh them.')
  }
  async function weighNow() {
    setCapBusy(true); setMsg('')
    const plat = results.some(r => r.platform === 'facebook') && !results.some(r => (r.platform ?? 'instagram') === 'instagram') ? 'facebook' : 'instagram'
    const e = await askCap(accountId, plat)
    setCapBusy(false)
    setMsg(e ? `Cap: ${e} (It stays in Activity with Retry.)` : 'Cap weighed them. His read is below.')
    loadReviews(accountId)
  }
  const loadReviews = useCallback(async (id: string) => {
    const d = await fetch(`/api/results/cap?account_id=${encodeURIComponent(id)}`).then(r => r.json()).catch(() => null)
    setReviews(d?.reviews ?? [])
  }, [])
  async function dismiss(id: string) {
    await fetch('/api/results/cap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', id }) })
    loadReviews(accountId)
  }

  const load = useCallback(async (id: string) => {
    const r = await fetch(`/api/results?account_id=${encodeURIComponent(id)}`)
    setResults(r.ok ? await r.json() : [])
  }, [])

  useEffect(() => {
    fetch('/api/accounts').then(r => (r.ok ? r.json() : [])).then((a: Account[]) => {
      const active = a.filter(x => x.status === 'active')
      setAccounts(active)
      // The default id may not exist (handles get renamed) — fall back to the first active account so the picker and the list agree.
      setAccountId(cur => (active.length && !active.some(x => x.id === cur) ? active[0].id : cur))
    }).catch(() => {})
  }, [])
  useEffect(() => { load(accountId); loadReviews(accountId) }, [accountId, load, loadReviews])

  // A dropped/pasted export is parsed first, then shown as one row per account
  // named in the file, each with its RISE account picked (or "skip").
  const [pending, setPending] = useState<{ name: string; kind: string; groups: (ExportGroup & { target: string })[] } | null>(null)
  const [dragging, setDragging] = useState(false)

  function stage(text: string, name: string) {
    const p = parseMetaExport(text)
    if (!p.groups.length) { setMsg('Couldn’t read that. Drop the CSV exactly as Meta Business Suite exports it, or paste rows with a “Reel ID” / “Post ID” header.'); return }
    setMsg('')
    setPending({ name, kind: p.kind, groups: p.groups.map(g => ({ ...g, target: g.source ? guessAccount(g.source, accounts) : accountId })) })
  }

  async function onFiles(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    stage(await f.text(), f.name)
  }

  async function doImport() {
    if (!pending) return
    setBusy(true); setMsg('')
    let added = 0, updated = 0, skippedGroups = 0
    const errors: string[] = []
    for (const g of pending.groups) {
      if (!g.target) { skippedGroups++; continue }
      const r = await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: g.target, platform: g.platform, rows: g.rows }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { errors.push(`${g.source || g.target}: ${d.error || 'import failed'}`); continue }
      added += d.added ?? 0; updated += d.updated ?? 0
    }
    // Hand each imported account to Cap.
    const capErrs: string[] = []
    if (!errors.length) {
      setMsg('Imported. Cap is weighing the results…')
      for (const g of pending.groups) if (g.target) { const e = await askCap(g.target, g.platform); if (e) capErrs.push(`${g.source || g.target}: ${e}`) }
    }
    setBusy(false)
    setMsg(`${capErrs.length ? `Cap couldn’t weigh: ${capErrs.join('; ')} (it stays in Activity with Retry). ` : errors.length ? '' : 'Cap weighed them; his read is below. '}Imported ${added} new and updated ${updated} posts${skippedGroups ? ` · skipped ${skippedGroups} account${skippedGroups === 1 ? '' : 's'} you left on “skip”` : ''}${errors.length ? ` · failed: ${errors.join('; ')}` : ''}.`)
    if (!errors.length) { setPending(null); setPaste('') }
    const first = pending.groups.find(g => g.target)?.target
    if (first && first !== accountId) setAccountId(first)   // show what was just imported
    else { load(accountId); loadReviews(accountId) }
  }

  return (
    <main className={`wl${embedded ? ' emb' : ''}`}>
      <style>{css}</style>
      <div className="wrap">
        <p className="eyebrow">RISE · WINNER LOOP</p>
        <h1>What’s working</h1>
        <p className="sub">Post natively, then drop the week’s Meta export here. RISE scores each reel against this account’s typical reel, then hands the results to Cap. He compares them with what actually shipped and proposes one experiment for next week’s plan.</p>

        <div className="bar">
          <label htmlFor="acct">Account</label>
          <select id="acct" value={accountId} onChange={e => setAccountId(e.target.value)}>
            {(accounts.length ? accounts : [{ id: accountId } as Account]).map(a => (
              <option key={a.id} value={a.id}>{a.handle || a.name || a.id}</option>
            ))}
          </select>
        </div>

        <div
          className={`drop${dragging ? ' on' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
        >
          <p className="dt">Drop this week’s Meta Business Suite export here</p>
          <p className="hint">The Instagram and Facebook CSVs work exactly as Meta exports them. One file can hold several accounts. Re-importing the same posts updates them.</p>
          <label className="pick">Choose a CSV<input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={e => { onFiles(e.target.files); e.target.value = '' }} hidden /></label>
          <details>
            <summary>or paste rows</summary>
            <textarea id="paste" rows={5} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Rows with headers (Reel ID / Post ID, Views, …)" />
            <button className="go" onClick={() => stage(paste, 'pasted rows')} disabled={!paste.trim()}>Read rows</button>
          </details>
        </div>

        {pending && (
          <div className="imp">
            <p className="dt">{pending.name} · {pending.kind === 'facebook' ? 'Facebook videos' : pending.kind === 'instagram' ? 'Instagram posts' : 'rows'}</p>
            {pending.groups.map((g, i) => (
              <div className="bar" key={i}>
                <span className="src">{g.source ? (g.platform === 'facebook' ? g.source : `@${g.source}`) : 'These rows'} · {g.rows.length} post{g.rows.length === 1 ? '' : 's'} →</span>
                <select value={g.target} onChange={e => setPending(p => p && ({ ...p, groups: p.groups.map((x, j) => j === i ? { ...x, target: e.target.value } : x) }))}>
                  <option value="">skip</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.handle || a.name || a.id}</option>)}
                </select>
              </div>
            ))}
            <button className="go" onClick={doImport} disabled={busy || pending.groups.every(g => !g.target)}>{busy ? 'Importing…' : 'Import and score'}</button>
            <button className="ghost" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
          </div>
        )}
        {msg && <p className="msg">{msg}</p>}

        {results.length > 0 && (
          <section className="capread">
            <div className="caphead"><h2>Cap’s read</h2><button className="go" onClick={weighNow} disabled={capBusy}>{capBusy ? 'Cap is weighing…' : reviews.length ? 'Weigh again' : 'Ask Cap to weigh these'}</button></div>
            {reviews.filter(w => w.status !== 'dismissed').slice(0, 2).map(w => (
              <article key={w.id} className="card">
                <p className="meta">{w.platform === 'facebook' ? 'Facebook' : 'Instagram'} · {w.posts} posts · {w.period} · {new Date(w.created_at).toLocaleDateString()}</p>
                <p className="lbl">What the numbers show</p><ul className="why">{w.evidence.map((x, i) => <li key={i}>{x}</li>)}</ul>
                <p className="lbl">Cap’s guesses (not proven)</p><ul className="why">{w.guesses.map((x, i) => <li key={i}>{x}</li>)}</ul>
                {w.missing.length > 0 && <><p className="lbl">What this data can’t tell us</p><ul className="why">{w.missing.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
                <p className="lbl">Hypothesis</p><p className="txt">{w.hypothesis}</p>
                <p className="lbl">Experiment for next week</p><p className="txt">{w.experiment.what}</p>
                {w.experiment.how && <p className="vis">How: {w.experiment.how}</p>}
                {w.experiment.measure && <p className="vis">Measure: {w.experiment.measure}</p>}
                <p className="meta">{w.status === 'in_plan' ? `On the next weekly plan draft (${w.plan_id}) for you to approve.` : 'Proposed. It rides onto this account’s next weekly plan draft; you approve the plan.'}{w.status === 'proposed' && <> · <button className="ghost" onClick={() => dismiss(w.id)}>Set aside</button></>}</p>
              </article>
            ))}
            {!reviews.length && <p className="gsub">Cap hasn’t weighed this account yet.</p>}
          </section>
        )}

        {!results.length && <p className="empty">No results for this account yet. Import a week of reels to start.</p>}

        {GROUPS.map(g => {
          const rows = results.filter(r => r.verdict === g.verdict)
          if (!rows.length) return null
          return (
            <section key={g.verdict} className={`grp ${g.verdict}`}>
              <h2>{g.title} <span>{rows.length}</span></h2>
              <p className="gsub">{g.sub}</p>
              {rows.map(r => (
                <article key={r.id} className="card">
                  <p className="txt">{r.onscreen_text || '(no on-screen text recorded)'}</p>
                  {r.visual && <p className="vis">{r.visual}</p>}
                  <dl>
                    <div><dt>{r.platform === 'facebook' ? 'FB views' : 'IG views'}</dt><dd>{fmt(r.ig_views)}</dd></div>
                    <div><dt>vs typical</dt><dd>{r.views_vs_median.toFixed(1)}×</dd></div>
                    <div><dt>Engagement</dt><dd>{(r.engagement_rate * 100).toFixed(1)}%</dd></div>
                    <div><dt>Saves+shares /1K</dt><dd>{r.keep_per_1k.toFixed(1)}</dd></div>
                    <div><dt>Follows</dt><dd>{r.follows}</dd></div>
                    {r.fb_views !== null && <div><dt>Facebook</dt><dd>{fmt(r.fb_views)}</dd></div>}
                  </dl>
                  {r.reasons.length > 0 && <ul className="why">{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                  <p className="meta">{r.platform === 'facebook' ? 'Facebook video' : 'Post'} {r.media_id}{r.content_id ? ` · matches RISE card #${r.content_id}` : ''}</p>
                </article>
              ))}
            </section>
          )
        })}
      </div>
    </main>
  )
}

const css = `
.wl .capread{margin:18px 0 8px}
.wl .caphead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.wl .lbl{margin:8px 0 2px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#6B6F8A}
.wl{min-height:100vh;background:#F5EFE6;color:#171C3A;font-family:system-ui,-apple-system,sans-serif;padding:32px 16px 64px}
.wl .wrap{max-width:760px;margin:0 auto}
.wl.emb{min-height:0;padding:0;background:transparent}
.wl.emb .wrap{margin:0}
.wl .eyebrow{font-size:12px;letter-spacing:.12em;color:#5A4FCF;margin:0 0 6px}
.wl h1{font-family:Georgia,serif;font-weight:400;font-size:34px;margin:0 0 8px}
.wl .sub{color:#5C5F78;margin:0 0 20px;line-height:1.55}
.wl .bar{display:flex;gap:10px;align-items:center;margin-bottom:14px}
.wl label{font-size:13px;color:#5C5F78}
.wl select{font:inherit;padding:6px 10px;border-radius:8px;border:1px solid #E2D8C8;background:#fff}
.wl .imp{background:#fff;border:1px solid #E2D8C8;border-radius:10px;padding:12px 14px;margin-bottom:12px}
.wl .imp summary{cursor:pointer;font-weight:600}
.wl .drop{background:#fff;border:2px dashed #CFC3AE;border-radius:12px;padding:16px;margin-bottom:12px;transition:border-color .15s,background .15s}
.wl .drop.on{border-color:#5A4FCF;background:#F1EEFF}
.wl .dt{font-weight:600;margin:0 0 4px}
.wl .pick{display:inline-block;cursor:pointer;color:#5A4FCF;font-weight:600;font-size:14px;margin:4px 0 8px}
.wl .src{font-size:13px;flex:1 1 220px;min-width:0;overflow-wrap:anywhere}
.wl .ghost{background:none;border:none;color:#5C5F78;cursor:pointer;font:inherit;margin-left:8px}
.wl .bar{flex-wrap:wrap}
.wl .hint{font-size:13px;color:#5C5F78}
.wl textarea{width:100%;font:13px ui-monospace,Menlo,monospace;border:1px solid #E2D8C8;border-radius:8px;padding:10px;box-sizing:border-box}
.wl .go{margin-top:10px;background:#5A4FCF;color:#fff;border:0;border-radius:8px;padding:9px 16px;font:inherit;font-weight:600;cursor:pointer}
.wl .go:disabled{opacity:.5;cursor:default}
.wl .msg{font-size:14px;color:#2F7D5B}
.wl .empty{color:#5C5F78}
.wl .grp{margin-top:28px}
.wl .grp h2{font-size:18px;margin:0 0 2px;display:flex;gap:8px;align-items:center}
.wl .grp h2 span{font-size:12px;background:#E6E2FA;color:#5A4FCF;border-radius:99px;padding:1px 8px}
.wl .gsub{font-size:13px;color:#5C5F78;margin:0 0 10px}
.wl .card{background:#fff;border:1px solid #E2D8C8;border-left-width:4px;border-radius:10px;padding:14px 16px;margin-bottom:10px}
.wl .make_more .card{border-left-color:#2F7D5B}
.wl .rehook .card{border-left-color:#D98C2B}
.wl .retire .card,.wl .reupload .card{border-left-color:#B23A48;opacity:.85}
.wl .txt{font-size:16px;margin:0 0 4px;line-height:1.45}
.wl .vis{font-size:13px;color:#5C5F78;margin:0 0 10px}
.wl dl{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 8px}
.wl dt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5C5F78}
.wl dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
.wl .why{margin:0 0 6px;padding-left:18px;font-size:13px}
.wl .meta{font-size:12px;color:#8A8CA3;margin:0}
.wl .makemore{margin:4px 0 8px;padding:7px 12px;font-size:13px;font-weight:600;border:0;border-radius:8px;background:#2F7D5B;color:#fff;cursor:pointer}
.wl .makemore:hover{background:#276a4d}
.wl .makemore:disabled{opacity:.6;cursor:default}
.wl .rehook .makemore{background:#8A6D1F}
.wl .rehook .makemore:hover{background:#755c19}
`
