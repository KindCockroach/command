export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import WaitlistForm from '@/components/funnel/WaitlistForm'

// Public podcast landing for aimomeducation.com — The AI Mom Podcast. Collects
// emails via /api/journal-waitlist, tagged source "aimomeducation". Served at the
// domain root via the host rewrite in middleware.ts.
export const metadata: Metadata = {
  title: 'The AI Mom Podcast — AI without the overwhelm',
  description:
    'The podcast for the mom who keeps hearing she should "use AI" and is quietly exhausted by it. One real, usable thing each episode — and permission to stay human while you do it. Get every new episode in your inbox.',
}

export default function AiMomEducation() {
  return (
    <main className="ame">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">🎧 THE AI MOM PODCAST</p>
          <h1>AI, for the mom who doesn&rsquo;t have time to figure out AI.</h1>
          <p className="sub">
            Everyone&rsquo;s shouting that you should &ldquo;use AI&rdquo; &mdash; and you&rsquo;re tired, and it
            all sounds like one more thing on the pile. This is the podcast that makes it simple and{' '}
            <strong>human</strong>: one real thing you can actually use, every episode. No jargon. No
            hustle. No overwhelm.
          </p>
          <p className="tag">Plug in. Stay human.</p>
          <div className="formbox">
            <WaitlistForm cta="Send me new episodes" source="aimomeducation" showNote={false} />
            <p className="fine">New episodes straight to your inbox. No spam, unsubscribe anytime.</p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>You don&rsquo;t need to become a tech person. You need one thing that works today.</h2>
          <div className="grid">
            <div className="cell">
              <span className="e">⚡</span>
              <h3>One usable thing</h3>
              <p>Every episode hands you a single AI move you can do at nap time &mdash; not a 40-tool rabbit hole.</p>
            </div>
            <div className="cell">
              <span className="e">🌿</span>
              <h3>Stay human</h3>
              <p>AI supports you, it doesn&rsquo;t replace you. Your voice, your judgment, your attention stay at the center.</p>
            </div>
            <div className="cell">
              <span className="e">💛</span>
              <h3>No overwhelm</h3>
              <p>Short, warm, plain English &mdash; the opposite of the firehose everyone else is pointing at you.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Get the next episode the moment it drops.</h2>
          <p className="finalsub">
            Leave your email and I&rsquo;ll send each new one straight to you &mdash; and nothing else you
            didn&rsquo;t ask for.
          </p>
          <WaitlistForm cta="Send me new episodes" source="aimomeducation" showNote={false} />
        </div>
      </section>
    </main>
  )
}

const css = `
.ame { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  margin:0; color:var(--light); font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  line-height:1.55; -webkit-font-smoothing:antialiased; }
.ame .wrap { max-width:760px; margin:0 auto; padding:0 22px; }

.ame .hero { padding:clamp(56px,10vw,110px) 0 clamp(44px,7vw,80px);
  background:
    radial-gradient(120% 80% at 15% -10%, rgba(90,79,207,0.45) 0%, rgba(90,79,207,0) 55%),
    radial-gradient(90% 70% at 108% 6%, rgba(217,138,183,0.30) 0%, rgba(217,138,183,0) 50%),
    linear-gradient(160deg,#10142e 0%, var(--midnight) 48%, #131938 100%); }
.ame .eyebrow { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:0.22em;
  font-size:12px; font-weight:700; color:var(--ember); margin:0 0 18px; }
.ame h1 { font-family:Georgia,"Iowan Old Style",serif; font-weight:600; font-size:clamp(32px,6vw,54px);
  line-height:1.05; letter-spacing:-0.01em; text-wrap:balance; margin:0 0 20px; }
.ame .sub { font-size:clamp(16px,2.1vw,19px); color:rgba(245,239,230,0.82); max-width:60ch; margin:0 0 14px; }
.ame .sub strong { color:var(--light); }
.ame .tag { font-family:Georgia,serif; font-style:italic; font-size:19px; color:var(--pink); margin:0 0 30px; }
.ame .formbox { max-width:520px; }
.ame .fine { font-size:13px; opacity:0.75; margin:10px 0 0; }

.ame .band { background:var(--light); color:var(--midnight); padding:clamp(48px,7vw,82px) 0; }
.ame .band h2 { font-family:Georgia,serif; font-weight:600; font-size:clamp(23px,3.4vw,32px); line-height:1.15;
  text-wrap:balance; margin:0 0 34px; max-width:22ch; }
.ame .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
.ame .cell { }
.ame .cell .e { font-size:30px; display:block; margin-bottom:10px; }
.ame .cell h3 { font-size:17px; font-weight:800; margin:0 0 6px; color:var(--midnight); }
.ame .cell p { font-size:15px; color:#49506a; margin:0; }

.ame .final { padding:clamp(52px,8vw,96px) 0; text-align:center;
  background:linear-gradient(140deg, rgba(90,79,207,0.9), rgba(217,138,183,0.75)), var(--midnight); }
.ame .final h2 { font-family:Georgia,serif; font-weight:600; font-size:clamp(26px,4vw,40px); line-height:1.1;
  text-wrap:balance; margin:0 0 14px; color:#fff; }
.ame .finalsub { font-size:17px; color:rgba(255,255,255,0.92); max-width:48ch; margin:0 auto 26px; }
.ame .final .wl-form, .ame .final .wl-done { margin-left:auto; margin-right:auto; }

/* Waitlist form (scoped — mirrors the shared component's markup) */
.ame .wl-form { display:flex; flex-direction:column; gap:12px; max-width:520px; }
.ame .wl-row { display:grid; grid-template-columns:1fr 1.3fr; gap:12px; }
.ame .wl-form input { width:100%; box-sizing:border-box; padding:15px 16px; border-radius:12px;
  border:1px solid rgba(23,28,58,0.18); background:#fff; color:var(--midnight); font-size:16px; font-family:inherit; }
.ame .wl-form input:focus { outline:none; border-color:var(--ember); box-shadow:0 0 0 3px rgba(242,166,90,0.35); }
.ame .wl-form button { background:var(--ember); color:var(--midnight); font-weight:800; font-size:18px;
  letter-spacing:0.3px; border:none; cursor:pointer; padding:16px 28px; border-radius:999px;
  box-shadow:0 10px 30px rgba(242,166,90,0.4); transition:transform .12s ease; }
.ame .wl-form button:hover:not(:disabled) { transform:translateY(-2px); }
.ame .wl-form button:disabled { opacity:0.7; cursor:default; }
.ame .wl-fine { font-size:13px; opacity:0.8; margin:2px 0 0; }
.ame .wl-error { color:#ffd7c2; font-size:14px; margin:0; }
.ame .final .wl-error { color:#4a1530; }
.ame .wl-done { background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.4);
  border-radius:14px; padding:22px 24px; max-width:520px; font-size:19px; }

@media (max-width:620px){
  .ame .grid { grid-template-columns:1fr; gap:26px; }
  .ame .wl-row { grid-template-columns:1fr; }
}
`
