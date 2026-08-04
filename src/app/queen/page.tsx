export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel, BuyButton, ProductBlock, salesCss } from '@/components/funnel/shared'
import { checkoutUrl } from '@/lib/funnels'

export const metadata: Metadata = {
  title: 'You Have So Much to Say — and So Little Makes It Out of Your Head',
  description:
    'For the stories that need more arc, connective tissue to your message, or untangling from each other. You’re not too much — you just need a net to catch it all. Caption Writer, $27.',
}

const CHECKOUT = checkoutUrl('queen')

export default function QueenSalesPage() {
  return (
    <main className="sales">
      <MetaPixel />
      <style>{salesCss}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">FOR THE MULTI-PASSIONATE · BY AI MOM</p>
          <h1>You have so much to say &mdash; and so little makes it out of your head.</h1>
          <p className="sub">
            For the stories that need more arc. The ones that need connective tissue to your message,
            or untangling from each other so each one can breathe. You&rsquo;re not lazy and
            you&rsquo;re not too much &mdash; <strong>you just need a net to catch it all.</strong>{' '}
            That&rsquo;s what Caption Writer is for. $27.
          </p>
          <BuyButton href={CHECKOUT} label="SAY IT ALL — $27" />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>You&rsquo;re not scattered. You&rsquo;re <em>full.</em></h2>
          <p>
            You&rsquo;re the friend everyone comes to for the take, the story, the &ldquo;okay but here&rsquo;s
            what I actually think.&rdquo; The range, the wisdom, the hundred angles &mdash; that was
            never too much. It just never had anywhere to land, or a hand to help you tell it.
          </p>
          <p className="reframe">What if you never had to lose another idea &mdash; or force one before it was ready?</p>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What it is</h2>
          <p className="lead">A place to hold your brain, and a hand telling its stories:</p>
          <blockquote>Dump every idea the moment it hits. Tell the ready ones. Park the rest for when you are.</blockquote>
          <p>Hand it whatever&rsquo;s in your head &mdash; a thought, a story, a photo and what happened.
            Caption Writer either:</p>
          <div className="cards">
            <div className="card compose">
              <span className="pill">✅ Tells it now</span>
              <p>The idea that&rsquo;s ready comes back as a finished post — hook, caption, hashtags,
                the shot to take — in your voice and your storytelling.</p>
            </div>
            <div className="card park">
              <span className="pill">🅿️ Parks it for later</span>
              <p>The idea that needs more of YOU — a detail, an ending only you know — gets{' '}
                <strong>parked</strong> with the exact thing it&rsquo;s waiting on. Come back when
                inspiration hits. It never invents; it waits for you.</p>
            </div>
          </div>
          <p>It learns your voice in 60 seconds and supports <em>how</em> you tell a story &mdash; never
            boxing you in, never telling you to &ldquo;pick a lane.&rdquo; You stay as many-sided as you
            are. It just makes sure none of it gets lost.</p>
        </div>
      </section>

      <ProductBlock />

      <section className="proof">
        <div className="wrap">
          <h2>Who it&rsquo;s for</h2>
          <p>The woman with more to say than she&rsquo;ll ever have time to type. Who&rsquo;s been
            called &ldquo;a lot&rdquo; and secretly knows it&rsquo;s true &mdash; in the best way. You
            don&rsquo;t need to be smaller, quieter, or more focused. You need somewhere to put it all
            and a hand telling it. If you&rsquo;ve got the ideas, this catches them. (And when you want
            a place that keeps it all &mdash; a journal that talks back, and a home for every caption
            &mdash; <em>the Caption Keeper</em> is coming.)</p>
        </div>
      </section>

      <section className="band faq">
        <div className="wrap">
          <h2>Questions</h2>
          <dl>
            <dt>Will it make me pick a niche?</dt>
            <dd>Never. You stay as multi-passionate as you are — it supports how you tell your stories, it doesn&rsquo;t police what they&rsquo;re about.</dd>
            <dt>I&rsquo;ve bought courses that didn&rsquo;t work.</dt>
            <dd>This isn&rsquo;t a course or a strategy to follow. It&rsquo;s a place to catch your ideas and a hand shaping them — you already have everything to say.</dd>
            <dt>What if an idea isn&rsquo;t ready?</dt>
            <dd>That&rsquo;s the Park Lot. It holds the idea with the one thing it&rsquo;s waiting on, and you come back when it clicks. Nothing gets forced, nothing gets lost.</dd>
            <dt>Will it sound like me?</dt>
            <dd>It learns your voice and storytelling from your own posts — it mirrors you, never a template.</dd>
          </dl>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Give your ideas somewhere to go.</h2>
          <BuyButton href={CHECKOUT} label="SAY IT ALL — $27" tagline="Lifetime access · Instant delivery" />
        </div>
      </section>
    </main>
  )
}
