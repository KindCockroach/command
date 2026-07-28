export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Caption Writer — Ready-to-Post Captions in Your Own Voice',
  description: 'Drop your raw story in, get ready-to-post content out — hook, caption, hashtags & the photo to take, in your voice. AI-supported content, just $27.',
}

// Public sales page for the $27 entry offer (internal name: River Lite).
// The Buy button points at NEXT_PUBLIC_LITE_CHECKOUT_URL, defaulting to the
// live GHL/FastPayDirect payment link so it works without any env config.
const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_LITE_CHECKOUT_URL ||
  'https://link.fastpaydirect.com/payment-link/6a67ba88a655fa0b802a6707'

function BuyButton({ tagline }: { tagline?: string }) {
  const href = CHECKOUT_URL || '#'
  return (
    <div className="cta">
      <a className="buy" href={href} {...(CHECKOUT_URL ? {} : { 'data-placeholder': 'true' })}>
        GET CAPTION WRITER — $27
      </a>
      {tagline && <p className="tagline">{tagline}</p>}
    </div>
  )
}

export default function LiteSalesPage() {
  return (
    <main className="lite">
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">CAPTION WRITER</p>
          <h1>It&rsquo;s 9:52pm. The house is finally quiet. You open Instagram to post something&hellip; and you&rsquo;ve got nothing.</h1>
          <p className="sub">
            Not because your life is boring — because your ideas are scattered across 14 notes,
            3 voice memos, and a screenshot you&rsquo;ll never find again. <strong>Caption Writer
            sorts your real life into ready-to-post content — in YOUR voice — for $27.</strong>
          </p>
          <BuyButton />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>You don&rsquo;t have a content problem. You have a <em>sorting</em> problem.</h2>
          <p>
            Things happen to you all day that would make great posts — the thing your kid said, the
            small win, the moment that cracked you open a little. But by the time you sit down to
            &ldquo;make content,&rdquo; it&rsquo;s all fog. So you either post nothing, or you post
            something generic that sounds like everyone else&rsquo;s AI.
          </p>
          <p className="reframe">What if you never had to <em>write</em> content again — just <em>notice</em> your life?</p>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What it is</h2>
          <p className="lead">Caption Writer is a smart sorting system with one job:</p>
          <blockquote>Raw life in &rarr; ready-to-post cards out. In your voice.</blockquote>
          <p>You dump the messy stuff — a rant, a moment, a voice memo, a photo and what happened.
            Caption Writer decides if it&rsquo;s a post, and either:</p>
          <div className="cards">
            <div className="card compose">
              <span className="pill">✅ Composes it</span>
              <p>3 complete Post-Cards: hook, caption, hashtags, and the exact photo to take.</p>
            </div>
            <div className="card park">
              <span className="pill">🅿️ Parks it</span>
              <p>With ONE specific question that unlocks it — never a made-up detail about your life.
                It asks instead of inventing.</p>
            </div>
          </div>
          <p>It learns YOUR voice from YOUR posts in a 60-second setup. It knows the difference
            between a post that sells and a post that builds trust — and tells you which one it made.</p>
        </div>
      </section>

      <section className="band get">
        <div className="wrap">
          <h2>What you get</h2>
          <ol className="get-list">
            <li><strong>The Caption Writer GPT</strong> — your personal sorting-hat AI (runs in your own ChatGPT — a free account works).</li>
            <li><strong>The Caption Writer Workspace</strong> — a duplicate-able Notion template: your capture Stream, Post-Card Library, and Park Lot, so ideas never die in a chat again.</li>
            <li><strong>The 10-Minute Setup + First Win walkthrough</strong> — you&rsquo;ll have 3 finished post-cards in your first sitting.</li>
            <li><strong>Lifetime updates</strong> — when Caption Writer gets smarter, yours does too, automatically.</li>
          </ol>
        </div>
      </section>

      <section className="proof">
        <div className="wrap">
          <h2>Proof</h2>
          <p>The very first card this system ever produced is posted on my personal account — made
            from a 60-second brain-dump about my sister moving in with us. One messy paragraph in, a
            finished post out. That&rsquo;s the loop. It&rsquo;s the same system I run my own accounts
            with, shrunk to fit in your pocket.</p>
          <p className="who"><strong>Who it&rsquo;s for:</strong> Moms and creators who have a real
            life worth posting and zero extra hours to become a copywriter. If you can send a text
            message, you can run Caption Writer.</p>
        </div>
      </section>

      <section className="band faq">
        <div className="wrap">
          <h2>Questions</h2>
          <dl>
            <dt>Do I need paid ChatGPT?</dt>
            <dd>No — a free ChatGPT account works (paid is smoother). You&rsquo;ll want a free Notion account for the workspace.</dd>
            <dt>Do I need tech skills?</dt>
            <dd>If you can copy, paste, and text, you&rsquo;re overqualified. Setup is 10 minutes, once.</dd>
            <dt>Will it sound like AI?</dt>
            <dd>It mirrors YOUR posts, YOUR rhythm, YOUR slang. And when it doesn&rsquo;t know something about your life, it asks — it never invents. That&rsquo;s the difference between this and &ldquo;just using ChatGPT.&rdquo;</dd>
            <dt>How fast do I see results?</dt>
            <dd>First sitting: one brain-dump &rarr; 3 ready-to-post cards. That&rsquo;s the promise.</dd>
          </dl>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>One coffee-shop lunch. A content system for life.</h2>
          <BuyButton tagline="Lifetime access · Instant delivery" />
        </div>
      </section>
    </main>
  )
}

const css = `
.lite { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  line-height:1.6; margin:0; }
.lite .wrap { max-width:760px; margin:0 auto; padding:0 24px; }
.lite h1,.lite h2,.lite blockquote { font-family:Georgia,"Times New Roman",serif; }
.lite h1 { font-size:clamp(28px,5vw,44px); line-height:1.15; letter-spacing:-0.5px; margin:0 0 20px; }
.lite h2 { font-size:clamp(24px,4vw,34px); line-height:1.2; margin:0 0 18px; }
.lite section { padding:56px 0; }
.lite .hero { background:linear-gradient(160deg,var(--midnight),#25204d 70%,var(--nebula)); color:var(--light); padding:80px 0 72px; }
.lite .hero h1 { color:#fff; }
.lite .eyebrow { letter-spacing:3px; font-size:13px; font-weight:700; color:var(--ember); margin:0 0 18px; }
.lite .sub { font-size:19px; color:#e7e2f2; }
.lite .sub strong,.lite .hero strong { color:#fff; }
.lite .band { background:#fff; }
.lite em { font-style:italic; color:var(--nebula); }
.lite .reframe { font-size:22px; font-family:Georgia,serif; margin-top:22px; }
.lite .lead { font-size:19px; }
.lite blockquote { background:var(--midnight); color:#fff; font-size:24px; margin:24px 0; padding:22px 26px; border-radius:14px; border-left:6px solid var(--ember); }
.lite blockquote em { color:var(--ember); }
.lite .cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:24px 0; }
.lite .card { padding:20px; border-radius:14px; }
.lite .card.compose { background:#eef3ec; border:1px solid #cfe0c8; }
.lite .card.park { background:#f6edf3; border:1px solid #e6cfe0; }
.lite .card p { margin:10px 0 0; }
.lite .pill { display:inline-block; font-weight:700; font-size:15px; }
.lite .get-list { padding-left:22px; font-size:18px; }
.lite .get-list li { margin:12px 0; }
.lite .who { margin-top:20px; }
.lite dl dt { font-weight:700; font-size:18px; margin-top:20px; }
.lite dl dd { margin:6px 0 0; }
.lite .proof { background:var(--light); }
.lite .final { background:linear-gradient(160deg,var(--nebula),var(--pink)); color:#fff; text-align:center; }
.lite .final h2 { color:#fff; }
.lite .cta { margin:28px 0; text-align:center; }
.lite .buy { display:inline-block; background:var(--ember); color:var(--midnight); font-weight:800;
  font-size:20px; letter-spacing:0.3px; text-decoration:none; padding:18px 40px; border-radius:999px;
  box-shadow:0 10px 30px rgba(242,166,90,0.4); transition:transform .12s ease; }
.lite .buy:hover { transform:translateY(-2px); }
.lite .buy[data-placeholder] { opacity:0.65; }
.lite .tagline { font-size:14px; opacity:0.85; margin:12px 0 0; }
@media (max-width:560px){ .lite .cards { grid-template-columns:1fr; } }
`
