export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import WaitlistForm from '@/components/funnel/WaitlistForm'

export const metadata: Metadata = {
  title: 'The Caption Keeper — a journal that talks back, and keeps every caption',
  description:
    'Write it out. It writes back — not advice, not a to-do list. It hears the feeling under your words, walks you toward peace, and keeps what you wrote. Join the waitlist.',
}

// Waitlist landing page for The Caption Keeper (the coming-soon app: a journal
// that talks back + writes and keeps your captions). No checkout — collects
// emails via /api/journal-waitlist, tagged source "caption-keeper".
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

function MetaPixel() {
  if (!META_PIXEL) return null
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL}');fbq('track','PageView');
` }} />
      <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL}&ev=PageView&noscript=1`} /></noscript>
    </>
  )
}

const VISION_PROMPTS: { emoji: string; name: string; line: string }[] = [
  { emoji: '🔮', name: 'Letter from Future Her', line: '“It’s 2027. Write to yourself from there…”' },
  { emoji: '✨', name: 'Who I Am Becoming', line: '“I am a woman who…”' },
  { emoji: '🌱', name: 'The Season I’m In', line: '“This is the season of…”' },
  { emoji: '❤️', name: 'Why This Matters', line: '“The real reason I’m building this is…”' },
  { emoji: '🚫', name: 'No Longer Available For', line: '“I am no longer available for…”' },
  { emoji: '📌', name: 'Evidence I’m Becoming Her', line: '“Proof that I’m already becoming her…”' },
]

export default function CaptionKeeperLanding() {
  return (
    <main className="jr">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">THE CAPTION KEEPER · BY AI MOM · COMING SOON</p>
          <h1>Write it all out. This time, it writes back.</h1>
          <p className="sub">
            You put the day down &mdash; the real, messy version &mdash; and instead of a blank page
            staring back, <strong>it answers.</strong>{' '}It hears the feeling under your words and
            walks you toward a little peace. And when you&rsquo;re ready, it keeps what you wrote
            &mdash; turning it into a caption you can post, or a page you can come back to.
          </p>
          <p className="tag">A journal that talks back &mdash; and keeps every caption.</p>
          <div className="formbox">
            <WaitlistForm cta="Join the waitlist" source="caption-keeper" />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>You don&rsquo;t need another app that asks you to <em>do</em> more.</h2>
          <p>
            You need a place to put the day down. Most journaling apps hand you a blank page and a
            guilt-inducing streak counter. This one meets you where you actually are &mdash; tired,
            wide open, a little raw &mdash; and answers like a wise friend who was listening the
            whole time.
          </p>
          <p className="reframe">Writing is the point. Not productivity. Not posting. <em>You.</em></p>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <h2>How it talks back</h2>
          <p className="lead">Every time you write, it answers in the same gentle arc:</p>
          <ol className="arc">
            <li><strong>It hears the feeling first.</strong> It names what was underneath &mdash; the thing you didn&rsquo;t label. You think, <em>oh. It actually heard me.</em></li>
            <li><strong>It sorts what&rsquo;s yours to carry.</strong> One honest sentence separating what&rsquo;s in your hands from what never was. No lecture.</li>
            <li><strong>It shows you the evidence.</strong> It remembers who you said you&rsquo;re becoming &mdash; and quotes you back to yourself when you&rsquo;re already becoming her.</li>
            <li><strong>It leaves you lighter.</strong> One small question that deepens the story, or permission to let it be: <em>&ldquo;that one might just need to be felt, not fixed.&rdquo;</em></li>
          </ol>
          <p className="law">It will <strong>never</strong> push you to &ldquo;turn this into content.&rdquo; That&rsquo;s a door you can open when you want it &mdash; never the thing it does to you.</p>
        </div>
      </section>

      <section className="how keeper">
        <div className="wrap">
          <h2>And it keeps every word</h2>
          <p className="lead">It&rsquo;s not a journal you close and forget. It&rsquo;s a <em>keeper.</em></p>
          <ol className="arc">
            <li><strong>Nothing you write is ever lost.</strong> Every entry is held &mdash; your words are your vault, not fuel for a feed.</li>
            <li><strong>When a page wants to become a post,</strong> say the word: it shapes what you wrote into a caption in your voice &mdash; the door you chose to open.</li>
            <li><strong>Your captions live in one place</strong> &mdash; a home for everything you&rsquo;ve made and everything you might.</li>
          </ol>
          <p className="law">That&rsquo;s the &ldquo;Keeper&rdquo; in Caption Keeper: it holds your whole story, and hands you back the parts worth sharing.</p>
        </div>
      </section>

      <section className="band promptme">
        <div className="wrap">
          <h2><span className="spark">✨</span> Don&rsquo;t know where to start? Tap <em>Prompt Me.</em></h2>
          <p>One easy question &mdash; answerable in a sentence, but it opens a door. No streaks, no
            guilt. Tap it again for a new one, no questions asked.</p>
          <div className="promptcards">
            <blockquote>&ldquo;What&rsquo;s one moment from today you&rsquo;d keep?&rdquo;</blockquote>
            <blockquote>&ldquo;What drained you today &mdash; and when did you first feel it?&rdquo;</blockquote>
            <blockquote>&ldquo;Who did you feel most yourself around this week?&rdquo;</blockquote>
          </div>
        </div>
      </section>

      <section className="vision">
        <div className="wrap">
          <h2>And when you&rsquo;re ready for deeper water</h2>
          <p className="lead">Six prompts that don&rsquo;t just record your life &mdash; they remember who
            you&rsquo;re becoming, and show you the proof:</p>
          <div className="vgrid">
            {VISION_PROMPTS.map((p) => (
              <div className="vcard" key={p.name}>
                <span className="vemoji">{p.emoji}</span>
                <div>
                  <p className="vname">{p.name}</p>
                  <p className="vline">{p.line}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band who">
        <div className="wrap">
          <h2>Who it&rsquo;s for</h2>
          <p>The woman who writes at midnight and never reads it back. Who has a rich inner life and
            no room to hear it. Who&rsquo;s tired of apps that turn her feelings into tasks &mdash; and
            who, some days, has something worth sharing but no easy way to say it. If that&rsquo;s you
            &mdash; this was built for you.</p>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Be the first through the door.</h2>
          <p className="finalsub">It&rsquo;s coming soon. Leave your email and I&rsquo;ll write to you
            the moment it opens &mdash; founding pricing for the waitlist, always.</p>
          <div className="formbox dark">
            <WaitlistForm cta="Save my spot" source="caption-keeper" />
          </div>
        </div>
      </section>
    </main>
  )
}

const css = `
.jr { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  line-height:1.6; margin:0; }
.jr .wrap { max-width:760px; margin:0 auto; padding:0 24px; }
.jr h1,.jr h2,.jr blockquote,.jr .tag { font-family:Georgia,"Times New Roman",serif; }
.jr h1 { font-size:clamp(28px,5vw,44px); line-height:1.15; letter-spacing:-0.5px; margin:0 0 20px; }
.jr h2 { font-size:clamp(24px,4vw,34px); line-height:1.2; margin:0 0 18px; }
.jr section { padding:56px 0; }
.jr .hero { background:linear-gradient(160deg,var(--midnight),#25204d 70%,var(--nebula)); color:var(--light); padding:80px 0 72px; }
.jr .hero h1 { color:#fff; }
.jr .eyebrow { letter-spacing:3px; font-size:13px; font-weight:700; color:var(--ember); margin:0 0 18px; }
.jr .sub { font-size:19px; color:#e7e2f2; }
.jr .sub strong,.jr .hero strong { color:#fff; }
.jr .tag { font-size:22px; color:var(--pink); margin:22px 0 26px; font-style:italic; }
.jr .band { background:#fff; }
.jr em { font-style:italic; color:var(--nebula); }
.jr .reframe { font-size:22px; font-family:Georgia,serif; margin-top:22px; }
.jr .lead { font-size:19px; }
.jr .arc { padding-left:22px; font-size:18px; margin:20px 0 0; }
.jr .arc li { margin:14px 0; }
.jr .arc em { color:var(--nebula); }
.jr .keeper { background:var(--light); }
.jr .law { margin-top:26px; background:#f6edf3; border-left:6px solid var(--pink); padding:16px 20px; border-radius:12px; font-size:17px; }
.jr .promptme .spark { color:var(--ember); }
.jr .promptcards { display:grid; gap:14px; margin-top:22px; }
.jr .promptcards blockquote { background:var(--light); border:1px solid #e7e0d3; border-radius:14px;
  margin:0; padding:16px 20px; font-size:19px; color:var(--midnight); }
.jr .vision { background:#fff; }
.jr .vgrid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:22px; }
.jr .vcard { display:flex; gap:12px; align-items:flex-start; background:var(--light); border:1px solid #e7e0d3;
  border-radius:14px; padding:16px 18px; }
.jr .vemoji { font-size:22px; line-height:1.3; }
.jr .vname { font-weight:700; margin:0 0 2px; font-size:16px; }
.jr .vline { margin:0; font-size:14px; color:#6a6280; font-style:italic; }
.jr .final { background:linear-gradient(160deg,var(--nebula),var(--pink)); color:#fff; text-align:center; }
.jr .final h2 { color:#fff; }
.jr .finalsub { font-size:18px; color:#f4ecf6; max-width:560px; margin:0 auto 8px; }

/* Waitlist form */
.jr .formbox { margin-top:26px; }
.jr .wl-form { display:flex; flex-direction:column; gap:12px; max-width:520px; }
.jr .final .wl-form { margin:26px auto 0; }
.jr .wl-row { display:grid; grid-template-columns:1fr 1.3fr; gap:12px; }
.jr .wl-form input { width:100%; box-sizing:border-box; padding:15px 16px; border-radius:12px;
  border:1px solid rgba(255,255,255,0.35); background:rgba(255,255,255,0.96); color:var(--midnight);
  font-size:16px; font-family:inherit; }
.jr .wl-form input:focus { outline:none; border-color:var(--ember); box-shadow:0 0 0 3px rgba(242,166,90,0.35); }
.jr .wl-form button { background:var(--ember); color:var(--midnight); font-weight:800; font-size:18px;
  letter-spacing:0.3px; border:none; cursor:pointer; padding:16px 28px; border-radius:999px;
  box-shadow:0 10px 30px rgba(242,166,90,0.4); transition:transform .12s ease; }
.jr .wl-form button:hover:not(:disabled) { transform:translateY(-2px); }
.jr .wl-form button:disabled { opacity:0.7; cursor:default; }
.jr .wl-fine { font-size:13px; opacity:0.8; margin:2px 0 0; }
.jr .wl-error { color:#ffd7c2; font-size:14px; margin:0; }
.jr .final .wl-error { color:#5a1d1d; }
.jr .wl-done { background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.4);
  border-radius:14px; padding:22px 24px; max-width:520px; font-size:19px; }
.jr .final .wl-done { margin:26px auto 0; }

@media (max-width:560px){
  .jr .vgrid { grid-template-columns:1fr; }
  .jr .wl-row { grid-template-columns:1fr; }
}
`
