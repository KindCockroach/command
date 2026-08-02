import WaitlistForm from './WaitlistForm'
import { PurchasePixel } from './shared'
import { GPT_URL, TEMPLATE_URL, ACCESS_KEY, type Audience } from '@/lib/funnels'

// Shared post-purchase delivery page. Same product/steps for every audience;
// only the headline and the "coming soon" block differ (via the Audience config).
export default async function Welcome({
  audience,
  searchParams,
}: {
  audience: Audience
  searchParams: Promise<{ k?: string }>
}) {
  const { k } = await searchParams
  const gated = ACCESS_KEY && k !== ACCESS_KEY
  const cs = audience.comingSoon

  if (gated) {
    return (
      <main className="lw">
        <style>{welcomeCss}</style>
        <div className="wrap locked">
          <h1>This is your delivery page</h1>
          <p>Use the link from your purchase confirmation to unlock it. If you bought Caption Writer
            and landed here, reply to your receipt and we&rsquo;ll get you in.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="lw">
      <PurchasePixel value={27} />
      <style>{welcomeCss}</style>
      <div className="wrap">
        <p className="eyebrow">YOU&rsquo;RE IN 🎉</p>
        <h1>{audience.welcomeHeadline}</h1>
        <p className="sub">{audience.welcomeSub}</p>

        <ol className="steps">
          <li>
            <h2>1 · Open your Caption Writer</h2>
            <p>This is your personal sorting-hat AI. Bookmark it — this is where you&rsquo;ll live.</p>
            <a className="btn" href={GPT_URL} target="_blank" rel="noopener noreferrer">Open Caption Writer →</a>
          </li>
          <li>
            <h2>2 · Grab your Workspace</h2>
            <p>Duplicate this template — your capture Stream, Post-Card Library, and Park Lot. Ideas
              never die in a chat again.</p>
            <a className="btn ghost" href={TEMPLATE_URL} target="_blank" rel="noopener noreferrer">Duplicate the Workspace →</a>
          </li>
          <li>
            <h2>3 · Teach it your voice (60 seconds)</h2>
            <p>Paste 2–3 of your own posts so it mirrors YOUR rhythm and slang. Do this once and it sticks.</p>
          </li>
          <li>
            <h2>4 · Your first win</h2>
            <p>Brain-dump one real thing from today — messy is perfect. Ask for 3 post-cards. Watch
              raw life become ready-to-post content. It parks anything it doesn&rsquo;t know instead
              of faking it.</p>
          </li>

          <li>
            <h2>5 · Pin your chat</h2>
            <p>Once your chat is trained: <strong>right-click it → Pin. Right-click again → Rename it
              &ldquo;Caption Writer.&rdquo;</strong> Now you can easily return to your trained Caption
              Writer over and over. Heads up — clicking the Caption Writer stored in your GPTs opens a
              brand-new chat and starts your training over.</p>
          </li>
        </ol>

        <div className={`comingsoon cs-${cs.theme}`}>
          <p className="cseyebrow">{cs.eyebrow}</p>
          <h2>{cs.headline}</h2>
          {cs.body.map((p, i) => (
            <p className="cssub" key={i}>{p}</p>
          ))}
          <WaitlistForm cta={cs.cta} source={cs.source} showNote={false} />
        </div>
      </div>
    </main>
  )
}

const welcomeCss = `
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
.lw em { color:var(--nebula); font-style:italic; }

/* Coming-soon block — two themes */
.lw .comingsoon { border-radius:16px; padding:28px 26px; margin-top:24px; color:#fff; }
.lw .cs-journal { background:linear-gradient(160deg,#3a2352,var(--nebula) 65%,var(--pink)); }
.lw .cs-command { background:linear-gradient(160deg,var(--midnight),#25204d 70%,var(--nebula)); }
.lw .comingsoon h2 { color:#fff; font-size:clamp(22px,3.6vw,30px); margin:2px 0 12px; }
.lw .cseyebrow { letter-spacing:2px; font-size:12px; font-weight:800; color:var(--ember); margin:0; }
.lw .cssub { font-size:17px; color:#f3ecf7; margin:0 0 12px; }
.lw .comingsoon strong { color:#fff; }

/* Waitlist form */
.lw .wl-form { display:flex; flex-direction:column; gap:12px; margin-top:8px; }
.lw .wl-row { display:grid; grid-template-columns:1fr 1.3fr; gap:12px; }
.lw .wl-form input { width:100%; box-sizing:border-box; padding:14px 16px; border-radius:12px;
  border:1px solid rgba(255,255,255,0.35); background:rgba(255,255,255,0.96); color:var(--midnight);
  font-size:16px; font-family:inherit; }
.lw .wl-form input:focus { outline:none; border-color:var(--ember); box-shadow:0 0 0 3px rgba(242,166,90,0.35); }
.lw .wl-form button { background:var(--ember); color:var(--midnight); font-weight:800; font-size:17px;
  border:none; cursor:pointer; padding:15px 26px; border-radius:999px; transition:transform .12s ease; }
.lw .wl-form button:hover:not(:disabled) { transform:translateY(-2px); }
.lw .wl-form button:disabled { opacity:0.7; cursor:default; }
.lw .wl-fine { font-size:13px; opacity:0.85; margin:2px 0 0; color:#f3ecf7; }
.lw .wl-error { color:#ffd7c2; font-size:14px; margin:0; }
.lw .wl-done { background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.4);
  border-radius:14px; padding:20px 22px; font-size:18px; margin-top:8px; }
.lw .locked { text-align:center; padding-top:120px; }
@media (max-width:560px){ .lw .wl-row { grid-template-columns:1fr; } }
`
