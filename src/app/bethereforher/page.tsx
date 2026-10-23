export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel, BuyButton, salesCss } from '@/components/funnel/shared'
import FreeOptin from './FreeOptin'
import { MEDS, PREVIEW_FILE } from './meds'
import { bthfCss as extraCss } from './bthfCss'

const TITLE = 'Listen To Your Intuition — Guided Meditations by Mandi'
const SHARE_TITLE = 'Mindful Listening by Joyful Media'
const DESC =
  'Guided inner-child meditations and mindful listening, in a real warm voice, for the woman who’s cared for everyone but herself. Listen to your intuition — become your own resting place.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ['guided meditations', 'meditation', 'inner child healing', 'inner child work', 'mindful listening', 'mindfulness', 'intuition', 'listen to your intuition', 'meditation for women', 'self-trust', 'nervous system regulation', 'reparenting'],
  openGraph: { title: SHARE_TITLE, description: DESC, type: 'website', siteName: 'Joyful Media' },
  twitter: { card: 'summary_large_image', title: SHARE_TITLE, description: DESC },
}

const CHECKOUT = process.env.NEXT_PUBLIC_BETHEREFORHER_CHECKOUT || 'https://link.fastpaydirect.com/payment-link/6ab2eef69a013c156f1f990f'

export default function BeThereForHer() {
  return (
    <main className="sales bthf">
      <MetaPixel />
      <style>{salesCss}</style>
      <style>{extraCss}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">LISTEN TO YOUR INTUITION</p>
          <h1>A woman&rsquo;s intuition is her single most important <em>superpower.</em></h1>
          <p className="sub">
            You are about to radically change your life, align with everything you&rsquo;ve been calling
            in, and step into future you &mdash; virtually overnight. This is what you&rsquo;ve been waiting
            for. And I&rsquo;m not being dramatic.
          </p>
          <BuyButton href={CHECKOUT} label="Listen to your intuition — $9" />
          <p className="preview-label">Grab your headphones after bedtime and drop in. &nbsp;·&nbsp; Listen free &mdash; &ldquo;The Little You&rdquo;:</p>
          <audio controls preload="none" src={PREVIEW_FILE} className="preview" />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Your intuition is a wellspring.</h2>
          <p>The quiet knowing underneath everything. Follow it and the doors fly open &mdash; every yes
            you&rsquo;ve been waiting for, your people, the life you want but haven&rsquo;t let yourself step
            into yet.</p>
          <p>Turn away from it &mdash; for all the good reasons: comfort, convenience, consistency &mdash; and
            your superpower sense of knowing slips through unnoticed. Until you&rsquo;re the one going unnoticed.</p>
          <p>After years of being there for everyone else, your intuition turned its own volume all the way
            down.</p>
          <p className="untilnow"><strong>Until now.</strong></p>
          <p className="callout">This is for the woman who&rsquo;s done saying &ldquo;yes&rdquo; when she means
            &ldquo;no&rdquo; &mdash; done abandoning herself in the parking lot, at the menu, in her own
            marriage. Your knowing didn&rsquo;t leave. It&rsquo;s about to come roaring back.</p>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>You know exactly what I mean.</h2>
          <ul className="walkaway">
            <li>You&rsquo;ve left 45 minutes early and sat in the parking lot, because you can&rsquo;t tell when to go anymore.</li>
            <li>You ordered what she ordered so you wouldn&rsquo;t have to choose.</li>
            <li>You said yes when you meant no &mdash; then canceled last minute and called yourself a flake.</li>
            <li>Your stomach&rsquo;s been side-eyeing that mom friend for months &mdash; and you just booked the next playdate anyway.</li>
            <li>You lie awake wondering if it&rsquo;s him or if it&rsquo;s you, studying his moods for an answer your gut already has.</li>
            <li>You keep a running list of what you want, right next to the list of what you won&rsquo;t let yourself have.</li>
          </ul>
          <p className="callout">That&rsquo;s not indecision. That&rsquo;s a signal you stopped listening to your intuition &mdash; and we&rsquo;re about to turn the volume back up.</p>
        </div>
      </section>

      <section className="midcta">
        <div className="wrap">
          <BuyButton href={CHECKOUT} label="Call your intuition 📞" />
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What&rsquo;s inside</h2>
          <p className="lead"><strong>Listen To Your Intuition</strong>{' '}is seven guided sessions in my
            real voice. Not the meditation you&rsquo;ve quit before &mdash; you don&rsquo;t have to empty your
            mind, sit still, or get it right. You just listen. Ten minutes after bedtime, headphones in, drop in.</p>
          <p className="walkhead">You won&rsquo;t believe how you feel when you wake up tomorrow.</p>
          <ul className="walkaway">
            <li>Your intuition, turned all the way back up</li>
            <li>The little girl who went quiet &mdash; safe again</li>
            <li>Your yes and your no, trustworthy for the first time in years</li>
          </ul>
          <p className="lead sevenhead">Seven sessions. Ten minutes of your day.</p>
          <ol className="medlist">
            {MEDS.map((m) => (
              <li key={m.n}>
                <span className="mt">{m.title}</span>
                <span className="ml">{m.line}</span>
              </li>
            ))}
          </ol>
          <p className="bonus"><strong>Bonus:</strong>{' '}these audios also help you become your own resting
            place &mdash; even if there&rsquo;s no &ldquo;rest for the wicked,&rdquo; or time to sit.</p>
        </div>
      </section>

      <section className="product">
        <div className="wrap">
          <p className="ptag">Where this comes from</p>
          <p>Hi, I&rsquo;m Mama Mandi &mdash; owner of Joyful Media, mother to four babies here on earth and
            one in the heavens.</p>
          <p>After 15 years of yoga, meditation, and mushrooms, mindful listening was the single most powerful
            modality I have ever touched &mdash; the exact thing that broke a lifetime of my own annoying
            patterns, outdated beliefs, and problematic behaviors.</p>
          <p>Now I&rsquo;m using this work to move through my life standing up for the women who came before
            me, and the ones coming after.</p>
          <p>I&rsquo;m not here to sell you calm. I&rsquo;m handing you the exact thing that changed everything
            for me.</p>
          <p>I&rsquo;ve been told I have a voice that commands and an imagination that expands. So if
            you&rsquo;ve never made it through a meditation in your life &mdash; perfect. This isn&rsquo;t that.</p>
          <p>Grab your headphones. Meet me in the quiet. Let&rsquo;s get you back.</p>
          <blockquote className="pullquote">&ldquo;I&rsquo;m here now. I&rsquo;ve got you. I&rsquo;m not leaving again.&rdquo;</blockquote>
        </div>
      </section>

      <section className="midcta">
        <div className="wrap">
          <BuyButton href={CHECKOUT} label="I'm ready to meet myself again" />
        </div>
      </section>

      <section className="bump">
        <div className="wrap">
          <div className="bumpcard">
            <p className="bumpsell">Add the <strong>Box Breathing Pack</strong>{' '}at checkout &mdash; <strong>+$7</strong></p>
            <p className="bumpsmall">Two real breathwork sessions to settle your nervous system in about 90
              seconds &mdash; for the moments the ache shows up and you need to come back to your body fast.
              One checkbox on the payment page.</p>
          </div>
        </div>
      </section>

      <section className="optin">
        <div className="wrap">
          <p className="eyebrow2">START FREE</p>
          <h2>Not ready? Take one on me.</h2>
          <p className="osub">Drop your email and &ldquo;The Little You&rdquo; is yours right now &mdash; free.
            Grab your headphones after bedtime and drop in. You won&rsquo;t believe how you feel when you wake up
            tomorrow.</p>
          <FreeOptin />
        </div>
      </section>

      <section className="proof">
        <div className="wrap">
          <h2>What changes</h2>
          <p>You stop asking everyone else what they think before you let yourself know. You feel the yes and
            the no again &mdash; and you <em>move</em> on them. You stop second-guessing your gut about your kid,
            your marriage, your money, your whole life. The woman who knew comes roaring back &mdash; and this
            time, she doesn&rsquo;t leave.</p>
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
            <dd>Yes. Every word is me, recorded for the woman and the little girl in you.</dd>
            <dt>Do I need any experience with meditation?</dt>
            <dd>None. In fact, if you&rsquo;ve never made it through a meditation in your life &mdash; perfect.
              This isn&rsquo;t that. Press play, drop in, I do the rest.</dd>
            <dt>Is it a subscription?</dt>
            <dd>No &mdash; one payment, yours to keep forever. (If you want a new meditation every week, a
              membership is coming; you can join when it opens.)</dd>
            <dt>What if it&rsquo;s not for me?</dt>
            <dd>Because this is a digital product with instant access, all sales are final. So listen to the
              free one first &mdash; &ldquo;The Little You&rdquo; &mdash; and feel my voice before you buy.</dd>
          </dl>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>You&rsquo;ve been there for everyone.<br />Now listen to yourself.</h2>
          <BuyButton href={CHECKOUT} label="I'm ready — $9" tagline="Instant access · Listen anywhere · Yours to keep" />
          <p className="terms">Digital product &mdash; no refunds. Not a licensed therapist; these meditations
            aren&rsquo;t therapy or medical advice. Please use alongside professional care, not in place of it.</p>
        </div>
      </section>
    </main>
  )
}
