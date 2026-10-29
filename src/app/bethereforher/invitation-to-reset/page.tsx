export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import LearnMore from './LearnMore'

// bethereforher.com/invitation-to-reset — this week's funnel, step 2. They just asked
// for the cookbook: hand it over instantly, then invite them to The Reset. "Learn more"
// opens a pop-up (details + a meditation excerpt) without sending them to checkout.
export const metadata: Metadata = {
  title: 'Your cookbook + an invitation to The Reset · Be There For Her',
  description: 'Download The Magic Is in the Making, and join Mandi for The Reset: 60 minutes of guided time to yourself, every Sunday at 8 PM CT.',
  robots: { index: false, follow: false },
}

const CHECKOUT = 'https://buy.stripe.com/9B628rfW5dKE7N6ba59IQ03' // The Reset, $33 (same as /reset)
const PDF = '/bethereforher/magic-is-in-the-making.pdf'

export default function InvitationToReset() {
  return (
    <main className="ir">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />

      <section className="got">
        <div className="wrap">
          <p className="eyebrow">BE THERE FOR HER</p>
          <h1>Your cookbook <em>is ready.</em></h1>
          <a className="dl" href={PDF} target="_blank" rel="noreferrer">
            <img src="/bethereforher/cookbook-cover.jpg" alt="" />
            <span><strong>The Magic Is in the Making</strong>Tap to open and save it now. A copy is on its way to your inbox too (check All Mail).</span>
            <b>Download &darr;</b>
          </a>
        </div>
      </section>

      <section className="invite">
        <div className="wrap">
          <p className="tag">ONE MORE THING · YOU&rsquo;RE INVITED</p>
          <h2>Have you tried unplugging and plugging yourself <em>back in?</em></h2>
          <p>
            You&rsquo;ve made a thousand choices before eating leftover dinner for lunch on Monday. What to buy, what to cook, what
            to schedule, what to worry about. Every app, reel, and person asks you to make one. More. Choice.
          </p>
          <p>
            <strong>The Reset</strong> is 60 minutes of guided time to yourself, live with Mandi on Google Meet every Sunday at
            8 PM CT. Leave with a quieter mind, a little more patience, and one less to-do in your head.
          </p>
          <div className="actions">
            <a className="buy" href={CHECKOUT}>Save my seat — $33</a>
            <LearnMore checkout={CHECKOUT} />
          </div>
          <p className="come">Come as you are: exhausted, skeptical, or with your hands in the air.</p>
        </div>
      </section>
    </main>
  )
}

const css = `
.ir { --cream:#F4E9DB; --band:#FBF3EA; --plum:#3c2a37; --ember:#d98c5f; --soft:#6a5a62; --midnight:#171C3A; --nebula:#5A4FCF;
  background:var(--cream); color:var(--plum); min-height:100vh; margin:0; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.ir * { box-sizing:border-box; }
.ir .wrap { max-width:720px; margin:0 auto; padding:0 20px; }
.ir h1,.ir h2,.ir h3 { font-family:Georgia,"Times New Roman",serif; }
.ir .got { background:linear-gradient(160deg,#1c1520,#2a1f2b 60%,#3b2a37); color:#f5ece0; padding:48px 0 56px; text-align:center; }
.ir .eyebrow { letter-spacing:3px; font-size:12px; font-weight:800; color:#E0A458; margin:0; }
.ir .got h1 { font-size:clamp(32px,6vw,48px); margin:10px 0 22px; color:#fff; }
.ir .got h1 em { color:#f2b872; }
.ir .dl { display:flex; align-items:center; gap:16px; text-align:left; padding:14px 18px 14px 14px; border-radius:20px; text-decoration:none;
  background:rgba(255,255,255,0.06); border:1px solid rgba(214,128,84,0.55); color:#dccfc2; transition:transform .15s ease; }
.ir .dl:hover { transform:translateY(-3px); }
.ir .dl img { width:64px; height:auto; border-radius:6px; flex:none; box-shadow:0 10px 20px rgba(0,0,0,0.4); }
.ir .dl span { flex:1; font-size:15px; line-height:1.45; }
.ir .dl strong { display:block; font:700 19px Georgia,serif; color:#fff; }
.ir .dl b { flex:none; background:linear-gradient(135deg,#F7C79A,#D68054); color:#221923; padding:11px 18px; border-radius:999px; font-size:15px; }
.ir .invite { padding:56px 0 72px; }
.ir .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--ember); margin:0 0 10px; }
.ir .invite h2 { font-size:clamp(28px,4.6vw,40px); line-height:1.15; margin:0 0 16px; }
.ir .invite h2 em { color:var(--ember); }
.ir .invite p { font-size:18px; color:var(--soft); margin:0 0 14px; }
.ir .invite p strong { color:var(--plum); }
.ir .actions { display:flex; gap:12px; flex-wrap:wrap; margin:26px 0 14px; }
.ir .buy, .ir .learn { display:inline-block; font-weight:800; font-size:17px; text-decoration:none; padding:15px 28px; border-radius:999px; cursor:pointer; font-family:inherit; transition:transform .15s ease; }
.ir .buy { background:linear-gradient(135deg,#6b3f52,#a86a72); color:#fff; box-shadow:0 12px 28px rgba(107,63,82,0.35); border:0; }
.ir .learn { background:#fff; color:var(--plum); border:1.5px solid rgba(107,63,82,0.35); box-shadow:0 10px 22px -14px rgba(60,42,55,0.5); }
.ir .buy:hover, .ir .learn:hover { transform:translateY(-2px); }
.ir .come { font-style:italic; font-family:Georgia,serif; }
/* Learn more pop-up */
.lm-back { position:fixed; inset:0; z-index:1000; background:rgba(28,21,32,0.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center; padding:16px; animation:lmFade .2s ease; }
.lm { position:relative; width:100%; max-width:600px; max-height:88vh; overflow-y:auto; background:#FBF3EA; color:#3c2a37; border-radius:24px;
  padding:30px 26px 24px; box-shadow:0 40px 80px -30px rgba(0,0,0,0.6); animation:lmUp .25s ease; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
@keyframes lmFade { from { opacity:0 } to { opacity:1 } }
@keyframes lmUp { from { transform:translateY(16px); opacity:0 } to { transform:none; opacity:1 } }
.lm-x { position:absolute; top:12px; right:14px; width:36px; height:36px; border-radius:50%; border:0; background:#efe1d4; color:#3c2a37; font-size:22px; cursor:pointer; line-height:1; }
.lm-tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:#d98c5f; margin:0 0 6px; }
.lm h2 { font:700 28px Georgia,serif; margin:0 0 10px; }
.lm-lede { font-size:16.5px; color:#6a5a62; margin:0 0 18px; }
.lm h3 { font:700 18px Georgia,serif; margin:20px 0 8px; }
.lm ul { margin:0; padding-left:18px; color:#6a5a62; font-size:15.5px; }
.lm li { margin:0 0 8px; }
.lm li strong { color:#3c2a37; }
.lm blockquote { margin:0; padding:16px 18px; border-radius:16px; background:#fff; border-left:4px solid #d98c5f; font:italic 16px/1.6 Georgia,serif; color:#4d3a49; }
.lm blockquote p { margin:0 0 10px; }
.lm blockquote p:last-child { margin:0; }
.lm .lm-src { font:700 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; letter-spacing:1.5px; text-transform:uppercase; color:#a88f80; }
.lm dl { display:grid; gap:8px; margin:20px 0; }
.lm dl div { display:grid; grid-template-columns:100px 1fr; gap:10px; padding:10px 14px; border-radius:12px; background:#fff; border:1px solid #efe1d4; font-size:15px; }
.lm dt { font-weight:800; font-size:12px; letter-spacing:1.4px; text-transform:uppercase; color:#a88f80; padding-top:2px; }
.lm dd { margin:0; }
.lm-actions { display:flex; gap:10px; flex-wrap:wrap; }
.lm-buy { flex:1; text-align:center; background:linear-gradient(135deg,#6b3f52,#a86a72); color:#fff; font-weight:800; font-size:16px; text-decoration:none; padding:14px 20px; border-radius:999px; }
.lm-later { background:transparent; border:0; color:#6a5a62; font-weight:700; font-size:15px; cursor:pointer; padding:14px 10px; font-family:inherit; }
@media (max-width:520px){ .ir .dl { flex-wrap:wrap; } .ir .dl b { width:100%; text-align:center; } .lm dl div { grid-template-columns:1fr; gap:2px; } }
`
