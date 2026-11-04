export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import CopyEditor from '@/components/CopyEditor'

// RESET WELCOME — bethereforher.com/resetwelcome (host rewrite in middleware.ts).
// For people who just bought The Reset: a free 5-minute gift, ways to prepare, and an
// invitation to log on at 7:30 for hand-held prep. NO selling here (Mandi, 2026-11-04).
// GIFT_AUDIO is empty until Mandi records the gift; drop the file in
// public/bethereforher/reset/ and set the path below.
export const metadata: Metadata = {
  title: 'Welcome to The Reset',
  description: 'You’re in. Here’s your free 5-minute gift and how to get ready for Sunday.',
  robots: { index: false, follow: false },
}

const GIFT_AUDIO = ''
// The Reset's Google Meet room. The Join button appears once this is set.
const MEET_URL = ''

const SPACE = [
  { icon: '🕯', t: 'Light a candle', d: 'One flame tells your whole body the day is over.' },
  { icon: '🌾', t: 'Light incense', d: 'Pick a scent you only use for this. Your nose will learn the way back.' },
  { icon: '💧', t: 'Start your diffuser', d: 'Lavender, cedar, orange. Whatever makes you exhale.' },
  { icon: '🌙', t: 'Set the lights', d: 'Overheads off. Lamp low. Let it feel like evening.' },
]

const PREP = [
  ['Claim your spot.', 'Somewhere nobody will find you for an hour. Your bed counts. The closet floor counts. The car counts.'],
  ['Tell the house.', 'Mom is off duty from 8 to 9. Tell honey before Sunday, not at 7:59.'],
  ['Gather your things.', 'A notebook and pen, tea or water, a blanket, and headphones if the house is loud.'],
  ['Wear something soft.', 'If it has a waistband you notice, change.'],
  ['Silence everything else.', 'Phone on Do Not Disturb. Laptop charged. Your Google Meet link ready.'],
  ['Come as you are.', 'Cranky, tired, camera off. All of it is welcome.'],
]

export default function ResetWelcome() {
  return (
    <main className="rw">
      <style>{css}</style>
      <CopyEditor />

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">THE RESET · BE THERE FOR HER</p>
          <h1>You&rsquo;re in. <em>Welcome to The Reset.</em></h1>
          <p className="sub">Sunday at 8 PM CT, live on Google Meet.</p>
        </div>
      </section>

      <section className="gift">
        <div className="wrap">
          <div className="giftcard">
            <p className="tag">YOUR FREE GIFT</p>
            <h2>Five minutes, just for you.</h2>
            <p>I recorded this for the women coming to The Reset. Listen tonight, or right before Sunday. It&rsquo;s a small door back to yourself.</p>
            {GIFT_AUDIO
              ? <audio controls preload="none" src={GIFT_AUDIO} />
              : <p className="soon">🎧 I&rsquo;m recording it fresh for you. It will be right here before Sunday.</p>}
          </div>
        </div>
      </section>

      <section className="early">
        <div className="wrap">
          <p className="tag">A SPECIAL INVITATION</p>
          <h2>Log on early at 7:30.</h2>
          <p>
            You can do all of this on your own. But if you&rsquo;d like someone to hold your hand from start to finish,
            from prep to Reset, I&rsquo;ll be there for you. Log on 30 minutes early, at 7:30 PM CT, and we&rsquo;ll light
            the candle, set the lights, and settle in together.
          </p>
          <dl className="details">
            <div><dt>Prep (optional)</dt><dd>Sunday, 7:30 PM CT</dd></div>
            <div><dt>The Reset</dt><dd>Sunday, 8:00 PM CT</dd></div>
            <div><dt>Where</dt><dd>{MEET_URL ? 'Google Meet, the same link for both' : 'Google Meet, using the link Mandi sends you'}</dd></div>
          </dl>
          {MEET_URL && <a className="meet" href={MEET_URL} target="_blank" rel="noopener noreferrer">Join on Google Meet</a>}
        </div>
      </section>

      <section className="space">
        <div className="wrap">
          <h2>Set your space</h2>
          <p className="lede">Little rituals that tell your nervous system it&rsquo;s safe to slow down.</p>
          <div className="grid">
            {SPACE.map(s => (
              <div className="card" key={s.t}>
                <span className="ic">{s.icon}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="prep">
        <div className="wrap">
          <h2>How to get ready</h2>
          <ol>
            {PREP.map(([t, d]) => <li key={t}><strong>{t}</strong> {d}</li>)}
          </ol>
        </div>
      </section>

      <footer className="foot">See you Sunday. Be there for her. 🤍</footer>
    </main>
  )
}

const css = `
.rw { --cream:#F4E9DB; --plum:#3c2a37; --ember:#d98c5f; --soft:#6a5a62;
  background:var(--cream); color:var(--plum); min-height:100vh; margin:0; line-height:1.6;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.rw * { box-sizing:border-box; }
.rw .wrap { max-width:720px; margin:0 auto; padding:0 20px; }
.rw h1,.rw h2,.rw h3 { font-family:Georgia,"Times New Roman",serif; }
.rw .hero { background:linear-gradient(160deg,#1c1520,#2a1f2b 60%,#3b2a37); color:#f5ece0; padding:60px 0 90px; text-align:center; }
.rw .eyebrow, .rw .tag { letter-spacing:3px; font-size:12px; font-weight:800; color:#E0A458; margin:0; }
.rw h1 { font-size:clamp(34px,6.5vw,50px); line-height:1.1; margin:12px 0 16px; color:#fff; }
.rw h1 em { color:#f2b872; display:block; }
.rw .sub { font-size:19px; color:#e6d8ca; margin:0 auto; max-width:540px; }
.rw h2 { font-size:clamp(24px,4vw,32px); margin:0 0 14px; }
.rw .gift { margin-top:-56px; padding-bottom:52px; }
.rw .giftcard { background:#fff; border:1px solid #ecdccb; border-radius:24px; padding:28px 28px 26px; text-align:center;
  box-shadow:0 24px 50px -30px rgba(60,42,55,0.55); }
.rw .giftcard h2 { margin:8px 0 10px; }
.rw .giftcard p { color:var(--soft); margin:0 0 16px; }
.rw .giftcard audio { width:100%; }
.rw .soon { background:#FBF3EA; border:1px dashed #e0b48f; border-radius:14px; padding:14px 16px; color:var(--plum) !important; margin:0 !important; }
.rw .prep { padding:20px 0 52px; }
.rw ol { margin:0; padding-left:22px; display:grid; gap:12px; font-size:17px; }
.rw ol li::marker { color:var(--ember); font-weight:800; }
.rw ol strong { color:var(--plum); }
.rw .space { padding:52px 0 36px; }
.rw .lede { color:var(--soft); margin:-6px 0 20px; }
.rw .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
.rw .card { background:#fff; border:1px solid #ecdccb; border-radius:20px; padding:20px 22px; }
.rw .ic { font-size:28px; }
.rw .card h3 { margin:6px 0 4px; font-size:19px; }
.rw .card p { margin:0; color:var(--soft); font-size:15.5px; }
.rw .early { background:linear-gradient(160deg,#2a1f2b,#3b2a37); color:#f5ece0; padding:52px 0 56px; }
.rw .early h2 { color:#fff; margin-top:8px; }
.rw .early p { color:#e6d8ca; font-size:17px; margin:0 0 22px; }
.rw .details { display:grid; gap:10px; margin:0; }
.rw .details div { display:grid; grid-template-columns:150px 1fr; gap:12px; background:rgba(255,255,255,0.07); border:1px solid rgba(242,184,114,0.4);
  border-radius:14px; padding:12px 16px; }
.rw .details dt { font-weight:800; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; color:#f2b872; }
.rw .details dd { margin:0; color:#fff; }
.rw .meet { display:inline-block; margin-top:22px; background:var(--ember); color:#fff; font-weight:800; font-size:17px;
  padding:14px 28px; border-radius:999px; text-decoration:none; box-shadow:0 12px 28px -14px rgba(217,140,95,0.9); }
.rw .meet:hover { background:#c97a4d; }
.rw .foot { text-align:center; padding:28px 20px 40px; font:italic 18px Georgia,serif; color:var(--soft); }
@media (max-width:600px){ .rw .grid { grid-template-columns:1fr; } .rw .details div { grid-template-columns:1fr; gap:2px; } }
`
