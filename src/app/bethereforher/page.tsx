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
  openGraph: {
    title: 'You Deserve It All',
    description: 'Be there for the woman in the mirror.',
    type: 'website',
    images: [{ url: '/og-bethereforher.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'You Deserve It All',
    description: 'Be there for the woman in the mirror.',
    images: ['/og-bethereforher.png'],
  },
}

const SERIES: { title: string; line: string; href: string; status: string; icon?: string }[] = [
  { title: 'The Reset', line: '1 hour to yourself. Sundays, 8 PM. Your accountability and guide to press reset before the week begins again.', href: '/reset', status: 'Available now', icon: '/bethereforher/icon-reset.png' },
  { title: 'Turning Up Your Intuition', line: 'The quiet knowing you were taught to silence — turned back up, meditation by meditation.', href: '/bethereforher/intuition', status: 'Available now', icon: '/bethereforher/icon-intuition.png' },
  { title: 'The Whole Integrated Woman', line: 'Every scattered part of you — warrior, woman, lover, mother — gathered back into one whole.', href: '', status: 'In the works' },
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
                  <span className="chead">
                    {s.icon && <img className="cicon" src={s.icon} alt="" />}
                    <span className="ctitle">{s.title}</span>
                  </span>
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
          <p className="more">&hellip;and more in this lane &mdash; anything to bring women back to themselves.</p>
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
.b { --cream:#F4E9DB; --band:#FBF3EA; --plum:#3c2a37; --mauve:#9b6a86; --rose:#cf8aa0; --ember:#d98c5f; --amber:#f2b872; --gold:#E0A458; --soft:#6a5a62;
  background:var(--cream); color:var(--plum); line-height:1.65; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.b .wrap { max-width:900px; margin:0 auto; padding:0 24px; }
.b h1,.b h2 { font-family:Georgia,"Times New Roman",serif; letter-spacing:-0.3px; }
.b em { font-style:italic; color:var(--rose); }
.b section { padding:70px 0; }

@keyframes floaty { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-5px) } }
.b .cta { display:inline-block; color:#2a1c24; font-weight:800; font-size:17px; text-decoration:none;
  padding:15px 32px; border-radius:999px; background:linear-gradient(135deg,#f2c45a,#dd9a4e);
  box-shadow:0 10px 28px rgba(221,154,78,0.5), 0 0 22px rgba(242,196,90,0.4);
  animation:floaty 3.6s ease-in-out infinite; transition:box-shadow .2s ease, filter .2s ease; }
.b .cta:hover { filter:brightness(1.05); box-shadow:0 14px 40px rgba(221,154,78,0.65), 0 0 34px rgba(242,196,90,0.55); }
.b .cta.dark { background:linear-gradient(135deg,#6b3f52,#a86a72); box-shadow:0 10px 28px rgba(59,42,58,0.4), 0 0 20px rgba(168,106,114,0.4); }

.b .hero { background:linear-gradient(165deg,#382634 0%,#6b3f52 58%,#a86a72 100%); text-align:center; padding:92px 0; }
.b .hero .eyebrow { letter-spacing:3px; font-size:12px; font-weight:800; color:var(--ember); margin:0 0 18px; }
.b .hero h1 { font-size:clamp(34px,6vw,54px); line-height:1.1; margin:0 0 20px; color:#fdf3ea; }
.b .hero h1 em { color:var(--amber); font-size:1.08em; text-shadow:0 2px 20px rgba(242,166,90,0.45); }
.b .hero .sub { font-size:19px; color:#f2e2d7; max-width:620px; margin:0 auto 28px; }

.b .series { background:var(--band); }
.b .series h2 { font-size:clamp(26px,4vw,36px); margin:0 0 6px; }
.b .series .ssub { font-size:17px; color:var(--soft); margin:0 0 28px; }
.b .series .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.b .card { display:flex; flex-direction:column; gap:8px; background:#fff; border:1px solid #ecdccf; border-radius:18px; padding:24px 24px; text-decoration:none; color:var(--plum); }
.b .chead { display:flex; align-items:center; gap:14px; }
.b .cicon { flex:none; width:64px; height:64px; border-radius:16px; object-fit:cover; box-shadow:0 8px 20px rgba(201,123,99,0.25); }
.b .card.live { border:1.5px solid var(--ember); transition:transform .12s ease, box-shadow .12s ease; }
.b .card.live:hover { transform:translateY(-3px); box-shadow:0 16px 36px rgba(201,123,99,0.2); }
.b .status { font-size:10.5px; font-weight:800; letter-spacing:0.05em; text-transform:uppercase; color:#b7a79b; }
.b .status.live { color:var(--ember); }
.b .ctitle { font-family:Georgia,serif; font-size:22px; font-weight:700; }
.b .cline { font-size:15.5px; color:var(--soft); flex:1; line-height:1.5; }
.b .cgo { font-weight:800; color:var(--ember); margin-top:4px; }
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
