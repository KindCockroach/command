export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'

// The aiworksforher.com homepage — an overview of every AI service Mandi offers.
// Podcast, be-a-guest, speaking and her story live at /aimom (the former homepage).
// Prices are the founding prices from the Oct 2026 offer menu; each card books by email.
export const metadata: Metadata = {
  title: 'AI Works For Her — AI services by Mandi Beck',
  description:
    "AI set up for your real life, your family, and your business — by Mandi Beck, the AI Mom. Setup sessions, camera roll rescue, content days, done-with-you builds, and automation work.",
}

const EMAIL = 'hi@aimomeducation.com'
const book = (subject: string) => `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`

type Service = { emoji: string; name: string; price: string; who: string; what: string[]; cta: string }

const START: Service[] = [
  {
    emoji: '⚙️',
    name: 'AI Setup Session',
    price: '$97 founding · then $150',
    who: 'You keep hearing AI will save you time. It hasn’t saved you a minute yet.',
    what: [
      '1:1 on Google Meet, about 90 minutes',
      'Your AI set up for YOUR life — your voice, your calendar, your to-do pile',
      'You leave with prompts you’ll actually use tomorrow',
    ],
    cta: 'Book my setup',
  },
  {
    emoji: '🏡',
    name: 'Family AI Session',
    price: '$90',
    who: 'Your kids are already using AI. Decide the rules before it decides them.',
    what: [
      'For parents, or parents + kids together',
      'What’s safe, what’s cheating, what’s actually useful for school',
      'A simple house AI agreement you write together',
    ],
    cta: 'Book a family session',
  },
  {
    emoji: '📸',
    name: 'Camera Roll Rescue',
    price: '$200',
    who: 'Thousands of photos and videos. Zero idea what to do with them.',
    what: [
      'We sort the chaos into the stories worth telling',
      'Find your golden thread — the thing you keep living and never post',
      'Leave with folders, a shortlist, and what to post first',
    ],
    cta: 'Rescue my camera roll',
  },
]

const BUILD: Service[] = [
  {
    emoji: '🎬',
    name: 'Content Day',
    price: '$350',
    who: 'You know you should be showing up. You just can’t make it a daily job.',
    what: [
      'One planned shoot day — we film a batch together',
      'AI turns it into scripts, hooks, captions, and a posting plan',
      'Weeks of content from one day',
    ],
    cta: 'Book a content day',
  },
  {
    emoji: '🛠',
    name: 'Build With Me Live',
    price: '$97',
    who: 'You want to build something with AI, and you learn best by watching it done.',
    what: [
      'A live group workshop — I build, you build alongside',
      'A real tool, finished by the end of the session',
      'The recording and prompts are yours',
    ],
    cta: 'Save my spot',
  },
  {
    emoji: '🚀',
    name: 'Build It With Me',
    price: '$1,500 founding · 2 spots',
    who: 'You have the idea. Stop sitting on it.',
    what: [
      'Three 90-minute done-with-you build sessions',
      'Your AI product, workflow, or digital offer — built and launched',
      'Founding price for the first two women only',
    ],
    cta: 'Claim a founding spot',
  },
  {
    emoji: '🔁',
    name: 'AI Automation Work',
    price: '$85–125/hr · 10-hour blocks',
    who: 'For business owners who want it done for them, not taught to them.',
    what: [
      'Automations, assistants, and workflows built inside your tools',
      'Emails, follow-ups, scheduling, content pipelines',
      'Booked in 10-hour blocks so the work actually ships',
    ],
    cta: 'Tell me what to automate',
  },
]

function Card({ s }: { s: Service }) {
  return (
    <div className="card">
      <div className="ctop">
        <span className="cemoji">{s.emoji}</span>
        <span className="cprice">{s.price}</span>
      </div>
      <h3>{s.name}</h3>
      <p className="cwho">{s.who}</p>
      <ul>{s.what.map((w) => <li key={w}>{w}</li>)}</ul>
      <a className="cbtn" href={book(s.name)}>{s.cta} →</a>
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
          <p className="eyebrow">AI WORKS FOR HER</p>
          <h1>Stop learning AI. <em>Make it work for you.</em></h1>
          <p className="sub">
            I&rsquo;m Mandi &mdash; the AI Mom. I set AI up for your real life, your family, and your
            business, so it carries the load instead of adding to it. Pick where you are. Start there.
          </p>
          <div className="ctaRow">
            <a className="cta" href="#start">See the services</a>
            <a className="cta ghost" href="/aimom">The podcast &amp; speaking →</a>
          </div>
        </div>
      </section>

      <section className="tier" id="start">
        <div className="wrap">
          <p className="tag">START HERE</p>
          <h2>Get AI working in your life this week.</h2>
          <div className="grid">{START.map((s) => <Card s={s} key={s.name} />)}</div>
        </div>
      </section>

      <section className="tier alt">
        <div className="wrap">
          <p className="tag">BUILD &amp; GROW</p>
          <h2>Turn what you know into something that pays.</h2>
          <div className="grid four">{BUILD.map((s) => <Card s={s} key={s.name} />)}</div>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <h2>How it works</h2>
          <ol>
            <li><strong>Pick a service</strong> and tap the button &mdash; it opens an email to me.</li>
            <li><strong>Tell me one line</strong> about where you&rsquo;re stuck. That&rsquo;s it.</li>
            <li><strong>I send you a time and a payment link.</strong> We meet on Google Meet.</li>
          </ol>
          <p className="unsure">
            Not sure which one? <a href={book('Which AI service is right for me?')}>Email me and ask.</a> I&rsquo;ll tell you honestly &mdash; even if the answer is &ldquo;you don&rsquo;t need me yet.&rdquo;
          </p>
        </div>
      </section>

      <section className="aimom">
        <div className="wrap">
          <p className="tag light">🎙 AI MOM</p>
          <h2>Listen to the podcast, come on the show, or bring me to your stage.</h2>
          <a className="cta" href="/aimom">Meet the AI Mom →</a>
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
          <p className="fname">Mandi Beck · AI Mom · From invisible to impactful.</p>
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
.h .tier.alt { background:#fff; }
.h .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
.h .grid.four { grid-template-columns:repeat(2,1fr); }
.h .card { display:flex; flex-direction:column; background:#fff; border:1px solid #e7e0d3; border-radius:18px; padding:24px 22px; }
.h .tier.alt .card { background:var(--cream); }
.h .ctop { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; }
.h .cemoji { font-size:28px; }
.h .cprice { font-size:13px; font-weight:800; color:var(--copper); background:rgba(194,105,63,0.1); padding:4px 10px; border-radius:999px; text-align:right; }
.h .card h3 { font-size:22px; margin:4px 0 8px; }
.h .cwho { font-size:16px; color:#3f3a52; margin:0 0 12px; font-style:italic; }
.h .card ul { margin:0 0 18px; padding-left:20px; color:#4a4560; font-size:15px; flex:1; }
.h .card li { margin-bottom:6px; }
.h .cbtn { align-self:flex-start; font-weight:800; color:var(--nebula); text-decoration:none; border-bottom:2px solid rgba(90,79,207,0.3); }
.h .cbtn:hover { border-color:var(--nebula); }

.h .how h2 { font-size:clamp(24px,4vw,32px); margin:0 0 18px; }
.h .how ol { font-size:18px; color:#3f3a52; max-width:720px; padding-left:24px; margin:0 0 20px; }
.h .how li { margin-bottom:10px; }
.h .how .unsure { font-size:17px; color:#3f3a52; max-width:720px; }
.h .how .unsure a { color:var(--nebula); font-weight:800; }

.h .aimom { background:linear-gradient(165deg,#2a1c3f,var(--nebula) 70%,var(--copper)); color:#fff; text-align:center; }
.h .aimom h2 { font-size:clamp(23px,3.6vw,32px); line-height:1.25; margin:0 auto 26px; max-width:720px; }
.h .aimom .cta { background:#fff; color:var(--nebula); }

.h .foot { background:var(--midnight); color:#cfc9dd; text-align:center; padding:44px 0; }
.h .foot .social { display:flex; gap:18px; justify-content:center; flex-wrap:wrap; margin:0 0 18px; }
.h .foot .social a { color:#cfc9dd; text-decoration:none; font-size:14px; font-weight:600; }
.h .foot .social a:hover { color:#fff; }
.h .foot .fname { font-size:13px; color:#8782a0; margin:0; }

@media (max-width:900px){ .h .grid { grid-template-columns:1fr 1fr; } }
@media (max-width:620px){
  .h .grid, .h .grid.four { grid-template-columns:1fr; }
  .h section { padding:56px 0; }
}
`
