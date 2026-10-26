export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Cheat Code — 2 hours to find your golden thread, live with Mandi',
  description:
    'Everyone’s playing on hard mode. Here’s the cheat code: two hours, one-on-one with Mandi, to find your story, your golden thread, and the thing you’re meant to build with AI. Get started with me.',
}

// The Cheat Code — a 2-hour 1:1 with Mandi to find your story / product / golden
// thread and the thing you build with AI. (Was Caption-Writer-centric; re-aimed
// 2026-10-26 at your own thread, not training a GPT.)
const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_CHEATCODE_CHECKOUT_URL ||
  'https://link.fastpaydirect.com/payment-link/6a67ba88a655fa0b802a6707'
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

function MetaPixel() {
  if (!META_PIXEL) return null
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL}');fbq('track','PageView');
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.buy');if(a){fbq('track','InitiateCheckout');}});
` }} />
      <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL}&ev=PageView&noscript=1`} /></noscript>
    </>
  )
}

function RegisterButton({ label = 'Get started with me' }: { label?: string }) {
  return (
    <div className="cta">
      <a className="buy" href={CHECKOUT_URL}>{label}</a>
      <p className="tagline">Live · 2 hours · 1:1 · camera optional · over Google Meet (link sent when you book)</p>
    </div>
  )
}

const AGENDA: { mins: string; text: string }[] = [
  { mins: '10 min', text: 'Get set up — the tools, the links, the account, handled. No tech stress.' },
  { mins: '30 min', text: 'Dig for your golden thread — the story only you can tell, the one that ties your whole life together.' },
  { mins: '10 min', text: 'A “Channeling” practice — call in the message that’s been waiting to come through YOU.' },
  { mins: '30 min', text: 'Shape it into a thing — turn the thread into the product, offer, or project you’ll build with AI.' },
  { mins: '30 min', text: 'AI Q&A — every question you’ve been sitting on about building with AI, answered.' },
  { mins: '10 min', text: 'A buffer — so we end with respect for your time.' },
]

export default function CheatCodePage() {
  return (
    <main className="cc">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">THE CHEAT CODE · LIVE 1:1 WITH MANDI</p>
          <h1>Everyone&rsquo;s playing on hard mode. Here&rsquo;s the cheat code.</h1>
          <p className="sub">AI isn&rsquo;t effortless &mdash; it just owns most of the effort. But you
            still have to know <em>what</em> you&rsquo;re here to build. That&rsquo;s what we find together.</p>
          <p className="sub">Two hours, one-on-one. We dig for your story and your golden thread &mdash;
            the one message that ties your whole life together &mdash; and <strong>shape it into the thing
            you&rsquo;re meant to build with AI.</strong> You bring the raw, real you. I bring the map.</p>
          <RegisterButton />
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>Your two hours</h2>
          <p className="lead">Most of the time is dedicated to <em>YOU.</em></p>
          <ul className="agenda">
            {AGENDA.map((a, i) => (
              <li key={i}><span className="mins">{a.mins}</span><span className="atext">{a.text}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Who this is for</h2>
          <p>The woman who&rsquo;s done waiting and done holding it all alone. You&rsquo;ve got a life full
            of stories and skills and nobody&rsquo;s helped you see the thread running through them. You&rsquo;re
            ready to move into the next chapter &mdash; and you&rsquo;re beginning to believe that YOU could be
            the answer you&rsquo;ve been waiting for. The Cheat Code is your full tank of gas and a shortcut to
            the scenic route. And if you just need to breathe first, book <a href="/reset">The Reset</a> before
            your Cheat Code.</p>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>You don&rsquo;t need another course. You need your thread.</h2>
          <p className="finalsub">Become unstoppable the moment your story is clear to you &mdash; then build it, with me.</p>
          <RegisterButton />
        </div>
      </section>
    </main>
  )
}

const css = `
.cc { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; margin:0; }
.cc .wrap { max-width:720px; margin:0 auto; padding:0 24px; }
.cc h1,.cc h2 { font-family:Georgia,"Times New Roman",serif; }
.cc h1 { font-size:clamp(28px,5vw,46px); line-height:1.12; letter-spacing:-0.5px; margin:0 0 18px; }
.cc h2 { font-size:clamp(23px,4vw,32px); margin:0 0 16px; }
.cc section { padding:52px 0; }
.cc .hero { background:linear-gradient(160deg,#2b1d5e,var(--nebula) 52%,var(--ember)); color:var(--light); padding:78px 0 66px; }
.cc .hero h1 { color:#fff; }
.cc .eyebrow { letter-spacing:3px; font-size:13px; font-weight:800; color:#fff; margin:0 0 16px; }
.cc .sub { font-size:19px; color:#efe9fb; }
.cc .sub strong { color:#fff; }
.cc .band { background:#fff; }
.cc .band a { color:var(--nebula); font-weight:700; }
.cc em { font-style:italic; color:var(--nebula); }
.cc .what .lead { font-size:20px; margin:0 0 22px; }
.cc .agenda { list-style:none; padding:0; margin:0; }
.cc .agenda li { display:flex; gap:16px; align-items:baseline; padding:14px 0; border-bottom:1px solid #ece5f5; }
.cc .agenda li:last-child { border-bottom:none; }
.cc .agenda .mins { flex:none; width:66px; font-weight:800; color:var(--nebula); font-size:14px; letter-spacing:0.3px; }
.cc .agenda .atext { font-size:18px; }
.cc .closer { margin-top:24px; font-size:19px; font-family:Georgia,serif; }
.cc .final { background:linear-gradient(160deg,var(--ember),var(--pink)); color:#fff; text-align:center; }
.cc .final h2 { color:#fff; }
.cc .finalsub { font-size:18px; color:#fff; opacity:0.95; margin:0 auto; max-width:520px; }
.cc .cta { margin:28px 0 0; text-align:center; }
.cc .hero .cta { text-align:left; }
.cc .buy { display:inline-block; background:var(--ember); color:var(--midnight); font-weight:800; font-size:20px;
  letter-spacing:0.3px; text-decoration:none; padding:18px 40px; border-radius:999px; box-shadow:0 10px 30px rgba(242,166,90,0.45); transition:transform .12s ease; }
.cc .final .buy { background:#fff; }
.cc .buy:hover { transform:translateY(-2px); }
.cc .tagline { font-size:14px; opacity:0.9; margin:12px 0 0; }
`
