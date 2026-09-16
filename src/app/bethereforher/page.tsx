export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel, BuyButton, salesCss } from '@/components/funnel/shared'
import FreeOptin from './FreeOptin'
import { MEDS, PREVIEW_FILE } from './meds'

export const metadata: Metadata = {
  title: 'Be There For Her — Inner-Child Meditations by Mandi',
  description:
    'You’ve spent your whole life being there for everyone else. There’s a little girl inside you still waiting for someone to be there for her. Guided meditations in Mandi’s real voice — become the safe place you always needed.',
}

const CHECKOUT = process.env.NEXT_PUBLIC_BETHEREFORHER_CHECKOUT || '#'

export default function BeThereForHer() {
  return (
    <main className="sales bthf">
      <MetaPixel />
      <style>{salesCss}</style>
      <style>{extraCss}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">BE THERE FOR HER · MEDITATIONS BY MANDI</p>
          <h1>You&rsquo;ve spent your whole life being there for everyone else.</h1>
          <p className="sub">
            There&rsquo;s a little girl inside you who&rsquo;s still waiting for someone to be there
            for <em>her</em>. These meditations are how you finally become that person &mdash; the
            safe, steady, unshakeable place she needed all along. In your ears, in your own time,
            whenever the ache shows up.
          </p>
          <BuyButton href={CHECKOUT} label="Come home to her — $9" />
          <p className="preview-label">Listen free &mdash; &ldquo;The Little You&rdquo;:</p>
          <audio controls preload="none" src={PREVIEW_FILE} className="preview" />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>You&rsquo;re the one who holds everyone.</h2>
          <p>Who reads the room, keeps the peace, makes it okay for everybody else. And at the end of
            the day, when it&rsquo;s finally quiet, there&rsquo;s a tightness in your chest you
            can&rsquo;t quite name.</p>
          <p className="reframe">That&rsquo;s her. The younger you who learned to be good, be quiet,
            not need too much. She never got held. She&rsquo;s been waiting &mdash; for <em>you</em>.</p>
          <p>You don&rsquo;t need another book, another course, another expert. You need ten quiet
            minutes and a voice that helps you go back and tell her the things she needed to hear.
            That&rsquo;s what this is.</p>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What&rsquo;s inside</h2>
          <p className="lead">Guided meditations, in Mandi&rsquo;s voice:</p>
          <ol className="medlist">
            {MEDS.map((m) => (
              <li key={m.n}>
                <span className="mt">{m.title}</span>
                <span className="ml">{m.line}</span>
              </li>
            ))}
          </ol>
          <p className="bonus"><strong>Bonus:</strong> a one-page <em>&ldquo;Which meditation for which
            day&rdquo;</em> guide, so you always know which one you need.</p>
        </div>
      </section>

      <section className="product">
        <div className="wrap">
          <p className="ptag">Not an app. Not a robot. <span className="arw">Me.</span></p>
          <p className="psub">Real voice · recorded slow · in a quiet room</p>
          <p>Every meditation is my own voice &mdash; the same way I once walked a whole cohort of women
            through this work, years ago. No AI narration. No stock calm-lady. Just a real woman who
            has done her own inner-child healing, sitting with you while you do yours.</p>
        </div>
      </section>

      <section className="midcta">
        <div className="wrap">
          <BuyButton href={CHECKOUT} label="Bring her home — $9" />
        </div>
      </section>

      <section className="bump">
        <div className="wrap">
          <div className="bumpcard">
            <p className="bumpsell">Add the <strong>Box Breathing Pack</strong> at checkout &mdash; <strong>+$7</strong></p>
            <p className="bumpsmall">Two real breathwork sessions to settle your nervous system in about 90
              seconds &mdash; for the moments the ache shows up and you need to come back to your body fast.
              One checkbox on the payment page.</p>
          </div>
        </div>
      </section>

      <section className="optin">
        <div className="wrap">
          <p className="eyebrow2">START FREE</p>
          <h2>Not ready yet? Take one on me.</h2>
          <p className="osub">Leave your email and &ldquo;The Little You&rdquo; is yours to keep, right now &mdash;
            plus a gentle new practice now and then. No pressure, no spam. Just a place to begin.</p>
          <FreeOptin />
        </div>
      </section>

      <section className="proof">
        <div className="wrap">
          <h2>Who it&rsquo;s for</h2>
          <p>The woman who&rsquo;s done everything right and still feels the ache. Who&rsquo;s ready to
            stop abandoning herself. Who doesn&rsquo;t want to be fixed &mdash; she wants to be held.</p>
          <p className="guarantee">Listen to all of them. If they don&rsquo;t land, email me and
            I&rsquo;ll refund you &mdash; no story required. Your healing shouldn&rsquo;t come with a risk.</p>
        </div>
      </section>

      <section className="band faq">
        <div className="wrap">
          <h2>Questions</h2>
          <dl>
            <dt>How do I listen after I buy?</dt>
            <dd>You get instant access to a private page with every meditation. Press play right there, or
              download them to your phone and listen anywhere &mdash; the car, the bath, the dark at 2am.</dd>
            <dt>Is this really your voice?</dt>
            <dd>Yes. Every word is me, recorded slow and real. Not AI, not a stranger.</dd>
            <dt>Do I need any experience with meditation?</dt>
            <dd>None. Press play, close your eyes, and follow along. I do the rest.</dd>
            <dt>Is it a subscription?</dt>
            <dd>No &mdash; one payment, yours to keep forever. (If you want a new meditation every week, a
              membership is coming; you can join when it opens.)</dd>
            <dt>What if it&rsquo;s not for me?</dt>
            <dd>Email me and I&rsquo;ll refund you. Simple as that.</dd>
          </dl>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>You&rsquo;ve been there for everyone. Start being there for her.</h2>
          <BuyButton href={CHECKOUT} label="Come home to her — $9" tagline="Instant access · Listen anywhere · Yours to keep" />
        </div>
      </section>
    </main>
  )
}

const extraCss = `
.bthf .preview-label { font-size:14px; color:#e7e2f2; margin:22px 0 8px; letter-spacing:.3px; }
.bthf audio.preview { width:100%; max-width:420px; }
.bthf .medlist { list-style:none; counter-reset:med; padding:0; margin:18px 0; }
.bthf .medlist li { counter-increment:med; display:flex; flex-direction:column; gap:2px;
  padding:14px 0 14px 44px; border-top:1px solid #e7e0d3; position:relative; }
.bthf .medlist li:first-child { border-top:none; }
.bthf .medlist li::before { content:counter(med); position:absolute; left:0; top:14px;
  width:30px; height:30px; border-radius:999px; background:var(--pink); color:#fff;
  font-family:Georgia,serif; font-weight:700; display:grid; place-items:center; font-size:15px; }
.bthf .medlist .mt { font-family:Georgia,serif; font-size:19px; font-weight:700; color:var(--midnight); }
.bthf .medlist .ml { font-size:15px; color:#6a6280; }
.bthf .bonus { font-size:16px; background:#f6edf3; border:1px solid #e6cfe0; border-radius:12px; padding:14px 16px; margin-top:18px; }
.bthf .guarantee { font-size:15px; color:#6a6280; font-style:italic; margin-top:18px; }

/* Opt-in (dark) */
.bthf .optin { background:linear-gradient(160deg,#3a2352,var(--nebula) 68%,var(--pink)); color:#fff; }
.bthf .optin .eyebrow2 { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--ember); margin:0 0 8px; }
.bthf .optin h2 { color:#fff; }
.bthf .optin .osub { font-size:18px; color:#f3ecf7; max-width:60ch; margin:0 0 6px; }
.bthf .optin .fo-form { display:grid; grid-template-columns:1fr auto; gap:12px; margin-top:14px; max-width:560px; align-items:start; }
.bthf .optin .fo-form input { box-sizing:border-box; padding:15px 16px; border-radius:12px;
  border:1px solid rgba(255,255,255,0.35); background:rgba(255,255,255,0.96); color:var(--midnight);
  font-size:16px; font-family:inherit; }
.bthf .optin .fo-form input:focus { outline:none; border-color:var(--ember); box-shadow:0 0 0 3px rgba(242,166,90,0.35); }
.bthf .optin .fo-form button { background:var(--ember); color:var(--midnight); font-weight:800; font-size:16px;
  border:none; cursor:pointer; padding:15px 24px; border-radius:999px; white-space:nowrap; }
.bthf .optin .fo-form button:disabled { opacity:0.7; cursor:default; }
.bthf .optin .fo-fine { grid-column:1 / -1; font-size:13px; opacity:0.85; margin:2px 0 0; color:#f3ecf7; }
.bthf .optin .fo-err { grid-column:1 / -1; color:#ffd7c2; font-size:14px; margin:0; }
.bthf .optin .fo-done { background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.4);
  border-radius:16px; padding:22px 24px; margin-top:8px; display:flex; flex-direction:column; gap:12px; max-width:560px; }
.bthf .optin .fo-done p { font-size:18px; color:#fff; margin:0; }
.bthf .optin .fo-done audio { width:100%; }
.bthf .optin .fo-dl { color:var(--ember); font-weight:800; text-decoration:none; }
@media (max-width:560px){ .bthf .optin .fo-form { grid-template-columns:1fr; } }
`
