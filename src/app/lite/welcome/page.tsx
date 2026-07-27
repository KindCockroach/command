export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Welcome to Post Sorter',
  description: 'Your Post Sorter delivery: the GPT, the workspace, and your 10-minute first win.',
  robots: { index: false },
}

// Post-purchase delivery page (internal name: River Lite). Point the payment
// processor's success/redirect URL here (optionally with
// ?k=<NEXT_PUBLIC_LITE_ACCESS_KEY> for a soft gate). GPT + Notion workspace
// links default to the live assets so delivery works without env config.
const GPT_URL = 'https://chatgpt.com/g/g-6a4dc595ee408191b4b422fca6bd74de-the-river-lite'
const TEMPLATE_URL =
  process.env.NEXT_PUBLIC_LITE_TEMPLATE_URL ||
  'https://app.notion.com/p/The-River-Your-Content-Workspace-dff31126df3a4797a1b6013a6ddd5ae6?source=copy_link'
const LOOM_URL = process.env.NEXT_PUBLIC_LITE_LOOM_URL || ''
const ACCESS_KEY = process.env.NEXT_PUBLIC_LITE_ACCESS_KEY || ''

export default async function LiteWelcome({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>
}) {
  const { k } = await searchParams
  const gated = ACCESS_KEY && k !== ACCESS_KEY

  if (gated) {
    return (
      <main className="lw">
        <style>{css}</style>
        <div className="wrap locked">
          <h1>This is your delivery page</h1>
          <p>Use the link from your purchase confirmation to unlock it. If you bought Post Sorter
            and landed here, reply to your receipt and we&rsquo;ll get you in.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="lw">
      <style>{css}</style>
      <div className="wrap">
        <p className="eyebrow">YOU&rsquo;RE IN 🎉</p>
        <h1>Welcome to Post Sorter</h1>
        <p className="sub">Everything you need is right here. Give it 10 minutes and you&rsquo;ll walk
          away with 3 finished post-cards. Do the steps in order.</p>

        <ol className="steps">
          <li>
            <h2>1 · Open your Post Sorter</h2>
            <p>This is your personal sorting-hat AI. Bookmark it — this is where you&rsquo;ll live.</p>
            <a className="btn" href={GPT_URL} target="_blank" rel="noopener noreferrer">Open Post Sorter →</a>
          </li>

          <li>
            <h2>2 · Grab your Workspace</h2>
            <p>Duplicate this template — your capture Stream, Post-Card Library, and Park Lot. Ideas
              never die in a chat again.</p>
            {TEMPLATE_URL
              ? <a className="btn ghost" href={TEMPLATE_URL} target="_blank" rel="noopener noreferrer">Duplicate the Workspace →</a>
              : <p className="soon">Workspace link is being finalized — check your receipt email, it&rsquo;s on its way.</p>}
          </li>

          <li>
            <h2>3 · Teach it your voice (60 seconds)</h2>
            <p>Paste 2–3 of your own posts into the River so it mirrors YOUR rhythm and slang. Do
              this once and it sticks.</p>
          </li>

          <li>
            <h2>4 · Your first win</h2>
            <p>Brain-dump one real thing from today — messy is perfect. Ask for 3 post-cards. Watch
              raw life become ready-to-post content. Park anything it doesn&rsquo;t know instead of
              faking it.</p>
          </li>
        </ol>

        {LOOM_URL && (
          <div className="loom">
            <h2>Watch the 5-minute walkthrough</h2>
            <a className="btn ghost" href={LOOM_URL} target="_blank" rel="noopener noreferrer">Play the walkthrough →</a>
          </div>
        )}

        <div className="next">
          <h2>When one brain isn&rsquo;t enough</h2>
          <p>Post Sorter runs one flow. The full <em>Content Command Station</em> runs <em>all</em> your
            accounts, paces your goals, and flags what&rsquo;s stuck. When you&rsquo;re ready to scale,
            that&rsquo;s your next step up.</p>
        </div>
      </div>
    </main>
  )
}

const css = `
.lw { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); min-height:100vh;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; margin:0; }
.lw .wrap { max-width:680px; margin:0 auto; padding:56px 24px 80px; }
.lw h1 { font-family:Georgia,serif; font-size:clamp(30px,5vw,42px); line-height:1.15; margin:6px 0 14px; }
.lw h2 { font-family:Georgia,serif; font-size:22px; margin:0 0 8px; }
.lw .eyebrow { letter-spacing:3px; font-size:13px; font-weight:700; color:var(--nebula); margin:0; }
.lw .sub { font-size:19px; margin:0 0 34px; }
.lw .steps { list-style:none; padding:0; margin:0; }
.lw .steps > li { background:#fff; border:1px solid #e7e0d3; border-radius:16px; padding:22px 24px; margin:16px 0; }
.lw .btn { display:inline-block; margin-top:12px; background:var(--nebula); color:#fff; font-weight:700;
  text-decoration:none; padding:13px 26px; border-radius:999px; }
.lw .btn.ghost { background:#fff; color:var(--nebula); border:2px solid var(--nebula); }
.lw .soon { margin-top:10px; color:#7a6f60; font-style:italic; }
.lw em { color:var(--nebula); font-style:italic; }
.lw .loom,.lw .next { background:var(--midnight); color:#fff; border-radius:16px; padding:24px; margin-top:24px; }
.lw .loom h2,.lw .next h2 { color:#fff; }
.lw .next em { color:var(--ember); }
.lw .locked { text-align:center; padding-top:120px; }
`
