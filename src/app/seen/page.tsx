export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel, BuyButton, ProductBlock, salesCss } from '@/components/funnel/shared'
import { checkoutUrl } from '@/lib/funnels'

export const metadata: Metadata = {
  title: 'Finally Seen — Say It Out Loud, in Your Own Voice',
  description:
    '“No one really cares what you think anyway.” You know that thought. Say it anyway — this helps you turn what you’re carrying into posts in your own voice, so you’re finally seen. $27.',
}

const CHECKOUT = checkoutUrl('seen')

export default function SeenSalesPage() {
  return (
    <main className="sales">
      <MetaPixel />
      <style>{salesCss}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">FINALLY SEEN · BY AI MOM</p>
          <h1>&ldquo;No one really cares what you think anyway.&rdquo;</h1>
          <p className="sub">
            You know that thought. Feeling small is just getting old. Your story matters &mdash; if
            only to heal yourself by writing it down and sharing it out loud. And <strong>your voice
            might be exactly what your friend needs to hear to be brave enough to tell her own story.</strong>
          </p>
          <p className="sub">
            Caption Writer helps you find the golden thread in your stories &mdash; your message, in
            your words. No blank page. No more overthinking. Come messy, come scattered, come imperfect,
            and Caption Writer will show you how your story makes sense.
          </p>
          <BuyButton href={CHECKOUT} label="Start Writing — $27" />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>You&rsquo;re not behind. You&rsquo;re <em>unheard.</em></h2>
          <p>
            You&rsquo;ve been the one who holds everyone. You notice everything, feel everything, carry
            everything &mdash; and when it&rsquo;s finally your turn to say something, the page is
            blank and you&rsquo;re too tired to translate. So you post nothing. Again. And the woman
            with the richest inner life in the room stays the most invisible.
          </p>
          <p className="reframe">What if you didn&rsquo;t have to find the <em>perfect</em> words &mdash; just tell it what happened, and let saying it out loud do the healing?</p>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What it is</h2>
          <p className="lead">A gentle system with one job:</p>
          <blockquote>Your real life in &rarr; posts that sound like you, out.</blockquote>
          <p>You dump the true thing &mdash; the moment your kid undid you, the win no one clapped for,
            the thought you keep circling. It listens, and either:</p>
          <div className="cards">
            <div className="card compose">
              <span className="pill">✅ Says it for you</span>
              <p>3 finished posts: the hook, the caption, the hashtags, and the photo to take &mdash; in your voice, not a stranger&rsquo;s.</p>
            </div>
            <div className="card park">
              <span className="pill">🅿️ Asks, never fakes</span>
              <p>When only you know the ending, it asks one real question instead of inventing a version of your life that isn&rsquo;t true.</p>
            </div>
          </div>
          <p>It learns your rhythm from your own words in 60 seconds. The result feels less like
            &ldquo;making content&rdquo; and more like finally being understood.</p>
          <BuyButton href={CHECKOUT} label="I'm Ready — $27" />
        </div>
      </section>

      <ProductBlock />

      <section className="midcta">
        <div className="wrap">
          <BuyButton href={CHECKOUT} label="Help Me Write — $27" />
        </div>
      </section>

      <section className="proof">
        <div className="wrap">
          <h2>Who it&rsquo;s for</h2>
          <p>The woman with too many passions and no tidy label. Who talks herself out of the post,
            then watches someone louder say less and get seen for it. Here&rsquo;s the truth: somewhere
            a woman just like you is waiting to feel less alone &mdash; and your voice is the one that
            reaches her. If you can send a text, you can be that voice.</p>
        </div>
      </section>

      <section className="band faq">
        <div className="wrap">
          <h2>Questions</h2>
          <dl>
            <dt>Will it sound like AI?</dt>
            <dd>It mirrors YOUR posts, YOUR rhythm, YOUR slang &mdash; and when it doesn&rsquo;t know something about your life, it asks. It never invents you.</dd>
            <dt>Do I need to be techy?</dt>
            <dd>If you can copy, paste, and text, you&rsquo;re overqualified. Setup is 10 minutes, once.</dd>
            <dt>How fast will I feel it?</dt>
            <dd>First sitting: one brain-dump &rarr; 3 posts that finally sound like you.</dd>
          </dl>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Say it anyway. Someone needs to hear it.</h2>
          <BuyButton href={CHECKOUT} label="Time to Start — $27" tagline="Lifetime access · Instant delivery" />
        </div>
      </section>
    </main>
  )
}
