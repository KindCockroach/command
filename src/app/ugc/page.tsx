export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import { wfhCss } from '@/components/wfh/theme'

// WFH — UGC & marketing menu. Two separate menus: VIDEO CREATION (trending content
// made for the brand) and MARKETING ASSESSMENTS (copy / website / full). Every item
// ends on /meet?service=<key> (keys + labels live in lib/wfh.ts WFH_SERVICES).
// Prices are STARTING POINTS drafted 2026-10-25 — Mandi to confirm; edit them here.
export const metadata: Metadata = {
  title: 'UGC & Marketing · WFH — Works For Her',
  description: 'Trending content that gets traffic and new customers — hooks, scripts, and edits built for how the algorithm rewards interesting brands. Plus copy, website, and full marketing assessments.',
}

type Item = { key: string; name: string; price: string; what: string[]; badge?: string }

const VIDEO: Item[] = [
  { key: 'ugc-single', name: 'Single Trending Video', price: '$250', what: [
    'Trend research matched to your brand', 'Hook + script written for the algorithm', 'Filmed and edited, one vertical video ready to post'] },
  { key: 'ugc-pack', name: 'Trend Test Pack', price: '$600', badge: 'Most popular', what: [
    '3 trending videos', '3 hook variations each, so you find the winner fast', 'Captions and posting notes included'] },
  { key: 'ugc-location', name: 'On-Location Content Day', price: '$1,200', what: [
    'I come to you — Central Texas venues, camps, and experiences', 'A full day of filming your place and your people', '6 edited videos + the raw footage'] },
  { key: 'ugc-monthly', name: 'Monthly Trending Content', price: '$1,600/mo', what: [
    '8 trend-matched videos every month', 'Hooks, scripts, edits, and a posting plan', 'Monthly check-in on what’s winning'] },
]

const MARKETING: Item[] = [
  { key: 'mkt-copy', name: 'Copy Assessment', price: '$197', what: [
    'Your homepage + one offer page, reviewed line by line', 'What’s losing customers, and why', 'Rewritten headline and call to action'] },
  { key: 'mkt-website', name: 'Website Marketing Assessment', price: '$397', what: [
    'The path from first click to customer, mapped', 'Search basics, speed, mobile, and trust signals', 'Recorded walkthrough + a ranked fix list'] },
  { key: 'mkt-full', name: 'Full Marketing Assessment', price: '$797', badge: 'Everything', what: [
    'Website, copy, social, and email — the whole picture', 'Where your next customers are hiding', 'A 90-day plan + a 60-minute review call'] },
]

function Menu({ items }: { items: Item[] }) {
  return (
    <div className="menu">
      {items.map(i => (
        <a className="item" href={`/meet?service=${i.key}`} key={i.key}>
          <div className="ihead">
            <h3>{i.name}</h3>
            <span className="price">{i.price}</span>
          </div>
          {i.badge && <span className="badge">{i.badge}</span>}
          <ul>{i.what.map(w => <li key={w}>{w}</li>)}</ul>
          <span className="go">Choose &amp; book a time →</span>
        </a>
      ))}
    </div>
  )
}

export default function UgcPage() {
  return (
    <main className="w">
      <MetaPixel />
      <style>{wfhCss + css}</style>
      <header className="top">
        <div className="wrap">
          <a className="home" href="/">WFH · WORKS FOR HER</a>
          <h1>Trending content that gets <em>traffic and new customers.</em></h1>
          <p>
            Hooks, scripts, and edits built for how the algorithm rewards interesting brands &mdash; brands that
            serve women, moms, families, and wellness, and brands built on unique experiences and travel.
          </p>
        </div>
      </header>

      <section className="wrap sec">
        <p className="tag">MENU 1</p>
        <h2>Video creation</h2>
        <p className="lede">Content made for your brand, built on what&rsquo;s trending right now.</p>
        <Menu items={VIDEO} />
      </section>

      <section className="wrap sec">
        <p className="tag">MENU 2</p>
        <h2>Marketing assessments</h2>
        <p className="lede">Before you spend on more content, find out what your marketing is leaving on the table.</p>
        <Menu items={MARKETING} />
      </section>

      <section className="wrap sec">
        <div className="panel unsure">
          <div>
            <h3>Not sure which one fits?</h3>
            <p>Book a time and tell me about your brand. I&rsquo;ll recommend the right starting point.</p>
          </div>
          <a className="btn" href="/meet?service=ugc-unsure">Book a time →</a>
        </div>
      </section>

      <footer className="foot"><a href="/">WFH home</a>·<a href="/assessment">AI questionnaire</a>·<a href="/aimom">AI Mom</a></footer>
    </main>
  )
}

const css = `
.w .sec { padding:44px 20px 0; }
.w .sec h2 { font-size:clamp(24px,4vw,32px); margin:0 0 6px; }
.w .lede { color:var(--muted); margin:0 0 20px; font-size:17px; }
.w .menu { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
.w .item { display:flex; flex-direction:column; text-decoration:none; color:var(--midnight); background:#fff; border:1px solid var(--line);
  border-radius:18px; padding:22px; transition:transform .12s ease, box-shadow .12s ease, border-color .12s ease; }
.w .item:hover { transform:translateY(-3px); box-shadow:0 14px 34px rgba(23,28,58,0.12); border-color:var(--nebula); }
.w .ihead { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.w .item h3 { font-size:20px; margin:0; }
.w .price { font:700 20px Georgia,serif; color:var(--copper); white-space:nowrap; }
.w .badge { align-self:flex-start; margin-top:8px; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase;
  color:var(--nebula); background:#efedfb; padding:3px 9px; border-radius:99px; }
.w .item ul { margin:12px 0 16px; padding-left:20px; color:var(--muted); font-size:15px; flex:1; }
.w .item li { margin-bottom:5px; }
.w .go { font-weight:800; color:var(--nebula); }
.w .unsure { display:flex; justify-content:space-between; align-items:center; gap:20px; flex-wrap:wrap; }
.w .unsure h3 { margin:0 0 4px; font-size:22px; }
.w .unsure p { margin:0; color:var(--muted); }
@media (max-width:680px){ .w .menu { grid-template-columns:1fr; } }
`
