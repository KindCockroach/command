export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'

// Public homepage for aiworksforyou.co — the AI Mom "start here" hub. Routes
// visitors to the three Caption Writer doors and teases the Caption Keeper.
// (The private Command Center moved to /station.)
export const metadata: Metadata = {
  title: 'AI Works For You — Find Your Golden Thread · by AI Mom',
  description:
    'Find your golden thread and stop the scroll. Caption Writer turns your real life into captions in your voice — find the story that ties it all together, align your message, and say it well. Raw life in → meaningful message out.',
}

const DOORS = [
  {
    href: '/seen',
    emoji: '📣',
    label: 'Your social presence',
    line: 'You’ve got a life worth sharing and you freeze at the caption box. Let’s get you seen.',
  },
  {
    href: '/captionwriter',
    emoji: '⚡',
    label: 'Mama’s Side Hustle',
    line: 'You post for your thing, and the caption alone eats nap time. Done in minutes, in your voice.',
  },
  {
    href: '/queen',
    emoji: '👑',
    label: 'Her Business',
    line: 'So much to say, so little makes it out of your head, but your people need to hear from you.',
  },
]

export default function Home() {
  return (
    <main className="home">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">AI WORKS FOR YOU · BY AI MOM</p>
          <h1>Find your golden thread and stop the scroll.</h1>
          <p className="sub">
            Your life is full of stories worth telling &mdash; Caption Writer helps you find the one
            that ties them together, make it clear, and say it in your voice.
          </p>
          <p className="mantra">Raw life in <span className="arw">→</span> Meaningful Message out</p>
          <a className="cta" href="#doors">Pick your starting point ↓</a>
        </div>
      </section>

      <section className="doors" id="doors">
        <div className="wrap">
          <h2>Where are you right now?</h2>
          <div className="grid">
            {DOORS.map((d) => (
              <a className="door" href={d.href} key={d.href}>
                <span className="demoji">{d.emoji}</span>
                <span className="dlabel">{d.label}</span>
                <span className="dline">{d.line}</span>
                <span className="dgo">Start here →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>All three start with <em>Caption Writer</em></h2>
          <p>One $27 AI that turns your real life &mdash; a photo, a thought, a voice memo &mdash; into
            ready-to-post content in your own voice. It runs inside your own ChatGPT, learns how you
            sound, and never invents your life. Set up in about 10 minutes.</p>
        </div>
      </section>

      <section className="soon">
        <div className="wrap">
          <p className="soontag">✨ COMING SOON</p>
          <h2>The Caption Keeper</h2>
          <p>A place that keeps it all &mdash; a journal that talks back, and a home for every caption.
            Get on the list for first access and founding pricing.</p>
          <a className="ghost" href="/journal">Get on the waitlist →</a>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">AI Works For You · by AI Mom</div>
      </footer>
    </main>
  )
}

const css = `
.home { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  line-height:1.6; margin:0; }
.home .wrap { max-width:920px; margin:0 auto; padding:0 24px; }
.home h1,.home h2 { font-family:Georgia,"Times New Roman",serif; }
.home h1 { font-size:clamp(30px,5.5vw,50px); line-height:1.12; letter-spacing:-0.5px; margin:0 0 20px; color:#fff; }
.home h2 { font-size:clamp(24px,4vw,34px); line-height:1.2; margin:0 0 20px; }
.home section { padding:64px 0; }
.home .hero { background:linear-gradient(160deg,var(--midnight),#25204d 68%,var(--nebula)); color:var(--light); padding:88px 0 80px; }
.home .eyebrow { letter-spacing:3px; font-size:13px; font-weight:700; color:var(--ember); margin:0 0 18px; }
.home .sub { font-size:20px; color:#e7e2f2; max-width:680px; }
.home .sub strong { color:#fff; }
.home em { font-style:italic; color:var(--nebula); }
.home .hero em { color:var(--ember); }
.home .mantra { font-family:Georgia,serif; font-size:clamp(20px,3vw,29px); color:#fff; margin:28px 0 0; }
.home .mantra .arw { color:var(--ember); font-style:normal; }
.home .cta { display:inline-block; margin-top:22px; background:var(--ember); color:var(--midnight);
  font-weight:800; font-size:19px; text-decoration:none; padding:16px 34px; border-radius:999px;
  box-shadow:0 10px 30px rgba(242,166,90,0.4); transition:transform .12s ease; }
.home .cta:hover { transform:translateY(-2px); }
.home .doors { background:var(--light); }
.home .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:8px; }
.home .door { display:flex; flex-direction:column; gap:8px; text-decoration:none; color:var(--midnight);
  background:#fff; border:1px solid #e7e0d3; border-radius:18px; padding:26px 22px; transition:transform .12s ease, box-shadow .12s ease; }
.home .door:hover { transform:translateY(-3px); box-shadow:0 14px 34px rgba(23,28,58,0.12); }
.home .demoji { font-size:30px; }
.home .dlabel { font-family:Georgia,serif; font-size:21px; font-weight:700; }
.home .dline { font-size:16px; color:#4a4560; flex:1; }
.home .dgo { font-weight:800; color:var(--nebula); margin-top:6px; }
.home .what { background:#fff; }
.home .what p { font-size:19px; max-width:720px; }
.home .soon { background:linear-gradient(160deg,#3a2352,var(--nebula) 65%,var(--pink)); color:#fff; text-align:center; }
.home .soon h2 { color:#fff; }
.home .soon p { font-size:18px; color:#f3ecf7; max-width:620px; margin:0 auto 8px; }
.home .soontag { letter-spacing:2px; font-size:12px; font-weight:800; color:var(--ember); margin:0 0 8px; }
.home .ghost { display:inline-block; margin-top:18px; background:#fff; color:var(--nebula); font-weight:700;
  text-decoration:none; padding:13px 26px; border-radius:999px; }
.home .foot { padding:34px 0; background:var(--midnight); color:#cfc9dd; font-size:14px; text-align:center; }
@media (max-width:640px){ .home .grid { grid-template-columns:1fr; } }
`
