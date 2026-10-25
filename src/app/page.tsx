export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'

// The aiworksforher.com homepage — WFH (Works For Her), Mandi's business, and its four
// services: the AI Mom Podcast, Small Business AI Integration, UGC, and speaking.
// Podcast / be-a-guest / her story live at /aimom; the keynote page is /thesis.
export const metadata: Metadata = {
  title: 'WFH — Works For Her · AI services by Mandi Beck',
  description:
    "WFH — Works For Her. Mandi Beck's AI services: the AI Mom Podcast, AI integration for small businesses, UGC for brands, and speaking on AI, new-age business models for women, and mindfulness in the digital age.",
}

const EMAIL = 'hi@aimomeducation.com'
const mail = (subject: string) => `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`

type Service = {
  emoji: string; name: string; who: string; what: string[]
  cta: { label: string; href: string }; more?: { label: string; href: string }
}

const SERVICES: Service[] = [
  {
    emoji: '🎙',
    name: 'The AI Mom Podcast',
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
    cta: { label: 'Tell me what to fix', href: mail('Small Business AI Integration') },
  },
  {
    emoji: '🎬',
    name: 'UGC for Brands',
    who: 'Real-mom content your customers actually trust.',
    what: [
      'Authentic, on-camera video from a real mom of five',
      'Hooks, scripts, and edits built for how the algorithm rewards',
      'For brands serving women, moms, families, and wellness',
    ],
    cta: { label: 'Work with me on UGC', href: mail('UGC collaboration') },
  },
  {
    emoji: '🎤',
    name: 'Book Me as a Speaker',
    who: 'Bring the conversation women need to your stage.',
    what: [
      'AI — how to think about it, and how to use it without being used by it',
      'New-age business models for women',
      'Mindfulness in the digital age',
    ],
    cta: { label: 'Book me to speak', href: mail('Speaking inquiry') },
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

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">WFH · WORKS FOR HER</p>
          <h1>AI that <em>works for her.</em></h1>
          <p className="sub">
            I&rsquo;m Mandi Beck &mdash; the AI Mom. WFH is my business: a podcast, AI integration for small
            businesses, real-mom UGC for brands, and talks on AI, new-age business for women, and
            mindfulness in the digital age. Pick where you fit. Start there.
          </p>
          <div className="ctaRow">
            <a className="cta" href="#services">See the services</a>
            <a className="cta ghost" href="/aimom">Meet the AI Mom →</a>
          </div>
        </div>
      </section>

      <section className="tier" id="services">
        <div className="wrap">
          <p className="tag">WHAT WFH DOES</p>
          <h2>Four ways to work with me.</h2>
          <div className="grid">{SERVICES.map((s) => <Card s={s} key={s.name} />)}</div>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <h2>How it works</h2>
          <ol>
            <li><strong>Pick a service</strong> and tap the button &mdash; it opens an email to me.</li>
            <li><strong>Tell me one line</strong> about what you need. That&rsquo;s it.</li>
            <li><strong>I reply with next steps</strong> and a time to talk on Google Meet.</li>
          </ol>
          <p className="unsure">
            Not sure where you fit? <a href={mail('Which WFH service is right for me?')}>Email me and ask.</a> I&rsquo;ll tell you honestly.
          </p>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="social">
            <a href="/aimom">Podcast</a>
            <a href="/book">Be a guest</a>
            <a href="/thesis">Speaking</a>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
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
.h .hero .eyebrow { letter-spacing:3px; font-size:13px; font-weight:800; color:var(--ember); margin:0 0 18px; }
.h .hero h1 { font-size:clamp(32px,5.5vw,54px); line-height:1.1; margin:0 0 20px; color:#fff; max-width:820px; }
.h .hero h1 em { color:var(--ember); }
.h .hero .sub { font-size:19px; color:#e7e2f2; max-width:640px; margin:0; }

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
  .h section { padding:56px 0; }
}
`
