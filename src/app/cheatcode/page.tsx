export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Cheat Code — 2 hours to get ahead, live with Mandi',
  description:
    'AI owns most of the effort, but you still have to show up. Two hours live: we build your writing assistant in your voice, channel the story that’s waiting, and get you out of your own way. $55.',
}

// The Cheat Code — standalone page for the $55 live session (also an order bump).
// Energetic / advantage framing (NOT grounding — that's The Reset).
const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_CHEATCODE_CHECKOUT_URL ||
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
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.buy');if(a){fbq('track','InitiateCheckout',{value:55,currency:'USD'});}});
` }} />
      <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL}&ev=PageView&noscript=1`} /></noscript>
    </>
  )
}

function RegisterButton({ label = 'GET AHEAD — $55' }: { label?: string }) {
  return (
    <div className="cta">
      <a className="buy" href={CHECKOUT_URL}>{label}</a>
      <p className="tagline">Live · 2 hours · camera optional · you leave already ahead</p>
    </div>
  )
}

const AGENDA: { mins: string; text: string }[] = [
  { mins: '10 min', text: 'Technical assistance — the links, the pins, the setup, handled.' },
  { mins: '30 min', text: 'Writing to train your new assistant.' },
  { mins: '10 min', text: 'A “Channeling” Practice — call in the story that wants to come out; the message that’s been waiting to be said, that needs to be said by YOU.' },
  { mins: '30 min', text: 'Writing and giving feedback to your assistant.' },
  { mins: '30 min', text: 'AI Q&A — every question you’ve been sitting on, answered.' },
  { mins: '10 min', text: 'A buffer — so we end with respect for your time.' },
]

export default function CheatCodePage() {
  return (
    <main className="cc">
      <MetaPixel />
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">THE CHEAT CODE · LIVE WITH MANDI</p>
          <h1>AI isn&rsquo;t effortless. It just owns most of the effort.</h1>
          <p className="sub">You still have to click the link and pin your new GPT. You could figure it
            out on your own &mdash; what is AI good for? Or you can grab a dose of human connection and
            skip the drop-off line with your Cheat Code.</p>
          <p className="sub">Caption Writer learns your voice; the more you give it, the better it gets.
            Cheat Code takes you there: the more you give yourself, the better you get.
            <strong> Channel the story that&rsquo;s ready to come through and fall asleep with your writing assistant installed.</strong></p>
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
          <p>The woman who&rsquo;s done waiting and done holding it all alone. You&rsquo;re ready to move
            into the next chapter, and you&rsquo;re beginning to believe that YOU could be the answer
            you&rsquo;ve been waiting for. The Cheat Code is your full tank of gas, extra soft top, and
            more free time to play &mdash; it&rsquo;s your shortcut to the scenic routes of your life. And if you just need to breathe first, book <a href="/reset">The Reset</a> before
            your Cheat Code.</p>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Caption Writer + Cheat Code is a formidable pair.</h2>
          <p className="finalsub">Become unstoppable in your clarity and purpose.</p>
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
