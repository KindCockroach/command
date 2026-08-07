'use client'

import { useEffect, useState } from 'react'
import { GPT_URL, TEMPLATE_URL, DEFAULT_CHECKOUT } from '@/lib/funnels'

// Command Station admin: AI token/cost tracking across every surface, plus a
// directory of every business link in one place. Internal route — gated by
// middleware (STATION_KEY) like /station. Data comes from /api/usage.

type ModelRow = { model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }
type KindRow = { kind: string; calls: number; costUsd: number }
type UsageEntry = { ts: string; provider: string; model: string; kind: string; inputTokens: number; outputTokens: number; costUsd: number }
type Summary = {
  totals: { calls: number; inputTokens: number; outputTokens: number; costUsd: number }
  todayCostUsd: number
  last7CostUsd: number
  last30CostUsd: number
  byModel: ModelRow[]
  byKind: KindRow[]
  recent: UsageEntry[]
  pricing: Record<string, { in: number; out: number }>
}
type Payload = { summary: Summary; keys: Record<string, boolean | string> }

const SITE = 'https://rise.aiworksforyou.co'

// One place for every link across the businesses. Edit here to add/remove.
const GROUPS: { title: string; note?: string; links: { label: string; href: string; sub?: string }[] }[] = [
  {
    title: '📣 Caption Writer — the $27 funnel',
    note: 'Live on rise.aiworksforyou.co',
    links: [
      { label: 'Homepage (3 doors)', href: `${SITE}/`, sub: 'AI Works For You hub' },
      { label: 'Seen — Invisible Annie', href: `${SITE}/seen`, sub: 'ad running here' },
      { label: 'Queen — Content-Chasing Camille', href: `${SITE}/queen` },
      { label: 'Caption Writer — working moms', href: `${SITE}/captionwriter` },
      { label: 'Caption Keeper waitlist', href: `${SITE}/journal`, sub: 'the journal that talks back' },
    ],
  },
  {
    title: '🎉 Buyer delivery (welcome pages)',
    links: [
      { label: 'Seen welcome', href: `${SITE}/seen/welcome`, sub: 'checkout redirects here' },
      { label: 'Queen welcome', href: `${SITE}/queen/welcome` },
      { label: 'Captionwriter welcome', href: `${SITE}/captionwriter/welcome` },
    ],
  },
  {
    title: '🛠️ Product assets & checkout',
    links: [
      { label: 'Caption Writer GPT', href: GPT_URL, sub: 'the trained assistant' },
      { label: 'Notion workspace template', href: TEMPLATE_URL },
      { label: 'FastPayDirect checkout', href: DEFAULT_CHECKOUT, sub: '$27 payment link' },
    ],
  },
  {
    title: '💛 Live sessions (parked)',
    note: 'Introduced later via the survey follow-up',
    links: [
      { label: 'The Reset — $33', href: `${SITE}/reset` },
      { label: 'The Cheat Code — $55', href: `${SITE}/cheatcode` },
      { label: 'Private $10 Reset', href: `${SITE}/insait`, sub: 'unlisted' },
    ],
  },
  {
    title: '🧭 Command Center (internal)',
    links: [
      { label: 'Station dashboard', href: '/station' },
      { label: 'Admin (this page)', href: '/admin' },
      { label: 'Waitlist signups (API)', href: '/api/journal-waitlist' },
    ],
  },
  {
    title: '📈 Ads & tracking',
    links: [
      { label: 'Meta Ads Manager', href: 'https://adsmanager.facebook.com/', sub: 'AIWorksForYou · 2239850486862140' },
      { label: 'Meta Events Manager', href: 'https://business.facebook.com/events_manager2/', sub: 'pixel dataset …82206338' },
    ],
  },
]

// Fixed monthly AI subscriptions (credit/seat-based — NOT pay-per-call like
// OpenAI/Anthropic, which are tracked live above). Edit these to your real plans.
const SUBS: { name: string; note: string; monthly: number }[] = [
  { name: 'ChatGPT Plus', note: 'GPT + Caption Writer GPT', monthly: 20 },
  { name: 'Claude', note: 'Fable/Opus + Claude Code', monthly: 20 },
  { name: 'HeyGen', note: 'avatar videos (Sage)', monthly: 29 },
  { name: 'ElevenLabs', note: 'voice clone / TTS', monthly: 22 },
  { name: 'Higgsfield', note: 'Supercomputer image/video', monthly: 29 },
  { name: 'Canva Pro', note: 'finishing images / carousels', monthly: 15 },
  { name: 'CapCut Pro', note: 'captions / video edit', monthly: 10 },
  { name: 'Riverside', note: 'podcast record + distribute', monthly: 19 },
  { name: 'Opus Clip', note: 'podcast → short clips', monthly: 15 },
  { name: 'Beehiiv', note: 'newsletter', monthly: 0 },
  { name: 'GoHighLevel', note: 'funnels + social planner', monthly: 97 },
  { name: 'Make.com', note: 'automations', monthly: 9 },
]

function money(n: number): string {
  if (!n) return '$0.00'
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`
}
function num(n: number): string {
  return (n || 0).toLocaleString('en-US')
}

export default function AdminPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch('/api/usage', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const s = data?.summary
  const subsTotal = SUBS.reduce((a, x) => a + x.monthly, 0)

  return (
    <main className="adm">
      <style>{css}</style>
      <div className="wrap">
        <header className="top">
          <div>
            <p className="eyebrow">COMMAND STATION</p>
            <h1>Admin &amp; Cost Tracker</h1>
          </div>
          <button className="refresh" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </header>

        {err && <p className="err">Couldn&rsquo;t load usage: {err}</p>}

        {/* ── Cost tracker ── */}
        <section>
          <h2>AI spend</h2>
          <div className="cards">
            <div className="card"><span className="k">All-time</span><span className="v">{money(s?.totals.costUsd ?? 0)}</span></div>
            <div className="card"><span className="k">Last 30 days</span><span className="v">{money(s?.last30CostUsd ?? 0)}</span></div>
            <div className="card"><span className="k">Last 7 days</span><span className="v">{money(s?.last7CostUsd ?? 0)}</span></div>
            <div className="card"><span className="k">Today</span><span className="v">{money(s?.todayCostUsd ?? 0)}</span></div>
            <div className="card"><span className="k">Total calls</span><span className="v">{num(s?.totals.calls ?? 0)}</span></div>
            <div className="card"><span className="k">Total tokens</span><span className="v">{num((s?.totals.inputTokens ?? 0) + (s?.totals.outputTokens ?? 0))}</span></div>
          </div>

          {s && s.totals.calls === 0 && (
            <p className="empty">No AI calls tracked yet. Generate a post or chat with the Commander and spend will show up here.</p>
          )}

          {s && s.byModel.length > 0 && (
            <>
              <h3>By model</h3>
              <div className="tw">
                <table>
                  <thead><tr><th>Model</th><th>Calls</th><th>In tok</th><th>Out tok</th><th>Cost</th></tr></thead>
                  <tbody>
                    {s.byModel.map((m) => (
                      <tr key={m.model}>
                        <td className="mono">{m.model}</td>
                        <td>{num(m.calls)}</td>
                        <td>{num(m.inputTokens)}</td>
                        <td>{num(m.outputTokens)}</td>
                        <td className="cost">{money(m.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>By surface</h3>
              <div className="tw">
                <table>
                  <thead><tr><th>Surface</th><th>Calls</th><th>Cost</th></tr></thead>
                  <tbody>
                    {s.byKind.map((k) => (
                      <tr key={k.kind}>
                        <td className="mono">{k.kind}</td>
                        <td>{num(k.calls)}</td>
                        <td className="cost">{money(k.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>Recent calls</h3>
              <div className="tw">
                <table>
                  <thead><tr><th>When</th><th>Surface</th><th>Model</th><th>Cost</th></tr></thead>
                  <tbody>
                    {s.recent.map((e, i) => (
                      <tr key={i}>
                        <td>{new Date(e.ts).toLocaleString()}</td>
                        <td className="mono">{e.kind}</td>
                        <td className="mono">{e.model}</td>
                        <td className="cost">{money(e.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ── Monthly subscriptions ── */}
        <section>
          <h2>Monthly AI subscriptions</h2>
          <p className="gnote">Fixed monthly tools (credit / seat-based — HeyGen, Higgsfield, ElevenLabs, etc. don&rsquo;t bill per call). These are editable estimates — set them to your real plans in <span className="mono">SUBS</span> (admin/page.tsx). The pay-per-use APIs (OpenAI, Anthropic, images) are the live-tracked spend above.</p>
          <div className="cards">
            <div className="card"><span className="k">Subscriptions / mo</span><span className="v">{money(subsTotal)}</span></div>
            <div className="card"><span className="k">API usage (30d)</span><span className="v">{money(s?.last30CostUsd ?? 0)}</span></div>
            <div className="card"><span className="k">Est. total / mo</span><span className="v">{money(subsTotal + (s?.last30CostUsd ?? 0))}</span></div>
          </div>
          <div className="tw" style={{ marginTop: '14px' }}>
            <table>
              <thead><tr><th>Tool</th><th>What it&rsquo;s for</th><th>Monthly</th></tr></thead>
              <tbody>
                {SUBS.map((x) => (
                  <tr key={x.name}>
                    <td className="mono">{x.name}</td>
                    <td>{x.note}</td>
                    <td className="cost">{money(x.monthly)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="mono" style={{ fontWeight: 800 }}>Subscriptions total</td>
                  <td></td>
                  <td className="cost" style={{ fontWeight: 800 }}>{money(subsTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── API keys ── */}
        {data && (
          <section>
            <h2>API keys</h2>
            <div className="keys">
              {Object.entries(data.keys).map(([k, v]) => (
                <span className={`key ${v ? 'on' : 'off'}`} key={k}>
                  {typeof v === 'string' && v ? `${k}: …${v.slice(-6)}` : `${k} ${v ? '✓' : '— not set'}`}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Links directory ── */}
        <section>
          <h2>Business links</h2>
          <div className="grid">
            {GROUPS.map((g) => (
              <div className="lgroup" key={g.title}>
                <h4>{g.title}</h4>
                {g.note && <p className="gnote">{g.note}</p>}
                <ul>
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                      {l.sub && <span className="lsub">{l.sub}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

const css = `
.adm { --midnight:#171C3A; --nebula:#5A4FCF; --ember:#F2A65A; --pink:#D98AB7; --light:#F5EFE6;
  background:var(--midnight); color:#e7e2f2; min-height:100vh; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.5; }
.adm .wrap { max-width:1040px; margin:0 auto; padding:32px 22px 80px; }
.adm .top { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:8px; }
.adm .eyebrow { letter-spacing:3px; font-size:12px; font-weight:700; color:var(--ember); margin:0; }
.adm h1 { font-family:Georgia,serif; font-size:30px; margin:4px 0 0; color:#fff; }
.adm h2 { font-family:Georgia,serif; font-size:22px; color:#fff; margin:36px 0 14px; border-bottom:1px solid #2c2a52; padding-bottom:8px; }
.adm h3 { font-size:15px; letter-spacing:1px; text-transform:uppercase; color:var(--ember); margin:26px 0 10px; }
.adm h4 { font-family:Georgia,serif; font-size:17px; color:#fff; margin:0 0 4px; }
.adm .refresh { background:var(--nebula); color:#fff; border:none; border-radius:999px; padding:10px 20px;
  font-weight:700; cursor:pointer; font-size:14px; }
.adm .refresh:disabled { opacity:.6; cursor:default; }
.adm .err { color:#ffd7c2; background:#3a1f1f; border:1px solid #6a3030; border-radius:10px; padding:12px 14px; }
.adm .empty { color:#a9a3c7; font-style:italic; }
.adm .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; }
.adm .card { background:#20204a; border:1px solid #2c2a52; border-radius:14px; padding:16px 18px; display:flex; flex-direction:column; gap:6px; }
.adm .card .k { font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#a9a3c7; }
.adm .card .v { font-size:24px; font-weight:800; color:#fff; font-family:Georgia,serif; }
.adm .tw { overflow-x:auto; border:1px solid #2c2a52; border-radius:12px; }
.adm table { width:100%; border-collapse:collapse; font-size:14px; }
.adm th { text-align:left; color:#a9a3c7; font-weight:600; font-size:12px; letter-spacing:.5px; text-transform:uppercase;
  padding:10px 14px; border-bottom:1px solid #2c2a52; }
.adm td { padding:10px 14px; border-bottom:1px solid #23234a; }
.adm tr:last-child td { border-bottom:none; }
.adm .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; color:#cfc9e8; }
.adm .cost { color:var(--ember); font-weight:700; }
.adm .keys { display:flex; flex-wrap:wrap; gap:10px; }
.adm .key { font-size:13px; padding:7px 14px; border-radius:999px; border:1px solid #2c2a52; font-family:ui-monospace,monospace; }
.adm .key.on { background:#1c3324; border-color:#2f5a3c; color:#bfe6c9; }
.adm .key.off { background:#33231f; border-color:#5a3a30; color:#e6c2b5; }
.adm .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; }
.adm .lgroup { background:#20204a; border:1px solid #2c2a52; border-radius:14px; padding:18px 20px; }
.adm .gnote { font-size:12px; color:var(--pink); margin:0 0 10px; }
.adm .lgroup ul { list-style:none; padding:0; margin:8px 0 0; }
.adm .lgroup li { padding:7px 0; border-top:1px solid #26264e; display:flex; flex-direction:column; gap:2px; }
.adm .lgroup li:first-child { border-top:none; }
.adm .lgroup a { color:#c3bcf5; text-decoration:none; font-weight:600; }
.adm .lgroup a:hover { color:#fff; text-decoration:underline; }
.adm .lsub { font-size:12px; color:#8f8ab0; }
`
