export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { PurchasePixel } from '@/components/funnel/shared'
import { MEDS } from '../meds'

// Buyer-only content — keep it out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } }

// Buyer delivery page. Reached after checkout (GHL redirect →
// bethereforher.com/library?k=KEY). Soft-gated by BETHEREFORHER_KEY: if that env
// var is set, the ?k must match; if it's unset, the page is open (fail-open, so
// you can never lock buyers out by mistake). Fires a Purchase to Meta on load.
export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>
}) {
  const { k } = await searchParams
  const KEY = process.env.BETHEREFORHER_KEY || ''
  const gated = KEY && k !== KEY

  if (gated) {
    return (
      <main className="lib">
        <style>{css}</style>
        <div className="wrap locked">
          <p className="eyebrow">BE THERE FOR HER</p>
          <h1>This is your library</h1>
          <p>Use the link from your purchase confirmation to open it. If you bought the collection and
            landed here, reply to your receipt and we&rsquo;ll get you in.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="lib">
      <PurchasePixel value={9} />
      <style>{css}</style>
      <div className="wrap">
        <p className="eyebrow">BE THERE FOR HER · YOUR LIBRARY 🤍</p>
        <h1>Welcome back to your intuitive self.</h1>
        <p className="sub">All seven meditations are yours to keep. Press play right here, or download
          each one to your phone and listen anytime &mdash; in the car, in the bath, in the dark at 2am.
          There&rsquo;s no right way. Just come back to her whenever you need to.</p>

        <div className="intro">
          <h2>Welcome to Mindful Listening</h2>
          <p>Start here. A few minutes with me &mdash; what this is, how to use it, and why you can&rsquo;t
            do it wrong.</p>
          <audio controls preload="none" src="/bethereforher/00-welcome.mp3" />
        </div>

        <ol className="meds">
          {MEDS.map((m) => (
            <li key={m.n}>
              <div className="head">
                <span className="mt">{m.title}</span>
                <span className="ml">{m.line}</span>
              </div>
              <audio controls preload="none" src={`/bethereforher/${m.file}`} />
              <a className="dl" href={`/bethereforher/${m.file}`} download>Download</a>
            </li>
          ))}
        </ol>

        <div className="guide">
          <h2>Which one, when?</h2>
          <ul>
            <li><strong>Wired &amp; can&rsquo;t settle</strong> → Come Back to Your Body</li>
            <li><strong>Feeling small or unseen</strong> → The Little You</li>
            <li><strong>Everything feels too big</strong> → The Vast and the Held</li>
            <li><strong>Hard on yourself</strong> → Becoming Her Safe Place</li>
            <li><strong>Carrying everyone</strong> → You Can Put It Down</li>
            <li><strong>Ashamed of a big feeling</strong> → Nothing About You Was Too Much</li>
            <li><strong>Afraid of being left</strong> → You Don&rsquo;t Have to Earn It</li>
          </ul>
        </div>

        <p className="foot">You&rsquo;ve been there for everyone. Now you&rsquo;re here for her. 🤍</p>
      </div>
    </main>
  )
}

const css = `
.lib { --midnight:#3c2a37; --nebula:#9b6a86; --pink:#cf8aa0; --ember:#d98c5f; --light:#F4E9DB;
  background:var(--light); color:var(--midnight); min-height:100vh; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
.lib .wrap { max-width:680px; margin:0 auto; padding:52px 22px 90px; }
.lib .eyebrow { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--nebula); margin:0; }
.lib h1 { font-family:Georgia,serif; font-size:clamp(30px,5vw,40px); margin:8px 0 12px; }
.lib .sub { font-size:18px; color:#4a4560; margin:0 0 28px; }
.lib .intro { background:linear-gradient(160deg,#4a2f44,#8a5470); color:#fdf3ea; border-radius:16px; padding:22px; margin:0 0 26px; }
.lib .intro h2 { font-family:Georgia,serif; font-size:22px; margin:0 0 6px; color:#fff; }
.lib .intro p { font-size:15px; color:#f3ecf7; margin:0 0 12px; }
.lib .intro audio { width:100%; }
.lib .meds { list-style:none; padding:0; margin:0; }
.lib .meds li { background:#FBF3EA; border:1px solid #e6d6c4; border-radius:16px; padding:18px 20px; margin:14px 0; }
.lib .head { display:flex; flex-direction:column; gap:2px; margin-bottom:10px; }
.lib .mt { font-family:Georgia,serif; font-size:20px; font-weight:700; }
.lib .ml { font-size:14px; color:#6a6280; }
.lib .meds audio { width:100%; }
.lib .dl { display:inline-block; margin-top:8px; font-size:14px; font-weight:700; color:var(--nebula); text-decoration:none; }
.lib .guide { background:#F3E4D3; border:1px solid #e6cdb6; border-radius:16px; padding:20px 22px; margin-top:26px; }
.lib .guide h2 { font-family:Georgia,serif; font-size:22px; margin:0 0 12px; }
.lib .guide ul { list-style:none; padding:0; margin:0; }
.lib .guide li { padding:7px 0; border-top:1px solid #e6cdb6; font-size:15px; }
.lib .guide li:first-child { border-top:none; }
.lib .foot { text-align:center; font-family:Georgia,serif; font-style:italic; font-size:19px; color:var(--nebula); margin-top:30px; }
.lib .locked { text-align:center; padding-top:110px; }
`
