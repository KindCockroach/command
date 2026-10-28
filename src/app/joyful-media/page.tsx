export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import JoyfulSignup from '@/components/joyful/JoyfulSignup'
import { BRANDS, joyfulCss } from '@/components/joyful/shared'

// /joyful-media — Joyful Media's front door (works on both domains): who Mandi is, her two
// businesses, the mission, and the "updates from Mandi and Joyful Media" signup.
// Same cards + signup as /welcome, minus the post-signup thank-you.
export const metadata: Metadata = {
  title: 'Joyful Media · Mandi “AI Mom” Beck',
  description: 'Meet Mandi Beck, founder of Joyful Media: Be There For Her and AI Works For Her, two worlds built to support one another.',
  openGraph: { title: 'Joyful Media | AI Mom', description: 'You’re invited to RISE with her.', images: [{ url: '/og-joyful.png', width: 1200, height: 630 }], type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Joyful Media | AI Mom', description: 'You’re invited to RISE with her.', images: ['/og-joyful.png'] },
}

// Same platform links as /listen.
const PODCAST = [
  { name: 'Spotify', icon: 'spotify', href: 'https://open.spotify.com/show/033I8hRPjXiKlCHhaq5YYc' },
  { name: 'Apple Podcasts', icon: 'applepodcasts', href: 'https://podcasts.apple.com/us/podcast/ai-mom/id6786440414' },
  { name: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@AIMom_888' },
]

export default function JoyfulMedia() {
  return (
    <main className="jw">
      <MetaPixel />
      <style>{joyfulCss + css}</style>
      <CopyEditor />
      <section className="top">
        <div className="wrap">
          <img className="balloon" src="/balloon-512.png" alt="" />
          <h1>You&rsquo;re <em>invited.</em></h1>
          <p>Mandi built two radically different worlds to support one another. Come meet her, and subscribe where you fit in.</p>
        </div>
      </section>

      <section className="wrap about">
        <div className="acard">
          <div className="face" role="img" aria-label="Amanda “Mandi” Beck" />
          <div>
            <p className="tag">MEET MANDI</p>
            <h2>Amanda &ldquo;Mandi&rdquo; Beck</h2>
            <p>
              Mom of five: one in heaven, four on earth. She&rsquo;s a mom with two sets of twins: kids and cats. Founder of Joyful Media and host of the AI Mom
              Podcast. A former realtor and Evernote employee, and a long-time yogi and meditation practitioner. In 2026 she
              became a self-taught builder, learning AI during nap times to build a podcast and an AI Command Center that helps
              her run her business.
            </p>
            <p>
              She has a theory that women are the answer, and their intuition the antidote, to mankind&rsquo;s potential for
              coexistence with exponential technology.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap brands">
        <p className="intro">Two worlds, one woman:</p>
        <div className="grid">
          {[BRANDS.btfh, BRANDS.wfh].map(b => (
            <a className={`brand ${b.key}`} href={b.href} key={b.key}>
              <img src={b.img} alt={b.name} />
              <h2>{b.name}</h2>
              <p>{b.line}</p>
              <span className="go">{b.cta} &rarr;</span>
            </a>
          ))}
        </div>
      </section>

      <section className="pod">
        <div className="wrap">
          <p className="ptag">ONE PODCAST</p>
          <h2>The AI Mom Podcast</h2>
          <p className="psub">News and commentary on work, education, creativity, and spirituality after AI.</p>
          <div className="plinks">
            {PODCAST.map(p => (
              <a key={p.name} href={p.href} target="_blank" rel="noreferrer">
                <span style={{ WebkitMask: `url(/icons/${p.icon}.svg) center / contain no-repeat`, mask: `url(/icons/${p.icon}.svg) center / contain no-repeat` }} />
                {p.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap mission">
        <p className="tag">OUR MISSION</p>
        <h2>From invisible to <em>impactful.</em></h2>
        <p>
          Joyful Media exists to help women come back to themselves to build the new world as humans in a machine era.
          Be There For Her keeps you grounded. AI Works For Her keeps you on pace.
        </p>
      </section>

      <section className="wrap join">
        <div className="jcard">
          <p className="jlead">
            For updates from Mandi and Joyful Media on all things, including the AI Mom Podcast and her
            &ldquo;Seasonal Creations,&rdquo; sign up here.
          </p>
          <JoyfulSignup />
        </div>
      </section>

      <footer className="foot">Powered by <strong>Joyful Media</strong></footer>
    </main>
  )
}

const css = `
.jw .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:#C2693F; margin:0 0 8px; }
.jw .about { margin-top:-44px; position:relative; padding-bottom:34px; }
.jw .acard { display:flex; gap:24px; align-items:center; background:#fff; border:1px solid #e7e0d3; border-radius:24px; padding:26px; box-shadow:0 24px 50px -32px rgba(23,28,58,0.45); }
.jw .face { flex:none; width:150px; height:150px; border-radius:50%; border:4px solid rgba(242,166,90,0.6); background-color:#2b1f45;
  background-image:url('/host-photo.jpg'), url('/balloon-512.png'); background-size:cover, 70%; background-position:center; background-repeat:no-repeat; }
.jw .acard h2 { margin:0 0 8px; font-size:28px; }
.jw .acard p { margin:0 0 10px; color:#4a4560; font-size:16.5px; }
.jw .about + .brands { margin-top:0; }
.jw .pod { margin:34px 0 0; padding:52px 0; text-align:center; color:#fff;
  background: radial-gradient(600px 300px at 50% -20%, rgba(242,166,90,0.35), transparent 65%),
              linear-gradient(160deg,#0f0b26 0%,#1d1747 55%,#3b2f86 100%); }
.jw .ptag { letter-spacing:4px; font-size:13px; font-weight:800; color:#F2A65A; margin:0 0 10px; }
.jw .pod h2 { font-size:clamp(30px,5vw,44px); margin:0 0 10px; color:#fff; }
.jw .psub { font-size:18px; color:#e7e2f2; max-width:620px; margin:0 auto 26px; }
.jw .plinks { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.jw .plinks a { display:inline-flex; align-items:center; gap:10px; padding:13px 22px; border-radius:999px; text-decoration:none; font-weight:800; font-size:16px;
  color:#fff; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  box-shadow:0 12px 26px -16px rgba(0,0,0,0.6); transition:transform .15s ease, background .15s ease, border-color .15s ease; }
.jw .plinks a:hover { transform:translateY(-3px); background:rgba(255,255,255,0.14); border-color:rgba(242,166,90,0.7); }
.jw .plinks span { width:20px; height:20px; background:#fff; display:block; }
.jw .mission { text-align:center; max-width:760px; padding:44px 20px 30px; }
.jw .mission h2 { font-size:clamp(28px,4.4vw,38px); margin:0 0 12px; }
.jw .mission h2 em { color:#5A4FCF; }
.jw .mission p { color:#4a4560; font-size:18px; margin:0; }
@media (max-width:700px){ .jw .acard { flex-direction:column; text-align:center; } }
`
