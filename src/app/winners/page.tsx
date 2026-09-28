'use client'

import { useCallback, useEffect, useState } from 'react'

// The Winner Loop, retroactive: Mandi posts natively, then pastes the week's
// reel results here (copy the rows from the spreadsheet, headers included).
// RISE scores each reel against that account's typical reel and says what to
// make more of. Internal page, gated by middleware.

type Verdict = 'make_more' | 'rehook' | 'neutral' | 'retire' | 'reupload'
type Scored = {
  id: number; account_id: string; media_id: string; onscreen_text: string; visual: string
  views: number; follows: number; saves: number; shares: number; fb_views: number | null
  pct_from_followers: number | null; content_id: number | null
  verdict: Verdict; reasons: string[]; engagement_rate: number; keep_per_1k: number; views_vs_median: number; ig_views: number
}
type Account = { id: string; handle?: string; name?: string; status?: string }

const GROUPS: { verdict: Verdict; title: string; sub: string }[] = [
  { verdict: 'make_more', title: 'Make more of this', sub: 'Beat this account’s typical reel. Re-angle the same pain point with new footage and new words.' },
  { verdict: 'rehook', title: 'Great idea, weak hook', sub: 'People saved or shared it, but few saw it. Keep the line, test a new opening.' },
  { verdict: 'neutral', title: 'Typical', sub: 'Nothing to act on yet.' },
  { verdict: 'retire', title: 'Retire this angle', sub: 'Under typical on views and engagement.' },
  { verdict: 'reupload', title: 'Re-uploads', sub: 'Same text as an earlier reel. Exact re-posts get buried.' },
]

// Header keyword → field. Order matters: more specific patterns first.
const HEADER_MAP: [RegExp, string][] = [
  [/per\s*1k|engagement rate|interactions|accounts engaged|^rank$/i, ''],
  [/reel id|media id|^id$/i, 'media_id'],
  [/7-day|7 day/i, 'views_7d'],
  [/total views|^views$|^plays$/i, 'views'],
  [/from followers/i, 'pct_from_followers'],
  [/reach|viewers/i, 'reach'],
  [/facebook/i, 'fb_views'],
  [/^likes/i, 'likes'],
  [/^comments/i, 'comments'],
  [/^saves/i, 'saves'],
  [/^shares/i, 'shares'],
  [/^follows/i, 'follows'],
  [/visual/i, 'visual'],
  [/on-?screen|caption|text/i, 'onscreen_text'],
  [/date|posted/i, 'posted_at'],
]

function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
    else if (ch === delim && !q) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

// Accepts rows pasted from Excel/Sheets (tabs) or a CSV. Finds the header row
// (the first line naming a reel id or views), skips title lines and a Total row.
function parseTable(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const delim = lines.some(l => l.includes('\t')) ? '\t' : ','
  const hi = lines.findIndex(l => (/(reel|media) id/i.test(l) || (/views/i.test(l) && /likes/i.test(l))) && splitLine(l, delim).length > 3)
  if (hi < 0) return []
  const fields = splitLine(lines[hi], delim).map(h => HEADER_MAP.find(([re]) => re.test(h))?.[1] ?? '')
  return lines.slice(hi + 1).map(l => {
    const cells = splitLine(l, delim)
    const row: Record<string, string> = {}
    fields.forEach((f, i) => { if (f && cells[i] !== undefined && !(f in row)) row[f] = cells[i] })
    return row
  }).filter(r => r.media_id)
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n)))

export default function WinnersPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('mandijoy')
  const [results, setResults] = useState<Scored[]>([])
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (id: string) => {
    const r = await fetch(`/api/results?account_id=${encodeURIComponent(id)}`)
    setResults(r.ok ? await r.json() : [])
  }, [])

  useEffect(() => {
    fetch('/api/accounts').then(r => (r.ok ? r.json() : [])).then((a: Account[]) => setAccounts(a.filter(x => x.status === 'active'))).catch(() => {})
  }, [])
  useEffect(() => { load(accountId) }, [accountId, load])

  async function doImport() {
    const rows = parseTable(paste)
    if (!rows.length) { setMsg('Couldn’t find a header row. Include the row that says “Reel ID”, “Total views”, and so on.'); return }
    setBusy(true); setMsg('')
    const r = await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: accountId, rows }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg(d.error || 'Import failed.'); return }
    setMsg(`Imported ${d.added} new and updated ${d.updated} reels.`)
    setPaste('')
    setResults(d.results || [])
  }

  return (
    <main className="wl">
      <style>{css}</style>
      <div className="wrap">
        <p className="eyebrow">RISE · WINNER LOOP</p>
        <h1>What’s working</h1>
        <p className="sub">Post natively, then paste the week’s reel results here. RISE compares each reel with this account’s typical reel and tells you what to make more of.</p>

        <div className="bar">
          <label htmlFor="acct">Account</label>
          <select id="acct" value={accountId} onChange={e => setAccountId(e.target.value)}>
            {(accounts.length ? accounts : [{ id: accountId } as Account]).map(a => (
              <option key={a.id} value={a.id}>{a.handle || a.name || a.id}</option>
            ))}
          </select>
        </div>

        <details className="imp">
          <summary>Import this week’s results</summary>
          <p className="hint">Copy the rows from the spreadsheet (headers included) and paste them here. A CSV works too. Re-importing the same reels updates them.</p>
          <textarea id="paste" rows={6} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Rank	Reel ID	Views (7-day, grid)	Total views	…" />
          <button className="go" onClick={doImport} disabled={busy || !paste.trim()}>{busy ? 'Importing…' : 'Import and score'}</button>
        </details>
        {msg && <p className="msg">{msg}</p>}

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
                    <div><dt>IG views</dt><dd>{fmt(r.ig_views)}</dd></div>
                    <div><dt>vs typical</dt><dd>{r.views_vs_median.toFixed(1)}×</dd></div>
                    <div><dt>Engagement</dt><dd>{(r.engagement_rate * 100).toFixed(1)}%</dd></div>
                    <div><dt>Saves+shares /1K</dt><dd>{r.keep_per_1k.toFixed(1)}</dd></div>
                    <div><dt>Follows</dt><dd>{r.follows}</dd></div>
                    {r.fb_views !== null && <div><dt>Facebook</dt><dd>{fmt(r.fb_views)}</dd></div>}
                  </dl>
                  {r.reasons.length > 0 && <ul className="why">{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                  <p className="meta">Reel {r.media_id}{r.content_id ? ` · matches RISE card #${r.content_id}` : ''}</p>
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
.wl{min-height:100vh;background:#F5EFE6;color:#171C3A;font-family:system-ui,-apple-system,sans-serif;padding:32px 16px 64px}
.wl .wrap{max-width:760px;margin:0 auto}
.wl .eyebrow{font-size:12px;letter-spacing:.12em;color:#5A4FCF;margin:0 0 6px}
.wl h1{font-family:Georgia,serif;font-weight:400;font-size:34px;margin:0 0 8px}
.wl .sub{color:#5C5F78;margin:0 0 20px;line-height:1.55}
.wl .bar{display:flex;gap:10px;align-items:center;margin-bottom:14px}
.wl label{font-size:13px;color:#5C5F78}
.wl select{font:inherit;padding:6px 10px;border-radius:8px;border:1px solid #E2D8C8;background:#fff}
.wl .imp{background:#fff;border:1px solid #E2D8C8;border-radius:10px;padding:12px 14px;margin-bottom:12px}
.wl .imp summary{cursor:pointer;font-weight:600}
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
`
