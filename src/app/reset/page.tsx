export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Script from 'next/script'
import CopyEditor from '@/components/CopyEditor'

// The Reset is a Be There For Her product: its own domain, emblem icon, and preview (no AI Mom).
export const metadata: Metadata = {
  metadataBase: new URL('https://www.bethereforher.com'),
  icons: { icon: '/favicon-btfh.ico', apple: '/apple-icon-btfh.png' },
  title: 'The Reset — have you tried unplugging and plugging yourself back in?',
  description: 'Not a class. 60 minutes of guided time to yourself, live with Mandi on Sunday nights. Leave with a quieter mind, a little more patience, and one less to-do in your head. $33.',
  openGraph: {
    title: 'You’re invited to reset.',
    description: 'The Reset — come set down your brain for an hour, live with Mandi, alternating Sundays at 8 PM CT. $33.',
    url: 'https://www.bethereforher.com/reset',
    siteName: 'Be There For Her',
    images: [{ url: '/og-reset-nov22.jpg', width: 1200, height: 675 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'You’re invited to reset.',
    description: 'The Reset. Come set down your brain for an hour, alternating Sundays at 8 PM CT.',
    images: ['/og-reset-nov22.jpg'],
  },
}

// THE RESET — Mandi's live Sunday-night hour ($33). Register button opens the Luma
// checkout modal for the event (embed.lu.ma), so register + payment happen on Luma.
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
      <a className="buy luma-checkout--button" href="https://luma.com/event/evt-GhumOuY1liSK12P"
        data-luma-action="checkout" data-luma-event-id="evt-GhumOuY1liSK12P">{label}</a>
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
  { t: 'The Audit', d: 'Back to your factory settings. No more obligations for the sake of \u201cshould.\u201d Learn what it looks like to make a to-do list that actually serves YOU.' },
  { t: 'The Somatic Reset', d: 'A reset you can return to whenever life gets too loud.' },
  { t: 'The Missing Instructions', d: 'Your parents didn\u2019t get a pamphlet for raising kids and neither did you. Two creative and useful AI prompts to be more present with yourself and your kids.' },
]

export default function ResetPage() {
  return (
    <main className="rs">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />
      <Script id="luma-checkout" src="https://embed.lu.ma/checkout-button.js" strategy="afterInteractive" />

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">THE RESET · LIVE WITH MANDI</p>
          <h1>Have you tried unplugging and plugging yourself <em>back in?</em></h1>
          <p className="sub">You&rsquo;ve made a thousand choices before eating leftover dinner for lunch on Monday.</p>
        </div>
      </section>

      <section className="choices">
        <div className="wrap">
          {CHOICES.map(([a, b]) => <p className="choice" key={a}><strong>{a}</strong> {b}</p>)}
          <RegisterButton />
          <p className="ontop">
            Every app, reel, feature, podcast, and &ldquo;life changing shot&rdquo; asks you to make:
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
            <div><dt>When</dt><dd>Alternating Sundays at 8 PM CT</dd></div>
            <div><dt>Where</dt><dd>Virtual (Google Meet link provided upon registration)</dd></div>
            <div><dt>Investment</dt><dd>$33 (beta price while we find our rhythm)</dd></div>
          </dl>
          <p className="asyouare">Come as you are: exhausted, skeptical, or with your hands in the air. I&rsquo;ll meet you there.</p>
          <RegisterButton label="Save my seat — $33" />
        </div>
      </section>
    </main>
  )
}

const css = `
/* Palette pulled from the Nov 22 flyer: deep plum + wine, champagne gold type, candle glow. */
.rs { --plum:#2A0F24; --wine:#4A1A3C; --berry:#6E2A55; --gold:#E9C48A; --champ:#F6E3C3; --ember:#F0A55C; --cream:#FBF1E4;
  --glow:0 0 18px rgba(240,165,92,0.45), 0 0 42px rgba(233,196,138,0.25);
  background:var(--plum); color:#E8D6CF; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; margin:0; }
.rs .wrap { max-width:720px; margin:0 auto; padding:0 24px; }
.rs h1,.rs h2 { font-family:Georgia,"Times New Roman",serif; font-weight:400; color:var(--champ); text-shadow:var(--glow); }
.rs h1 { font-size:clamp(30px,5.4vw,48px); line-height:1.15; letter-spacing:-0.3px; margin:0 0 18px; }
.rs h2 { font-size:clamp(24px,4vw,34px); margin:0 0 18px; }
.rs section { padding:56px 0; }
.rs .hero { text-align:center; padding:88px 0 72px;
  background:radial-gradient(ellipse at 50% 18%,rgba(240,165,92,0.32),transparent 55%),linear-gradient(180deg,var(--wine),var(--plum)); }
.rs .hero h1 em { color:var(--gold); }
.rs .eyebrow { display:flex; align-items:center; justify-content:center; gap:14px; letter-spacing:4px; font-size:12.5px; font-weight:600; color:var(--champ); margin:0 0 22px; }
.rs .eyebrow::before,.rs .eyebrow::after { content:""; height:1px; width:48px; background:linear-gradient(90deg,transparent,var(--gold)); }
.rs .eyebrow::after { background:linear-gradient(90deg,var(--gold),transparent); }
.rs .sub { font:italic 20px/1.5 Georgia,serif; color:#E9D3CB; letter-spacing:0.3px; }
.rs .sub strong { color:var(--champ); }
/* The thousand choices */
.rs .choices { background:linear-gradient(180deg,var(--plum),#33122C); }
.rs .choice { font-size:18.5px; margin:0 0 12px; padding-left:16px; border-left:2px solid rgba(233,196,138,0.55); color:#D9C3BD; }
.rs .choice strong { color:var(--champ); font-weight:600; }
.rs .ontop { font-size:18px; margin:30px 0 8px; color:#D9C3BD; }
.rs .one { font:400 clamp(32px,6vw,52px)/1.1 Georgia,serif; letter-spacing:1px; margin:0; color:var(--champ); text-shadow:var(--glow); }
/* Not a class */
.rs .promise { text-align:center; background:#33122C; }
.rs .promise p { font-size:18.5px; color:#D9C3BD; margin:0 0 14px; }
.rs .forgive { font-style:italic; color:#B89AA6 !important; margin-bottom:4px !important; }
.rs .just { font:italic 21px/1.5 Georgia,serif; color:var(--champ) !important; margin:22px 0 !important; }
.rs .like { font-weight:600; color:var(--champ) !important; }
.rs .like span { color:var(--gold); }
.rs .breathe { font:italic 400 30px Georgia,serif; color:var(--gold) !important; text-shadow:var(--glow); margin:24px 0 12px !important; }
/* What you'll leave with */
.rs .leave { background:linear-gradient(180deg,#33122C,var(--wine)); }
.rs .wrap.wide { max-width:960px; }
.rs .leave h2 { text-align:center; }
.rs .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.rs .card { background:rgba(42,15,36,0.55); border:1px solid rgba(233,196,138,0.35); border-radius:20px; padding:24px;
  box-shadow:0 0 0 1px rgba(233,196,138,0.05) inset, 0 20px 44px -26px rgba(0,0,0,0.6); }
.rs .card h3 { font:400 21px Georgia,serif; margin:0 0 8px; color:var(--champ); text-shadow:0 0 14px rgba(240,165,92,0.4); }
.rs .card p { margin:0; font-size:16px; color:#D9C3BD; }
/* Details */
.rs .details { display:grid; gap:10px; max-width:520px; margin:0 auto 22px; text-align:left; }
.rs .details div { display:grid; grid-template-columns:110px 1fr; gap:12px; background:rgba(42,15,36,0.45); border:1px solid rgba(233,196,138,0.45); border-radius:999px; padding:12px 22px; }
.rs .details dt { font-weight:600; font-size:12.5px; letter-spacing:2.5px; text-transform:uppercase; color:var(--gold); }
.rs .details dd { margin:0; color:var(--champ); }
.rs .asyouare { font:italic 19px/1.5 Georgia,serif; max-width:560px; margin:0 auto; color:#E9D3CB; }
@media (max-width:760px){ .rs .cards { grid-template-columns:1fr; } .rs .details div { grid-template-columns:1fr; gap:2px; border-radius:18px; } }
.rs .final { text-align:center; background:radial-gradient(ellipse at 50% 100%,rgba(240,165,92,0.28),transparent 60%),linear-gradient(180deg,var(--wine),var(--plum)); }
.rs .camera { font-size:14px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; opacity:0.95; margin:0 0 12px; }
.rs .cta { margin:30px 0; text-align:center; }
.rs .buy { display:inline-block; background:linear-gradient(180deg,#F6DDB0,var(--gold)); color:var(--plum); font-weight:700; font-size:18px;
  letter-spacing:2px; text-transform:uppercase; text-decoration:none; padding:18px 42px; border-radius:999px;
  box-shadow:0 0 0 1px rgba(246,227,195,0.6), 0 0 28px rgba(240,165,92,0.45), 0 12px 30px -10px rgba(0,0,0,0.5); transition:box-shadow .2s, transform .2s; }
.rs .buy:hover { transform:translateY(-1px); box-shadow:0 0 0 1px rgba(246,227,195,0.8), 0 0 40px rgba(240,165,92,0.65), 0 12px 30px -10px rgba(0,0,0,0.5); }
.rs .tagline { font-size:13px; letter-spacing:1.5px; color:#C9AFB0; margin:14px 0 0; }
`
