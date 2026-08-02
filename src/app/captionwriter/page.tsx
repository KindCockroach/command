export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel, BuyButton, ProductBlock, salesCss } from '@/components/funnel/shared'
import { checkoutUrl } from '@/lib/funnels'

export const metadata: Metadata = {
  title: 'Caption Writer — Ready-to-Post Captions in Your Voice, Fast',
  description:
    'An AI that writes your Instagram captions from a 60-second brain-dump — hook, caption, hashtags, and the photo to take, in your voice. No blank page. $27.',
}

const CHECKOUT = checkoutUrl('captionwriter')

export default function CaptionWriterSalesPage() {
  return (
    <main className="sales">
      <MetaPixel />
      <style>{salesCss}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">CAPTION WRITER · BY AI MOM</p>
          <h1>An AI that writes your captions in your voice &mdash; before the coffee&rsquo;s cold.</h1>
          <p className="sub">
            You don&rsquo;t have an hour to stare at a blank caption box. Tell it what happened in a
            sentence &mdash; get back a hook, a caption, hashtags, and the photo to take.
            <strong> Ready-to-post captions in your voice, in minutes. $27.</strong>
          </p>
          <BuyButton href={CHECKOUT} label="GET CAPTION WRITER — $27" />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>The caption is the part that eats the whole nap time.</h2>
          <p>
            You&rsquo;ve got the photo. You know what you want to say-ish. Then you sit down and
            forty minutes vanish rewriting the same first line, and the baby&rsquo;s up. Caption
            Writer skips that. You talk, it writes, you post &mdash; in the pockets of time you
            actually have.
          </p>
          <p className="reframe">What if the caption took 90 seconds instead of the whole afternoon?</p>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What it does</h2>
          <p className="lead">Exactly what the name says:</p>
          <blockquote>A sentence about your day in &rarr; a ready-to-post caption out.</blockquote>
          <p>Give it the messy version — a moment, a photo, a voice memo — and it hands back:</p>
          <div className="cards">
            <div className="card compose">
              <span className="pill">✅ The full caption</span>
              <p>3 options: the hook, the caption, hashtags, and the exact photo or b-roll to shoot. Copy, paste, post.</p>
            </div>
            <div className="card park">
              <span className="pill">🅿️ One question, not a guess</span>
              <p>If it needs a detail only you know, it asks — it never makes up something about your life or your kids.</p>
            </div>
          </div>
          <p>It learns your voice from a couple of your own posts in 60 seconds, so it sounds like
            you texting a friend — not a robot.</p>
        </div>
      </section>

      <ProductBlock />

      <section className="proof">
        <div className="wrap">
          <h2>Who it&rsquo;s for</h2>
          <p>Busy moms who post for their business, brand, or side hustle and do not have time to
            become a copywriter. If you can send a text message during a diaper change, you can run
            Caption Writer.</p>
        </div>
      </section>

      <section className="band faq">
        <div className="wrap">
          <h2>Questions</h2>
          <dl>
            <dt>Do I need paid ChatGPT?</dt>
            <dd>No — a free account works (paid is smoother). A free Notion account for the workspace, too.</dd>
            <dt>Will it sound like AI?</dt>
            <dd>It mirrors your posts and slang, and asks when it doesn&rsquo;t know something instead of inventing. That&rsquo;s the difference from plain ChatGPT.</dd>
            <dt>How fast?</dt>
            <dd>First sitting: one sentence about your day &rarr; 3 ready-to-post captions.</dd>
          </dl>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>One coffee-shop lunch. Captions handled for life.</h2>
          <BuyButton href={CHECKOUT} label="GET CAPTION WRITER — $27" tagline="Lifetime access · Instant delivery · add The Reset or The Cheat Code at checkout" />
        </div>
      </section>
    </main>
  )
}
