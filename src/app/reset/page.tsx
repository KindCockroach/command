export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Reset — a 60-minute reset to rewire & relax',
  description: 'A 60-minute live reset to rewire and relax — ending with a couple of prompts that leave you as supported as the meditation leaves you satisfied. $33.',
}

// Downsell for the launch: the $10 "Reset" offered to buyers who decline the
// $55 Cheat Code add-on. Register button → NEXT_PUBLIC_RESET_CHECKOUT_URL.
const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_RESET_CHECKOUT_URL ||
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

export default function ResetPage() {
  return (
    <main className="rs">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">THE RESET · LIVE WITH MANDI</p>
          <h1>60 minutes to rewire and relax.</h1>
          <p className="sub">Need to breathe before you start writing? Start here. Go Live with me for a mental
            reset — we&rsquo;ll slow down, exhale all the way, and rewire the loop
            that keeps scattering your work. You&rsquo;ll leave calm, clear, and quietly proud of yourself.</p>
          <RegisterButton />
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What the hour holds</h2>
          <ul className="list">
            <li><strong>Land</strong> — we drop out of the noise and into the moment. A real reset for your nervous system.</li>
            <li><strong>Rewire</strong> — a guided practice to loosen your grip on the steering wheel and let something calmer take its place.</li>
            <li><strong>Relax</strong> — let go for 60 minutes, and learn a little about something that can do a lot for you.</li>
            <li><strong>A couple of prompts</strong> — you leave with two prompts for AI and one for yourself, to finally read what you&rsquo;ve been trying to say all along.</li>
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Who this is for</h2>
          <p>The woman with a hundred open tabs in her head and on her screen who just needs a moment.
            This is it — one hour, thirty-three dollars, and a reset you&rsquo;ll want to come back to.</p>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <p className="camera">Show up without showing your face — turn your camera off.</p>
          <h2>One Hour. One Woman. You.</h2>
          <RegisterButton label="Yes, please — $33" />
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
.rs .sub { font-size:19px; color:#eee3ef; }
.rs .sub strong { color:#fff; }
.rs .band { background:#fff; }
.rs .list { font-size:18px; padding-left:20px; }
.rs .list li { margin:12px 0; }
.rs .final { background:linear-gradient(160deg,var(--pink),var(--ember)); color:#fff; text-align:center; }
.rs .final h2 { color:#fff; }
.rs .camera { font-size:14px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; opacity:0.95; margin:0 0 12px; }
.rs .cta { margin:28px 0; text-align:center; }
.rs .buy { display:inline-block; background:var(--ember); color:var(--midnight); font-weight:800; font-size:20px;
  letter-spacing:0.3px; text-decoration:none; padding:18px 40px; border-radius:999px; box-shadow:0 10px 30px rgba(242,166,90,0.4); }
.rs .tagline { font-size:14px; opacity:0.9; margin:12px 0 0; }
`
