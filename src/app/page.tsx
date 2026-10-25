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
    "WFH — Works For Her. Mandi Beck's AI services: the AI Mom Podcast, AI integration for small businesses, UGC for brands, and speaking on AI, running a business as a mom, and mindfulness in the digital age.",
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
  emoji: string; name: string; who: string; what: string[]
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
    emoji: '🎤',
    name: 'Book Me as a Speaker',
    who: 'Bring the conversation women need to your stage.',
    what: [
      'AI — how to think about it, and how to use it without being used by it',
      'Running a business as a mom',
      'Mindfulness in the digital age',
    ],
    cta: { label: 'Book me to speak', href: '/meet?service=speaking' },
    more: { label: 'See the keynote', href: '/thesis' },
  },
]

function Card({ s }: { s: Service }) {
  return (
    <div className="card">
      <span className="cemoji">{s.emoji}</span>
      <h3>{s.name}</h3>
      <p className="cwho">{s.who}</p>
      <ul>{s.what.map((w) => <li key={w}>{w}</li>)}</ul>
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
        <div className="wrap">
          <img className="logo" src="/wfh-logo-white.png" alt="AI WFH — Works For Her" />
          <p className="sub">
            WFH is the umbrella for all things AI, business development, and social media. It stands for
            <strong> Works For Her</strong> &mdash; because it gets you working from home, or from wherever you
            want in the world.
          </p>
          <p className="sub whether">Whether you want to:</p>
          <ul className="fits">
            <li><a href="/meet?service=speaking">Invite me to speak on your stage</a></li>
            <li><a href="/assessment">Assess your business or social media for AI integration</a></li>
            <li><a href="/ugc">Hire me for UGC</a></li>
            <li><a href="/aimom">Just tune in and hear what a mom of four and solopreneur has to say about mindfulness in the digital age</a></li>
          </ul>
          <p className="sub">Pick where you fit. Start there.</p>
          <div className="ctaRow">
            <a className="cta" href="#services">See the services</a>
            <a className="cta ghost" href="/aimom">Meet AI Mom →</a>
          </div>
        </div>
      </section>

      <section className="tier" id="services">
        <div className="wrap">
          <p className="tag">WHAT WFH DOES</p>
          <h2>4 ways I work for you.</h2>
          <div className="grid">{SERVICES.map((s) => <Card s={s} key={s.name} />)}</div>
        </div>
      </section>

      {/* The philosophy — the mindfulness behind the business → Be There For Her */}
      <section className="philo">
        <div className="wrap">
          <p className="tag light">THE PHILOSOPHY</p>
          <h2>The mindfulness behind the business.</h2>
          <p className="plead">
            For the mother in you, the CEO in you, and the woman in you. Prevent burnout with mindful
            products that help you show up more fully to your life&rsquo;s work, your business, and your family.
          </p>
          <div className="trio">
            <div><span>🌙</span><h3>The mother in you</h3><p>Present with your family, not just there.</p></div>
            <div><span>🗝</span><h3>The CEO in you</h3><p>Clear decisions from a calm mind, not an empty tank.</p></div>
            <div><span>🌿</span><h3>The woman in you</h3><p>Room to come back to yourself, every single day.</p></div>
          </div>
          <a className="cta light" href="https://www.bethereforher.com">This is where we connect: Be There For Her →</a>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <h2>How it works</h2>
          <ol>
            <li><strong>Pick a service.</strong></li>
            <li><strong>Take the quick questionnaire</strong> for an instant AI assessment &mdash; or pick from the UGC &amp; marketing menu.</li>
            <li><strong>Book a time with me</strong> right on the page. We meet on Google Meet.</li>
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
.h .cta.ghost { background:transparent; color:#fff; box-shadow:none; border:1.5px solid rgba(255,255,255,0.6); }

.h .hero { background:linear-gradient(165deg,var(--midnight),#241f49 62%,var(--nebula)); color:var(--cream); padding:88px 0; }
.h .hero .logo { display:block; width:min(340px,78vw); height:auto; margin:0 0 28px; }
.h .hero .eyebrow { letter-spacing:3px; font-size:13px; font-weight:800; color:var(--ember); margin:0 0 18px; }
.h .hero h1 { font-size:clamp(32px,5.5vw,54px); line-height:1.1; margin:0 0 20px; color:#fff; max-width:820px; }
.h .hero h1 em { color:var(--ember); }
.h .hero .sub { font-size:19px; color:#e7e2f2; max-width:640px; margin:0 0 14px; }
.h .hero .sub strong { color:#fff; }
.h .hero .whether { margin-bottom:8px; }
.h .hero .fits { list-style:none; padding:0; margin:0 0 18px; max-width:640px; display:grid; gap:8px; }
.h .hero .fits li { position:relative; padding-left:24px; font-size:17px; }
.h .hero .fits li::before { content:'→'; position:absolute; left:0; color:var(--ember); font-weight:800; }
.h .hero .fits a { color:#fff; text-decoration:none; border-bottom:1px solid rgba(242,166,90,0.5); }
.h .hero .fits a:hover { border-color:var(--ember); }

.h .tier h2 { font-size:clamp(24px,4vw,34px); margin:0 0 28px; }
.h .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }
.h .card { display:flex; flex-direction:column; background:#fff; border:1px solid #e7e0d3; border-radius:18px; padding:24px 22px; }
.h .cemoji { font-size:30px; }
.h .card h3 { font-size:22px; margin:4px 0 8px; }
.h .cwho { font-size:16px; color:#3f3a52; margin:0 0 12px; font-style:italic; }
.h .card ul { margin:0 0 18px; padding-left:20px; color:#4a4560; font-size:15px; flex:1; }
.h .card li { margin-bottom:6px; }
.h .clinks { display:flex; gap:18px; align-items:center; flex-wrap:wrap; }
.h .cmore { font-weight:700; color:#6b6585; text-decoration:none; font-size:15px; }
.h .cmore:hover { color:var(--nebula); }
.h .cbtn { font-weight:800; color:var(--nebula); text-decoration:none; border-bottom:2px solid rgba(90,79,207,0.3); }
.h .cbtn:hover { border-color:var(--nebula); }

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
  .h .philo .trio { grid-template-columns:1fr; }
  .h section { padding:56px 0; }
}
`
