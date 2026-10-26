export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'

// The aiworksforher.com homepage — WFH (Works For Her), Mandi's business, and its four
// services: the AI Mom Podcast, Small Business AI Integration, UGC, and speaking.
// Podcast / be-a-guest / her story live at /aimom; the keynote page is /thesis.
// No email links: every service routes to an automated step (questionnaire, UGC menu)
// and ends on /meet (book a time).
export const metadata: Metadata = {
  title: 'WFH — Works For Her · AI services by Mandi Beck',
  description:
    "WFH — Works For Her, the parent company of the AI Mom Podcast, founded by Amanda \"Mandi\" Beck. Speaking, small business AI integration, UGC, the podcast, mindfulness for women, and RETIRE: passing down your business with AI.",
  openGraph: {
    title: 'WFH — Works For Her',
    description: 'By AI Mom. Podcast · Small business AI integration · UGC · Speaking.',
    url: 'https://www.aiworksforher.com',
    siteName: 'WFH — Works For Her',
    images: [{ url: '/og-wfh-v2.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'WFH — Works For Her', description: 'By AI Mom', images: ['/og-wfh-v2.png'] },
}

type Service = {
  emoji: string; name: string; who: string; what: string[]; body?: string
  cta: { label: string; href: string }; more?: { label: string; href: string }
}

const SERVICES: Service[] = [
  {
    emoji: '🎙',
    name: 'AI Mom Podcast',
    who: 'Not what to think about AI. How to think about it.',
    what: [
      'Honest conversations for women staying human while everything changes',
      'Jobs, education, creativity — and the pushback nobody else airs',
      'Have a story women need to hear? Come on the show',
    ],
    cta: { label: 'Listen', href: '/aimom' },
    more: { label: 'Be a guest', href: '/book' },
  },
  {
    emoji: '⚙️',
    name: 'Small Business AI Integration',
    who: 'You keep hearing AI will save you time. It hasn’t saved you a minute yet.',
    what: [
      'AI set up inside the tools you already use',
      'Assistants, automations, follow-ups, and content workflows',
      'Built for your business, then handed over so you can run it',
    ],
    cta: { label: 'Take the AI integration questionnaire', href: '/assessment' },
  },
  {
    emoji: '🌿',
    name: 'Mindfulness for Women',
    who: 'Prevent burnout before it costs you your business, your family, or yourself.',
    what: [
      'Guided meditations recorded by Mandi in her studio',
      'For the mother, the CEO, and the woman in you',
      'Show up for your life’s work. Show up for yourself.',
    ],
    cta: { label: 'Be There For Her', href: 'https://www.bethereforher.com' },
  },
  {
    emoji: '🎤',
    name: 'Book Mandi as a Speaker',
    who: 'Bring the conversation women need to your stage.',
    what: [
      'AI — how to think about it, and how to use it without being used by it',
      'Running a business as a mom',
      'Mindfulness in the digital age',
    ],
    cta: { label: 'Book Mandi to speak', href: '/speak' },
    more: { label: 'See the keynote', href: '/thesis' },
  },
  {
    emoji: '🎬',
    name: 'UGC for Brands',
    who: 'Trending content that gets traffic and new customers.',
    what: [
      'Hooks, scripts, and edits built for how the algorithm rewards interesting brands',
      'For brands serving women, moms, families, and wellness — and unique experiences and travel',
      'Video creation and marketing assessments, priced up front',
    ],
    cta: { label: 'See the menu & pricing', href: '/ugc' },
  },
  {
    emoji: '🔑',
    name: 'RETIRE',
    who: 'For owners ready to step back from daily involvement in their business.',
    what: [],
    body: 'Work with Mandi “AI Mom” to turn what’s in your head into guides, playbooks, and an assistant the next owner can ask, while you sip piña coladas and watch your grandbabies play on the beach.',
    cta: { label: 'Start the RETIRE questionnaire', href: '/retire' },
  },
]

function Card({ s }: { s: Service }) {
  return (
    <div className="card">
      <span className="cemoji">{s.emoji}</span>
      <h3>{s.name}</h3>
      <p className="cwho">{s.who}</p>
      {s.body ? <p className="cbody">{s.body}</p> : <ul>{s.what.map((w) => <li key={w}>{w}</li>)}</ul>}
      <div className="clinks">
        <a className="cbtn" href={s.cta.href}>{s.cta.label} →</a>
        {s.more && <a className="cmore" href={s.more.href}>{s.more.label}</a>}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="h">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />

      <section className="hero">
        <div className="glow g1" /><div className="glow g2" /><div className="glow g3" />
        <img className="drift" src="/balloon-512.png" alt="" aria-hidden="true" />
        <div className="wrap heroIn">
          <img className="logo" src="/wfh-logo-white.png" alt="AI WFH — Works For Her" />
          <p className="sub">
            WFH is the parent company of the AI Mom Podcast, founded and operated by Amanda &ldquo;Mandi&rdquo; Beck.
            She has a theory that <strong>women are the answer, and their intuition the antidote, to mankind&rsquo;s
            potential for coexistence with exponential technology.</strong>
          </p>
          <div className="glass">
            <p className="whether">You can work with her in several ways:</p>
            <ul className="fits">
              <li><a href="/speak"><span>🎤</span>Hire her to speak on your stage</a></li>
              <li><a href="/assessment"><span>⚙️</span>Assess your business for AI integration</a></li>
              <li><a href="/assessment"><span>📱</span>Assess your social media for AI integration</a></li>
              <li><a href="/ugc"><span>🎬</span>Hire her for UGC</a></li>
              <li><a href="/aimom"><span>🎙</span>Tune into the podcast</a></li>
              <li><a href="https://www.bethereforher.com"><span>🌿</span>Prevent burnout with meditation</a></li>
              <li className="wide"><a href="/retire"><span>🔑</span>RETIRE: step back from your business with the help of AI</a></li>
            </ul>
          </div>
          <p className="sub pick">Pick where you fit. Start there.</p>
          <div className="ctaRow">
            <a className="cta" href="#services">See the services</a>
            <a className="cta ghost" href="/aimom">Meet AI Mom →</a>
          </div>
        </div>
      </section>

      <section className="tier" id="services">
        <div className="wrap">
          <p className="tag">HIRE MANDI</p>
          <h2>Six ways to work together.</h2>
          <div className="grid">{SERVICES.map((s) => <Card s={s} key={s.name} />)}</div>
        </div>
      </section>

      {/* The philosophy — the mindfulness behind the business → Be There For Her */}
      <section className="philo">
        <div className="wrap">
          <p className="tag light">THE PHILOSOPHY</p>
          <h2>The mindfulness behind the business.</h2>
          <p className="plead">
            For the mother, the leader, and the CEO. It is our responsibility to protect our feminine nature. Prevent burnout
            with mindfulness. For beginners to advanced practitioners, these audios and guides are sure to help you show up
            more fully to your life&rsquo;s work, your business, and your family.
          </p>
          <div className="trio">
            <div><span>🌙</span><h3>The mother in you</h3><p>Present with your family, not just there.</p></div>
            <div><span>🗝</span><h3>The CEO in you</h3><p>Clear decisions from a calm mind, not an empty tank.</p></div>
            <div><span>🌿</span><h3>The woman in you</h3><p>Room to come back to yourself, every single day.</p></div>
          </div>
          <a className="cta light" href="https://www.bethereforher.com">This is where you learn to listen to your intuition again →</a>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <h2>How it works</h2>
          <ol>
            <li><strong>Pick a service.</strong></li>
            <li><strong>Take the quick questionnaire</strong> for an instant AI assessment &mdash; or pick from the UGC &amp; marketing menu.</li>
            <li><strong>Book a time with Mandi</strong> right on the page. You&rsquo;ll receive a link for Google Meet.</li>
          </ol>
          <p className="unsure">
            Not sure where you fit? <a href="/assessment">Start with the questionnaire</a> &mdash; it&rsquo;ll show you where AI can help most.
          </p>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="social">
            <a href="/aimom">Podcast</a>
            <a href="/book">Be a guest</a>
            <a href="/thesis">Speaking</a>
            <a href="/ugc">UGC &amp; marketing</a>
            <a href="/assessment">AI questionnaire</a>
            <a href="https://instagram.com/aimompodcast">@aimompodcast</a>
            <a href="https://linkedin.com/in/amanda-beck-588200378">LinkedIn</a>
          </div>
          <p className="fname">WFH · Works For Her · Mandi Beck, the AI Mom · From invisible to impactful.</p>
        </div>
      </footer>
    </main>
  )
}

const css = `
.h { --midnight:#171C3A; --nebula:#5A4FCF; --copper:#C2693F; --ember:#F2A65A; --cream:#FBF7F1;
  background:var(--cream); color:var(--midnight); line-height:1.65; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.h .wrap { max-width:1080px; margin:0 auto; padding:0 24px; }
.h h1,.h h2,.h h3 { font-family:Georgia,"Times New Roman",serif; letter-spacing:-0.3px; }
.h section { padding:72px 0; }
.h em { font-style:italic; }
.h .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--copper); margin:0 0 10px; }
.h .tag.light { color:var(--ember); }
.h .ctaRow { display:flex; gap:12px; flex-wrap:wrap; margin-top:26px; }
.h .cta { display:inline-block; background:var(--nebula); color:#fff; font-weight:800; font-size:16px;
  text-decoration:none; padding:14px 26px; border-radius:999px; box-shadow:0 10px 26px rgba(90,79,207,0.3); transition:transform .12s ease; }
.h .cta:hover { transform:translateY(-2px); }
.h .cta.ghost { background:rgba(255,255,255,0.06); color:#fff; box-shadow:0 10px 26px rgba(0,0,0,0.25); border:1.5px solid rgba(255,255,255,0.6); }

/* Hero — night sky with depth: layered glows, faint stars, a drifting balloon, glass panel */
.h .hero { position:relative; overflow:hidden; isolation:isolate; color:var(--cream); padding:88px 0 96px;
  background:
    radial-gradient(1100px 560px at 50% -12%, rgba(90,79,207,0.55), transparent 62%),
    radial-gradient(760px 520px at 105% 105%, rgba(226,80,138,0.30), transparent 60%),
    radial-gradient(640px 520px at -8% 92%, rgba(242,166,90,0.20), transparent 60%),
    linear-gradient(180deg,#0f0b26 0%,#17123a 55%,#221a52 100%);
  border-radius:0 0 44px 44px; box-shadow:0 40px 70px -40px rgba(23,28,58,0.65); }
.h .hero::before { content:''; position:absolute; inset:0; z-index:-1; opacity:.55; pointer-events:none;
  background-image:
    radial-gradient(1.2px 1.2px at 12% 18%, #fff, transparent 60%), radial-gradient(1px 1px at 78% 12%, #fff, transparent 60%),
    radial-gradient(1.4px 1.4px at 64% 38%, #fff, transparent 60%), radial-gradient(1px 1px at 30% 62%, #fff, transparent 60%),
    radial-gradient(1.2px 1.2px at 88% 70%, #fff, transparent 60%), radial-gradient(1px 1px at 46% 84%, #fff, transparent 60%),
    radial-gradient(1px 1px at 6% 48%, #fff, transparent 60%), radial-gradient(1.3px 1.3px at 94% 34%, #fff, transparent 60%);
  background-size:520px 520px; }
.h .hero .glow { position:absolute; z-index:-1; border-radius:50%; filter:blur(70px); opacity:.5; pointer-events:none; animation:wfhDrift 16s ease-in-out infinite alternate; }
.h .hero .g1 { width:420px; height:420px; background:#5A4FCF; top:-140px; left:8%; }
.h .hero .g2 { width:360px; height:360px; background:#E2508A; bottom:-160px; right:4%; animation-delay:-6s; }
.h .hero .g3 { width:280px; height:280px; background:#F2A65A; top:38%; left:-120px; opacity:.32; animation-delay:-11s; }
.h .hero .drift { position:absolute; z-index:-1; width:150px; right:7%; top:84px; opacity:.92; pointer-events:none;
  filter:drop-shadow(0 24px 40px rgba(226,80,138,0.35)); animation:wfhFloat 7s ease-in-out infinite; }
@keyframes wfhDrift { from { transform:translate(0,0) scale(1); } to { transform:translate(40px,30px) scale(1.12); } }
@keyframes wfhFloat { 0%,100% { transform:translateY(0) rotate(-2deg); } 50% { transform:translateY(-16px) rotate(2deg); } }
@media (prefers-reduced-motion:reduce){ .h .hero .glow, .h .hero .drift { animation:none; } }
.h .hero .heroIn { position:relative; max-width:860px; text-align:center; }
.h .hero .logo { display:block; width:min(360px,78vw); height:auto; margin:0 auto 26px; filter:drop-shadow(0 10px 30px rgba(0,0,0,0.35)); }
.h .hero .sub { font-size:19px; line-height:1.65; color:#e9e4f5; max-width:720px; margin:0 auto 22px; }
.h .hero .sub strong { font-weight:700; background:linear-gradient(90deg,#fff,#F7C79A 55%,#F4A3C4); -webkit-background-clip:text; background-clip:text; color:transparent; }
.h .hero .glass { max-width:780px; margin:0 auto 22px; padding:20px 20px 16px; border-radius:24px; text-align:left;
  background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 50px -30px rgba(0,0,0,0.6); }
.h .hero .whether { margin:0 0 12px; font-size:13px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:var(--ember); text-align:center; }
.h .hero .fits { list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.h .hero .fits li.wide { grid-column:1 / -1; }
.h .hero .fits a { display:flex; align-items:center; gap:10px; height:100%; padding:12px 14px; border-radius:14px; font-size:16px; font-weight:600;
  color:#fff; text-decoration:none; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);
  transition:transform .15s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease; }
.h .hero .fits a span { flex:none; font-size:18px; }
.h .hero .fits a:hover { transform:translateY(-2px); background:rgba(255,255,255,0.10); border-color:rgba(242,166,90,0.6); box-shadow:0 12px 24px -14px rgba(0,0,0,0.6); }
.h .hero .pick { margin-bottom:0; font-weight:600; }
.h .hero .ctaRow { justify-content:center; }

.h .tier h2 { font-size:clamp(24px,4vw,34px); margin:0 0 28px; }
.h .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
@media (max-width:960px){ .h .grid { grid-template-columns:repeat(2,1fr); } }
.h .card { display:flex; flex-direction:column; background:#fff; border:1px solid #e7e0d3; border-radius:18px; padding:24px 22px; }
.h .cemoji { font-size:30px; }
.h .card h3 { font-size:22px; margin:4px 0 8px; }
.h .cwho { font-size:16px; color:#3f3a52; margin:0 0 12px; font-style:italic; }
.h .card ul { margin:0 0 18px; padding-left:20px; color:#4a4560; font-size:15px; flex:1; }
.h .card li { margin-bottom:6px; }
.h .cbody { margin:0 0 18px; color:#4a4560; font-size:15px; flex:1; }
.h .clinks { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.h .cbtn, .h .cmore { display:inline-block; font-weight:800; font-size:15px; text-decoration:none; padding:11px 20px; border-radius:999px;
  transition:transform .15s ease, box-shadow .15s ease; }
.h .cbtn { background:var(--nebula); color:#fff; box-shadow:0 10px 24px rgba(90,79,207,0.32); }
.h .cmore { background:#fff; color:var(--nebula); border:1.5px solid rgba(90,79,207,0.35); box-shadow:0 8px 20px rgba(23,28,58,0.10); }
.h .cbtn:hover, .h .cmore:hover, .h .cta:hover { transform:translateY(-3px); box-shadow:0 16px 32px rgba(90,79,207,0.38); }

.h .philo { background:linear-gradient(165deg,#2a1c3f,var(--nebula) 70%,var(--copper)); color:#fff; text-align:center; padding:84px 0; }
.h .philo h2 { font-size:clamp(26px,4.4vw,40px); line-height:1.15; margin:0 auto 16px; max-width:760px; color:#fff; }
.h .philo .plead { font-size:19px; color:#efe9f7; max-width:720px; margin:0 auto 36px; }
.h .philo .trio { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin:0 0 36px; }
.h .philo .trio div { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); border-radius:18px; padding:24px 18px; }
.h .philo .trio span { font-size:28px; }
.h .philo .trio h3 { font-size:21px; margin:8px 0 6px; color:#fff; }
.h .philo .trio p { margin:0; color:#e7e2f2; font-size:16px; }
.h .cta.light { background:#fff; color:var(--nebula); box-shadow:0 10px 26px rgba(0,0,0,0.2); }
.h .how h2 { font-size:clamp(24px,4vw,32px); margin:0 0 18px; }
.h .how ol { font-size:18px; color:#3f3a52; max-width:720px; padding-left:24px; margin:0 0 20px; }
.h .how li { margin-bottom:10px; }
.h .how .unsure { font-size:17px; color:#3f3a52; max-width:720px; }
.h .how .unsure a { color:var(--nebula); font-weight:800; }


.h .foot { background:var(--midnight); color:#cfc9dd; text-align:center; padding:44px 0; }
.h .foot .social { display:flex; gap:18px; justify-content:center; flex-wrap:wrap; margin:0 0 18px; }
.h .foot .social a { color:#cfc9dd; text-decoration:none; font-size:14px; font-weight:600; }
.h .foot .social a:hover { color:#fff; }
.h .foot .fname { font-size:13px; color:#8782a0; margin:0; }

@media (max-width:620px){
  .h .grid { grid-template-columns:1fr; }
  .h .hero { padding:56px 0 64px; border-radius:0 0 28px 28px; }
  .h .hero .heroIn { text-align:left; }
  .h .hero .logo { margin:0 0 22px; width:min(280px,74vw); }
  .h .hero .sub { margin-left:0; font-size:17.5px; }
  .h .hero .fits { grid-template-columns:1fr; }
  .h .hero .whether { text-align:left; }
  .h .hero .ctaRow { justify-content:flex-start; }
  .h .hero .drift { width:76px; top:20px; right:14px; opacity:.75; }
  .h .philo .trio { grid-template-columns:1fr; }
  .h section { padding:56px 0; }
}
`
