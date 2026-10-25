export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'

// bethereforher.com — the new face: an intro to a growing line of mindful products that
// bring women back to themselves (intuition, inner-child, reconnection, postpartum).
// The former "Listen To Your Intuition" sales page now lives at /bethereforher/intuition.
export const metadata: Metadata = {
  title: 'Be There For Her — Mindful Products to Bring You Back to Yourself',
  description:
    'A growing line of mindful products — guided meditations and gentle practices for your intuition, your inner child, and your way back home to yourself. Start with a free beginner meditation.',
  openGraph: { title: 'Be There For Her', description: 'Mindful products that bring women back to themselves.', type: 'website' },
}

const SERIES = [
  { title: 'Turning Up Your Intuition', line: 'The quiet knowing you were taught to silence — turned back up, meditation by meditation.', href: '/bethereforher/intuition', status: 'Available now' },
  { title: 'Inner Child Healing', line: 'Meet the girl you left behind. Become the one who finally stays.', href: '', status: 'In the works' },
  { title: 'Reconnecting to Yourself', line: 'Find your way back from everyone else’s needs to your own center.', href: '', status: 'In the works' },
  { title: 'Postpartum Support', line: 'For the tender, unspooled months no one prepares you for.', href: '', status: 'In the works' },
]

export default function BeThereForHer() {
  return (
    <main className="b">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">BE THERE FOR HER</p>
          <h1>Come back to <em>yourself.</em></h1>
          <p className="sub">
            A growing line of mindful products &mdash; guided meditations and gentle practices that bring
            women home to themselves. Because you&rsquo;ve been there for everyone else. This is for her:
            the one in the mirror.
          </p>
          <a className="cta" href="/bethereforher/intuition">Start with a free beginner meditation</a>
        </div>
      </section>

      <section className="series">
        <div className="wrap">
          <h2>The series</h2>
          <p className="ssub">Each one is a doorway back to the woman underneath the to-do list.</p>
          <div className="grid">
            {SERIES.map((s) => (
              s.href ? (
                <a className="card live" href={s.href} key={s.title}>
                  <span className="status live">{s.status}</span>
                  <span className="ctitle">{s.title}</span>
                  <span className="cline">{s.line}</span>
                  <span className="cgo">Explore &rarr;</span>
                </a>
              ) : (
                <div className="card" key={s.title}>
                  <span className="status">{s.status}</span>
                  <span className="ctitle">{s.title}</span>
                  <span className="cline">{s.line}</span>
                </div>
              )
            ))}
          </div>
          <p className="more">&hellip;and more in this lane &mdash; whatever brings women back to themselves.</p>
        </div>
      </section>

      {/* The Reset — the live flagship, first under the series */}
      <section className="reset">
        <span className="spark s1">&#10022;</span><span className="spark s2">&#10022;</span><span className="spark s3">&#10022;</span>
        <div className="wrap">
          <img src="/the-reset-logo.png" alt="The Reset" className="resetLogo" />
          <p className="tag">THE LIVE ONE &middot; EVERY SUNDAY</p>
          <h2>Press your own reset button.</h2>
          <p>One hour, Sunday evenings. Camera off, nothing required but you. A live, guided reset for the
            woman who&rsquo;s been everyone&rsquo;s everything &mdash; come home to the one in the mirror.</p>
          <a className="cta glow" href="/reset">Join the next Reset &rarr;</a>
        </div>
      </section>

      <section className="start">
        <div className="wrap">
          <p className="tag">NEW HERE?</p>
          <h2>Start with a free beginner meditation.</h2>
          <p>Short, gentle, and made for the woman who&rsquo;s never had time to sit with herself. One press play, and you begin.</p>
          <a className="cta dark" href="/bethereforher/intuition">Begin here &rarr;</a>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <p><a href="/">AI Works For Her</a> &middot; <a href="/listen">The AI Mom Podcast</a></p>
          <p className="fine">Be There For Her &middot; by Mandi Beck</p>
        </div>
      </footer>
    </main>
  )
}

const css = `
.b { --plum:#3B2A3A; --rose:#C97B63; --gold:#E0A458; --cream:#FBF6F0; --soft:#6B5A63;
  background:var(--cream); color:var(--plum); line-height:1.65; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.b .wrap { max-width:900px; margin:0 auto; padding:0 24px; }
.b h1,.b h2 { font-family:Georgia,"Times New Roman",serif; letter-spacing:-0.3px; }
.b em { font-style:italic; color:var(--rose); }
.b section { padding:70px 0; }
.b .cta { display:inline-block; background:var(--rose); color:#fff; font-weight:800; font-size:17px;
  text-decoration:none; padding:15px 30px; border-radius:999px; box-shadow:0 10px 28px rgba(201,123,99,0.35); transition:transform .12s ease; }
.b .cta:hover { transform:translateY(-2px); }
.b .cta.dark { background:var(--plum); box-shadow:0 10px 28px rgba(59,42,58,0.35); }

.b .hero { background:linear-gradient(165deg,#f6e9df,#f3ddd3 70%,#eccdbe); text-align:center; padding:92px 0; }
.b .hero .eyebrow { letter-spacing:3px; font-size:12px; font-weight:800; color:var(--rose); margin:0 0 18px; }
.b .hero h1 { font-size:clamp(34px,6vw,54px); line-height:1.1; margin:0 0 20px; }
.b .hero .sub { font-size:19px; color:var(--soft); max-width:620px; margin:0 auto 28px; }

.b .series { background:var(--cream); }
.b .series h2 { font-size:clamp(26px,4vw,36px); margin:0 0 6px; }
.b .series .ssub { font-size:17px; color:var(--soft); margin:0 0 28px; }
.b .series .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.b .card { display:flex; flex-direction:column; gap:8px; background:#fff; border:1px solid #ecdccf; border-radius:18px; padding:24px 24px; text-decoration:none; color:var(--plum); }
.b .card.live { border:1.5px solid var(--rose); transition:transform .12s ease, box-shadow .12s ease; }
.b .card.live:hover { transform:translateY(-3px); box-shadow:0 16px 36px rgba(201,123,99,0.2); }
.b .status { font-size:10.5px; font-weight:800; letter-spacing:0.05em; text-transform:uppercase; color:#b7a79b; }
.b .status.live { color:var(--rose); }
.b .ctitle { font-family:Georgia,serif; font-size:22px; font-weight:700; }
.b .cline { font-size:15.5px; color:var(--soft); flex:1; line-height:1.5; }
.b .cgo { font-weight:800; color:var(--rose); margin-top:4px; }
.b .series .more { font-size:16px; color:var(--soft); font-style:italic; margin:24px 0 0; text-align:center; }

/* The Reset — vibrant flagship */
.b .reset { position:relative; overflow:hidden; text-align:center;
  background:radial-gradient(120% 120% at 50% 0%, #2a1630 0%, #3B2A3A 40%, #7a2e52 72%, #C94E86 100%); color:#fff; }
.b .reset .wrap { position:relative; z-index:2; }
.b .resetLogo { width:min(230px,56vw); height:auto; margin:0 auto 8px; display:block;
  filter:drop-shadow(0 0 26px rgba(224,88,140,0.5)) drop-shadow(0 0 10px rgba(224,164,88,0.5)); }
.b .reset .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--gold); margin:0 0 10px; }
.b .reset h2 { color:#fff; font-size:clamp(26px,4.4vw,38px); margin:0 0 14px;
  background:linear-gradient(90deg,#F2C45A,#F28CB6,#C94E86); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.b .reset p { font-size:18px; color:#f3e3ea; max-width:600px; margin:0 auto 26px; }
.b .cta.glow { background:linear-gradient(90deg,#E0A458,#E0588C,#C94E86); box-shadow:0 10px 34px rgba(224,88,140,0.5); }
.b .reset .spark { position:absolute; color:#F2C45A; opacity:0.85; font-size:26px; z-index:1; text-shadow:0 0 14px rgba(242,196,90,0.8); pointer-events:none; }
.b .reset .spark.s1 { top:12%; left:12%; font-size:20px; }
.b .reset .spark.s2 { top:22%; right:14%; font-size:30px; }
.b .reset .spark.s3 { bottom:16%; left:20%; font-size:18px; opacity:0.6; }

.b .start { background:linear-gradient(165deg,#3B2A3A,#4d3a49 80%,var(--rose)); color:#fff; text-align:center; }
.b .start .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--gold); margin:0 0 12px; }
.b .start h2 { color:#fff; font-size:clamp(24px,4vw,34px); margin:0 0 14px; }
.b .start p { font-size:18px; color:#efe4ea; max-width:600px; margin:0 auto 26px; }

.b .foot { background:var(--plum); color:#cdbfc8; text-align:center; padding:40px 0; font-size:14px; }
.b .foot a { color:var(--gold); text-decoration:none; font-weight:600; }
.b .foot .fine { font-size:12px; color:#8f8089; margin:10px 0 0; }

@media (max-width:640px){ .b .series .grid { grid-template-columns:1fr; } }
`
