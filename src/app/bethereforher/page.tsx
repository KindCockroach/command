export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel, BuyButton, salesCss } from '@/components/funnel/shared'
import { MEDS, PREVIEW_FILE } from './meds'

export const metadata: Metadata = {
  title: 'Be There For Her — Inner-Child Meditations by Mandi',
  description:
    'You’ve spent your whole life being there for everyone else. There’s a little girl inside you still waiting for someone to be there for her. Seven guided meditations to become the safe place you always needed.',
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
            for <em>her</em>. These seven meditations are how you finally become that person &mdash; the
            safe, steady, unshakeable place she needed all along. In your ears, in your own time,
            whenever the ache shows up.
          </p>
          <BuyButton href={CHECKOUT} label="Come home to her — $9" />
          <p className="preview-label">Listen free — &ldquo;The Little You&rdquo;:</p>
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
          <p className="lead">Seven guided meditations, in Mandi&rsquo;s voice:</p>
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

      <section className="midcta">
        <div className="wrap">
          <BuyButton href={CHECKOUT} label="Bring her home — $9" />
        </div>
      </section>

      <section className="proof">
        <div className="wrap">
          <h2>Who it&rsquo;s for</h2>
          <p>The woman who&rsquo;s done everything right and still feels the ache. Who&rsquo;s ready to
            stop abandoning herself. Who doesn&rsquo;t want to be fixed &mdash; she wants to be held.</p>
          <p className="guarantee">Listen to all seven. If they don&rsquo;t land, email me and
            I&rsquo;ll refund you &mdash; no story required. Your healing shouldn&rsquo;t come with a risk.</p>
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
`
