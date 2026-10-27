export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import CopyEditor from '@/components/CopyEditor'

export const metadata: Metadata = {
  title: 'The Reset — have you tried unplugging and plugging yourself back in?',
  description: 'Not a class. 60 minutes of guided time to yourself, live with Mandi on Sunday nights. Leave with a quieter mind, a little more patience, and one less to-do in your head. $33.',
}

// THE RESET — Mandi's live Sunday-night hour ($33, Google Meet). Copy reworked from her
// Luma listing (2026-10-27). Register button → the Reset's Stripe payment link
// (hardcoded so a stale NEXT_PUBLIC_RESET_CHECKOUT_URL on Railway can't override it).
const CHECKOUT_URL = 'https://buy.stripe.com/9B628rfW5dKE7N6ba59IQ03'
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

function MetaPixel() {
  if (!META_PIXEL) return null
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL}');fbq('track','PageView');
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.buy');if(a){fbq('track','InitiateCheckout',{value:33,currency:'USD'});}});
` }} />
      <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL}&ev=PageView&noscript=1`} /></noscript>
    </>
  )
}

function RegisterButton({ label = 'SAVE MY SEAT — $33' }: { label?: string }) {
  return (
    <div className="cta">
      <a className="buy" href={CHECKOUT_URL}>{label}</a>
      <p className="tagline">Live · 60 minutes · a reset you&rsquo;ll want to come back to</p>
    </div>
  )
}

const CHOICES = [
  ['What to buy.', 'Which model? How much?'],
  ['What to cook.', 'Pizza again? Kale tomorrow.'],
  ['What to schedule.', 'Hair can wait. Toes are a must. Holidays next week.'],
  ['What to ignore.', 'Thank goodness for the \u2018call screen\u2019 feature. Does it have to show me the calls it ignores?'],
  ['What to worry about.', 'Traffic? Friends? The check engine light.'],
  ['What to learn.', 'With what time? It\u2019s not 2020 anymore, Todo.'],
  ['What to do next.', 'Date night? Yeah, right! Garden? More like Gardyn. Probably, feed the cat.'],
]

const LEAVE = [
  { t: 'The Audit', d: 'Back to your factory settings. No more obligations for the sake of \u201cshould.\u201d You\u2019ll leave with a clear picture of what you actually need today, this week, and this season of life.' },
  { t: 'The Somatic Reset', d: 'A guided practice to move from your \u201cNot Another Choice\u201d eye-roll to your \u201cF*ck Yes\u201d frequency. A reset for your body, mind, and nervous system you can return to whenever life feels too loud.' },
  { t: 'The Missing Instructions', d: 'Two simple prompts to better understand your child\u2019s unique behaviors and support them with newfound Momfidence.' },
]

export default function ResetPage() {
  return (
    <main className="rs">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">THE RESET · LIVE WITH MANDI</p>
          <h1>Have you tried unplugging and plugging yourself <em>back in?</em></h1>
          <p className="sub">You&rsquo;ve made a thousand choices before eating leftover dinner for lunch on Monday.</p>
          <RegisterButton />
        </div>
      </section>

      <section className="choices">
        <div className="wrap">
          {CHOICES.map(([a, b]) => <p className="choice" key={a}><strong>{a}</strong> {b}</p>)}
          <p className="ontop">
            On top of having kids, every app, reel, feature, podcast, &ldquo;life changing shot,&rdquo; and your husband asks you to make:
          </p>
          <p className="one">One. More. Choice.</p>
        </div>
      </section>

      <section className="promise">
        <div className="wrap">
          <p className="forgive">Forgive me now.</p>
          <h2>But I promise this isn&rsquo;t a class.</h2>
          <p>There is a series you can buy for $9 at the end. But there&rsquo;s no hype cycle. No sales presentation. No Q&amp;A.</p>
          <p className="just">Just you, your laptop, a notebook + tea, and 60 minutes of guided time to yourself.</p>
          <p>A chance to think a little less so you can accomplish a little more with what you already got.</p>
          <p className="like">Like AI. <span>Capable. Imperfect. Done.</span></p>
          <p className="breathe">Just come breathe.</p>
          <p>Leave with a quieter mind, a little more patience, and one less to-do in your head.</p>
        </div>
      </section>

      <section className="leave">
        <div className="wrap wide">
          <h2>What you&rsquo;ll leave with</h2>
          <div className="cards">
            {LEAVE.map(l => <div className="card" key={l.t}><h3>{l.t}</h3><p>{l.d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>The details</h2>
          <dl className="details">
            <div><dt>When</dt><dd>Sunday, November 8 at 8 PM CT</dd></div>
            <div><dt>Where</dt><dd>Virtual (Google Meet link provided upon registration)</dd></div>
            <div><dt>Investment</dt><dd>$33 (beta price for this inaugural vibe check)</dd></div>
          </dl>
          <p className="asyouare">Come as you are: exhausted, skeptical, or with your hands in the air. I&rsquo;ll meet you there.</p>
          <RegisterButton label="Save my seat — $33" />
        </div>
      </section>
    </main>
  )
}

const css = `
.rs { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; margin:0; }
.rs .wrap { max-width:720px; margin:0 auto; padding:0 24px; }
.rs h1,.rs h2 { font-family:Georgia,"Times New Roman",serif; }
.rs h1 { font-size:clamp(28px,5vw,44px); line-height:1.15; letter-spacing:-0.5px; margin:0 0 18px; }
.rs h2 { font-size:clamp(23px,4vw,32px); margin:0 0 18px; }
.rs section { padding:52px 0; }
.rs .hero { background:linear-gradient(160deg,var(--midnight),#3a2f5e 70%,var(--pink)); color:var(--light); padding:76px 0 64px; }
.rs .hero h1 { color:#fff; }
.rs .eyebrow { letter-spacing:3px; font-size:13px; font-weight:700; color:var(--ember); margin:0 0 16px; }
.rs .sub { font-size:20px; color:#eee3ef; }
.rs .hero h1 em { color:var(--ember); }
.rs .sub strong { color:#fff; }
/* The thousand choices */
.rs .choices { background:#fff; }
.rs .choice { font-size:18.5px; margin:0 0 12px; padding-left:16px; border-left:3px solid rgba(217,138,183,0.5); color:#4a4560; }
.rs .choice strong { color:var(--midnight); }
.rs .ontop { font-size:18px; margin:30px 0 8px; color:#4a4560; }
.rs .one { font:700 clamp(30px,6vw,48px)/1.1 Georgia,serif; letter-spacing:-0.5px; margin:0;
  background:linear-gradient(90deg,var(--nebula),var(--pink) 60%,var(--ember)); -webkit-background-clip:text; background-clip:text; color:transparent; }
/* Not a class */
.rs .promise { text-align:center; }
.rs .promise p { font-size:18.5px; color:#4a4560; margin:0 0 14px; }
.rs .forgive { font-style:italic; color:#8b84a3 !important; margin-bottom:4px !important; }
.rs .just { font:600 21px/1.5 Georgia,serif; color:var(--midnight) !important; margin:22px 0 !important; }
.rs .like { font-weight:700; color:var(--midnight) !important; }
.rs .like span { color:var(--nebula); }
.rs .breathe { font:italic 700 28px Georgia,serif; color:var(--ember) !important; margin:22px 0 10px !important; }
/* What you'll leave with */
.rs .leave { background:linear-gradient(180deg,#fff,var(--light)); }
.rs .wrap.wide { max-width:960px; }
.rs .leave h2 { text-align:center; }
.rs .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.rs .card { background:#fff; border:1px solid #ebe3f0; border-radius:20px; padding:22px; box-shadow:0 18px 40px -28px rgba(23,28,58,0.4); }
.rs .card h3 { font:700 20px Georgia,serif; margin:0 0 8px; color:var(--nebula); }
.rs .card p { margin:0; font-size:16px; color:#4a4560; }
/* Details */
.rs .details { display:grid; gap:10px; max-width:520px; margin:0 auto 22px; text-align:left; }
.rs .details div { display:grid; grid-template-columns:110px 1fr; gap:12px; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.35); border-radius:14px; padding:12px 16px; }
.rs .details dt { font-weight:800; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; }
.rs .details dd { margin:0; }
.rs .asyouare { font:italic 19px/1.5 Georgia,serif; max-width:560px; margin:0 auto; }
@media (max-width:760px){ .rs .cards { grid-template-columns:1fr; } .rs .details div { grid-template-columns:1fr; gap:2px; } }
.rs .final { background:linear-gradient(160deg,var(--pink),var(--ember)); color:#fff; text-align:center; }
.rs .final h2 { color:#fff; }
.rs .final .buy { background:var(--midnight); color:#fff; box-shadow:0 12px 30px rgba(23,28,58,0.35); }
.rs .camera { font-size:14px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; opacity:0.95; margin:0 0 12px; }
.rs .cta { margin:28px 0; text-align:center; }
.rs .buy { display:inline-block; background:var(--ember); color:var(--midnight); font-weight:800; font-size:20px;
  letter-spacing:0.3px; text-decoration:none; padding:18px 40px; border-radius:999px; box-shadow:0 10px 30px rgba(242,166,90,0.4); }
.rs .tagline { font-size:14px; opacity:0.9; margin:12px 0 0; }
`
