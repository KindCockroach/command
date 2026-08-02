export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'One Less Choice — a private $10 Reset',
  description: 'Psst — for my people. One hour, one less choice to make, and a little ins-AI-t. $10.',
  robots: { index: false }, // private/unlisted — share the link directly
}

// Private $10 Reset offer for Mandi's personal audience (distinct from the public
// $33 /reset). Unlisted + no-index. Register → NEXT_PUBLIC_RESET10_CHECKOUT_URL.
const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_RESET10_CHECKOUT_URL ||
  process.env.NEXT_PUBLIC_LITE_CHECKOUT_URL ||
  'https://link.fastpaydirect.com/payment-link/6a67ba88a655fa0b802a6707'
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

function MetaPixel() {
  if (!META_PIXEL) return null
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL}');fbq('track','PageView');
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.buy');if(a){fbq('track','InitiateCheckout',{value:10,currency:'USD'});}});
` }} />
      <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL}&ev=PageView&noscript=1`} /></noscript>
    </>
  )
}

function RegisterButton() {
  return (
    <div className="cta">
      <a className="buy" href={CHECKOUT_URL}>ONE LESS CHOICE — $10</a>
      <p className="tagline">60 minutes · live with me · for my people</p>
    </div>
  )
}

export default function InsaitPage() {
  return (
    <main className="in">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">PSST — FOR MY PEOPLE</p>
          <h1>This is your chance to stop making choices.</h1>
          <p className="sub">
            AI isn&rsquo;t your friend &mdash; but you use it with Google, and it does a pretty good
            job helping you choose which peanut butter to buy. As if that&rsquo;s the difference.
            Speaking of choices: you&rsquo;re tired of making them. This is your chance to stop.
            <strong> Let someone else hold the bag &mdash; and your brain &mdash; for a minute.</strong>
          </p>
          <p className="tag">Leave with some ins-<span className="hl">AI</span>-t, and one less choice to make.</p>
          <RegisterButton />
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What the hour is</h2>
          <p>One hour, live with me. We slow it all the way down, let your nervous system exhale, and
            loosen the loop that keeps you scattered. No prep, no homework, no getting it right &mdash;
            come exactly as you are. You&rsquo;ll leave calm, a little clearer, and with one less
            decision on your plate than when you got here.</p>
          <RegisterButton />
        </div>
      </section>
    </main>
  )
}

const css = `
.in { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; margin:0; }
.in .wrap { max-width:680px; margin:0 auto; padding:0 24px; }
.in h1,.in h2,.in .tag { font-family:Georgia,"Times New Roman",serif; }
.in h1 { font-size:clamp(28px,5vw,44px); line-height:1.14; letter-spacing:-0.5px; margin:0 0 18px; }
.in h2 { font-size:clamp(22px,4vw,30px); margin:0 0 16px; }
.in section { padding:56px 0; }
.in .hero { background:linear-gradient(160deg,var(--midnight),#3a2f5e 68%,var(--pink)); color:var(--light); padding:78px 0 66px; }
.in .hero h1 { color:#fff; }
.in .eyebrow { letter-spacing:3px; font-size:13px; font-weight:800; color:var(--ember); margin:0 0 16px; }
.in .sub { font-size:19px; color:#efe4ef; }
.in .sub strong { color:#fff; }
.in .tag { font-size:21px; color:#fff; font-style:italic; margin:22px 0 26px; }
.in .tag .hl { color:var(--ember); font-style:normal; font-weight:700; }
.in .what { background:#fff; }
.in .what p { font-size:19px; }
.in .cta { margin:26px 0 0; }
.in .hero .cta { text-align:left; }
.in .buy { display:inline-block; background:var(--ember); color:var(--midnight); font-weight:800; font-size:20px;
  letter-spacing:0.3px; text-decoration:none; padding:17px 38px; border-radius:999px; box-shadow:0 10px 30px rgba(242,166,90,0.4); transition:transform .12s ease; }
.in .buy:hover { transform:translateY(-2px); }
.in .tagline { font-size:14px; opacity:0.9; margin:12px 0 0; }
`
