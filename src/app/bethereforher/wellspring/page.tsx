export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'

// THE WELLSPRING — Be There For Her monthly membership, COMING SOON (2026-11-04).
// Served at bethereforher.com/wellspring (host rewrite in middleware.ts); linked from the
// aiworksforher.com homepage. Lists what members will get; no checkout until it opens.
const TITLE = 'The Wellspring — coming soon'
const DESC = 'A monthly membership for mothers raising their families with awareness and mindfulness. The Reset every week, a new meditation every week, and each other.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: 'https://www.bethereforher.com/wellspring', siteName: 'Be There For Her',
    images: [{ url: '/og-bethereforher-v2.png', width: 1200, height: 630 }], type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/og-bethereforher-v2.png'] },
}

const EXPECT = [
  { icon: '🌙', t: 'The Reset, live every week', d: 'Sunday nights at 8 PM CT. An hour of guided time to yourself, after bedtime and before you’re asleep.' },
  { icon: '🎧', t: 'A new meditation every week', d: 'A downloadable meditation in Mandi’s real voice, yours to keep and come back to.' },
  { icon: '🤍', t: 'Each other', d: 'Connection to other mothers raising their families with awareness and mindfulness.' },
]

export default function Wellspring() {
  return (
    <main className="ws">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">BE THERE FOR HER · MONTHLY MEMBERSHIP</p>
          <h1>The Wellspring <em>is coming soon.</em></h1>
          <p className="sub">A place to keep coming back to yourself, every single week.</p>
        </div>
      </section>

      <section className="expect">
        <div className="wrap">
          <h2>What to expect</h2>
          <div className="list">
            {EXPECT.map(e => (
              <div className="item" key={e.t}>
                <span className="ic">{e.icon}</span>
                <div><h3>{e.t}</h3><p>{e.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="now">
        <div className="wrap">
          <h2>Don&rsquo;t wait for the doors to open.</h2>
          <p>Start now with what&rsquo;s already here.</p>
          <div className="btns">
            <a className="btn" href="https://www.bethereforher.com/reset">Attend The Reset — $33</a>
            <a className="btn ghost" href="https://www.bethereforher.com/intuition">Reconnect To Your Intuition</a>
          </div>
        </div>
      </section>
    </main>
  )
}

const css = `
.ws { --cream:#F4E9DB; --plum:#3c2a37; --ember:#d98c5f; --soft:#6a5a62;
  background:var(--cream); color:var(--plum); min-height:100vh; margin:0; line-height:1.6;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.ws * { box-sizing:border-box; }
.ws .wrap { max-width:720px; margin:0 auto; padding:0 20px; }
.ws h1,.ws h2,.ws h3 { font-family:Georgia,"Times New Roman",serif; }
.ws .hero { background:linear-gradient(160deg,#1c1520,#2a1f2b 60%,#3b2a37); color:#f5ece0; padding:64px 0 60px; text-align:center; }
.ws .eyebrow { letter-spacing:3px; font-size:12px; font-weight:800; color:#E0A458; margin:0; }
.ws h1 { font-size:clamp(34px,6.5vw,52px); line-height:1.1; margin:12px 0 16px; color:#fff; }
.ws h1 em { color:#f2b872; display:block; }
.ws .sub { font-size:19px; color:#e6d8ca; margin:0; }
.ws .expect { padding:52px 0; }
.ws h2 { font-size:clamp(24px,4vw,32px); margin:0 0 22px; text-align:center; }
.ws .list { display:grid; gap:14px; }
.ws .item { display:flex; gap:16px; align-items:flex-start; background:#fff; border:1px solid #ecdccb; border-radius:20px; padding:20px 22px;
  box-shadow:0 18px 40px -30px rgba(60,42,55,0.5); }
.ws .ic { font-size:28px; line-height:1; flex:none; margin-top:2px; }
.ws .item h3 { margin:0 0 4px; font-size:20px; }
.ws .item p { margin:0; color:var(--soft); font-size:16px; }
.ws .now { background:#FBF3EA; padding:48px 0 64px; text-align:center; }
.ws .now h2 { margin-bottom:6px; }
.ws .now p { color:var(--soft); margin:0 0 22px; }
.ws .btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.ws .btn { display:inline-block; background:linear-gradient(135deg,#F7C79A,#D68054); color:#221923; font-weight:800; text-decoration:none;
  padding:15px 26px; border-radius:999px; box-shadow:0 10px 26px rgba(214,128,84,0.35); }
.ws .btn.ghost { background:transparent; border:2px solid var(--ember); color:var(--plum); box-shadow:none; }
`
