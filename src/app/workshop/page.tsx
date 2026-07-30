export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sort Your Whole Life Into Content — Live Workshop',
  description: 'A 90-minute live workshop: bring your messy real life, leave with a week of ready-to-post content. $97.',
}

// Mid-rung offer for the August launch: the $97 live workshop that upsells
// Caption Writer buyers. Register button → NEXT_PUBLIC_WORKSHOP_CHECKOUT_URL
// (defaults to the Caption Writer checkout until the workshop link is set).
const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_WORKSHOP_CHECKOUT_URL ||
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
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.buy');if(a){fbq('track','InitiateCheckout',{value:97,currency:'USD'});}});
` }} />
      <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL}&ev=PageView&noscript=1`} /></noscript>
    </>
  )
}

function RegisterButton() {
  return (
    <div className="cta">
      <a className="buy" href={CHECKOUT_URL}>SAVE MY SEAT — $97</a>
      <p className="tagline">Live · 90 minutes · recording + Caption Writer workspace included</p>
    </div>
  )
}

export default function WorkshopPage() {
  return (
    <main className="ws">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">LIVE WORKSHOP</p>
          <h1>Bring your messy life. Leave with a week of content.</h1>
          <p className="sub">In 90 minutes, live with me, you&rsquo;ll turn one brain-dump of your real
            life into a full week of ready-to-post content — using Caption Writer, together, in real
            time. No theory. You post what we make.</p>
          <RegisterButton />
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What we do in the room</h2>
          <ul className="list">
            <li><strong>Dump it out</strong> — you bring the messy stuff; I show you how to capture it so nothing dies in a note.</li>
            <li><strong>Sort it live</strong> — we run it through Caption Writer and watch raw life become finished post-cards.</li>
            <li><strong>Leave with a week</strong> — you walk out with 5–7 posts ready to schedule, in your voice.</li>
            <li><strong>Keep the system</strong> — the workflow sticks, so next week you do it in 15 minutes alone.</li>
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>What&rsquo;s included</h2>
          <ol className="get">
            <li>The <strong>90-minute live workshop</strong> (weekly in August — pick your date at checkout).</li>
            <li>The <strong>full recording</strong>, yours forever.</li>
            <li>The <strong>Caption Writer workspace</strong> so your content has a home.</li>
            <li>A <strong>swipe file</strong> of the hooks and prompts we use in the room.</li>
          </ol>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>One afternoon. A week of content, and the system to keep making it.</h2>
          <RegisterButton />
        </div>
      </section>
    </main>
  )
}

const css = `
.ws { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; margin:0; }
.ws .wrap { max-width:720px; margin:0 auto; padding:0 24px; }
.ws h1,.ws h2 { font-family:Georgia,"Times New Roman",serif; }
.ws h1 { font-size:clamp(28px,5vw,44px); line-height:1.15; letter-spacing:-0.5px; margin:0 0 18px; }
.ws h2 { font-size:clamp(23px,4vw,32px); margin:0 0 18px; }
.ws section { padding:52px 0; }
.ws .hero { background:linear-gradient(160deg,var(--midnight),#2a2456 70%,var(--nebula)); color:var(--light); padding:76px 0 64px; }
.ws .hero h1 { color:#fff; }
.ws .eyebrow { letter-spacing:3px; font-size:13px; font-weight:700; color:var(--ember); margin:0 0 16px; }
.ws .sub { font-size:19px; color:#e7e2f2; }
.ws .sub strong { color:#fff; }
.ws .band { background:#fff; }
.ws .list, .ws .get { font-size:18px; padding-left:20px; }
.ws .list li, .ws .get li { margin:12px 0; }
.ws .final { background:linear-gradient(160deg,var(--nebula),var(--pink)); color:#fff; text-align:center; }
.ws .final h2 { color:#fff; }
.ws .cta { margin:28px 0; text-align:center; }
.ws .buy { display:inline-block; background:var(--ember); color:var(--midnight); font-weight:800; font-size:20px;
  letter-spacing:0.3px; text-decoration:none; padding:18px 40px; border-radius:999px; box-shadow:0 10px 30px rgba(242,166,90,0.4); }
.ws .tagline { font-size:14px; opacity:0.85; margin:12px 0 0; }
`
