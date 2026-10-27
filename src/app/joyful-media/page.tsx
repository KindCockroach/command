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
  openGraph: { title: 'You’re invited · Joyful Media', description: 'Meet Mandi Beck and the two worlds she built: Be There For Her and AI Works For Her.', images: [{ url: '/og-wfh-v2.png', width: 1200, height: 630 }] },
}

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
          <p>Mandi built two radically different worlds to support one another. Come meet her, and find the one you need today.</p>
        </div>
      </section>

      <section className="wrap about">
        <div className="acard">
          <div className="face" role="img" aria-label="Amanda “Mandi” Beck" />
          <div>
            <p className="tag">MEET MANDI</p>
            <h2>Amanda &ldquo;Mandi&rdquo; Beck</h2>
            <p>
              Mom, founder of Joyful Media, and host of the AI Mom Podcast. A former realtor and Evernote employee, a longtime
              meditator, and a self-taught builder who learned AI during nap times, building a podcast, a voice clone, and an AI
              command center that runs her business.
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

      <section className="wrap mission">
        <p className="tag">OUR MISSION</p>
        <h2>From invisible to <em>impactful.</em></h2>
        <p>
          Joyful Media exists to help women come back to themselves and build what&rsquo;s next. Be There For Her keeps you
          grounded. AI Works For Her keeps you ahead. Together they hold what keeps us human while everything accelerates:
          peace, action, and intuition.
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
.jw .mission { text-align:center; max-width:760px; padding:30px 20px 30px; }
.jw .mission h2 { font-size:clamp(28px,4.4vw,38px); margin:0 0 12px; }
.jw .mission h2 em { color:#5A4FCF; }
.jw .mission p { color:#4a4560; font-size:18px; margin:0; }
@media (max-width:700px){ .jw .acard { flex-direction:column; text-align:center; } }
`
