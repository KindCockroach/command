export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel, BuyButton, salesCss } from '@/components/funnel/shared'

const TITLE = 'The Wellspring — A Mindful Listening Membership by Mandi'
const DESC =
  'You found your way back to yourself. The Wellspring is where you stay — a new mindful-listening session every month, in Mandi’s real voice.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, type: 'website', siteName: 'The Wellspring' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
}

const CHECKOUT = process.env.NEXT_PUBLIC_WELLSPRING_CHECKOUT || '#'

export default function Wellspring() {
  return (
    <main className="sales bthf wellspring">
      <MetaPixel />
      <style>{salesCss}</style>
      <style>{extraCss}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">THE WELLSPRING · A MINDFUL LISTENING MEMBERSHIP</p>
          <h1>You found your way back. <em>Congratulations.</em></h1>
          <p className="sub">
            Reconnecting to yourself doesn&rsquo;t need to be a once-a-year thing. The Wellspring is the
            place you return to &mdash; to stay connected.
          </p>
          <BuyButton href={CHECKOUT} label="Join The Wellspring →" />
          <p className="preview-label">Founding rate inside &mdash; locked for life.</p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Reconnecting isn&rsquo;t a one-time fix.</h2>
          <p>You can have the most tender moment with your inner girl on a Tuesday &mdash; and by Thursday, the
            noise creeps back in. The volume on your intuition slips down. The to-do list swallows you again.</p>
          <p className="reframe">Not because you failed. Because that&rsquo;s what life does when you stop tending
            the quiet.</p>
          <p className="callout">A wellspring doesn&rsquo;t fill you once and call it done. It keeps flowing.
            That&rsquo;s the whole idea.</p>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>What&rsquo;s inside</h2>
          <p className="lead"><strong>The Wellspring</strong>{' '}is your monthly return to yourself. Every month, a
            brand-new mindful-listening session &mdash; in my real voice &mdash; lands in your library. Something for
            the season you&rsquo;re in.</p>
          <p className="walkhead">Every month you get:</p>
          <ul className="walkaway">
            <li>A new mindful-listening session &mdash; fresh, seasonal, in your ears</li>
            <li>The full back-catalog &mdash; every session, yours to stream or keep</li>
            <li>A monthly voice note from me &mdash; a real check-in, like a friend a step ahead</li>
            <li>Your founding rate, locked forever &mdash; your price never goes up</li>
          </ul>
          <p className="bonus">No streaks to keep. No pressure. No &ldquo;you&rsquo;re behind.&rdquo; Just a soft,
            steady rhythm of coming home &mdash; ten minutes at a time, for as long as you want to keep flowing.</p>
        </div>
      </section>

      <section className="product">
        <div className="wrap">
          <p className="ptag">From Mandi</p>
          <p>Hey. It&rsquo;s Mandi. I built The Wellspring because <em>I</em> need it too.</p>
          <p>Reconnecting isn&rsquo;t a graduation &mdash; there&rsquo;s no day you&rsquo;re &ldquo;done&rdquo; being
            a human with a tender inner world. So every month I sit down, in the quiet, and make the thing I wish
            someone would make for me. Then I hand it to you.</p>
          <p>You don&rsquo;t have to do this alone anymore. Come flow with me.</p>
        </div>
      </section>

      <section className="proof">
        <div className="wrap">
          <h2>Who it&rsquo;s for</h2>
          <p>For the woman who felt something shift when she first reconnected &mdash; and doesn&rsquo;t want to
            lose it. Who&rsquo;s done abandoning herself and wants a rhythm that keeps her close to her own knowing.
            Who&rsquo;d rather tend the wellspring a little each month than run dry and have to find her way back
            from scratch, again.</p>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Come home to yourself &mdash; and stay.</h2>
          <p className="offerline">A new mindful-listening session every month · the full library · a monthly voice
            note from me.</p>
          <p className="pricebig"><strong>Founding rate: $11/month</strong> &mdash; locked for life.</p>
          <BuyButton href={CHECKOUT} label="Join The Wellspring →" tagline="Cancel anytime · no guilt · no hoops" />
          <p className="terms">Recurring monthly membership; cancel anytime. Digital product &mdash; not therapy or
            medical advice. Mandi is not a licensed therapist; please use alongside professional care, not in place
            of it.</p>
        </div>
      </section>
    </main>
  )
}

const extraCss = `
.sales.bthf{ --light:#F4E9DB; --midnight:#3c2a37; --nebula:#9b6a86; --pink:#cf8aa0; --ember:#d98c5f;
  color:#463640; background:#F4E9DB; }
.bthf .hero{ background:linear-gradient(165deg,#382634 0%,#6b3f52 58%,#a86a72 100%); }
.bthf .hero h1{ color:#fdf3ea; }
.bthf .hero h1 em{ color:#f2b872; font-style:italic; text-shadow:0 2px 20px rgba(242,166,90,.45); }
.bthf .hero .eyebrow{ color:#f2d3a8; text-shadow:0 0 26px rgba(242,184,114,.8), 0 0 8px rgba(242,184,114,.55); }
.bthf .hero .sub{ color:#f2e2d7; }
.bthf h1,.bthf h2{ color:#3c2a37; }
.bthf .band{ background:#FBF3EA; }
.bthf .what,.bthf .proof{ background:#F4E9DB; }
.bthf .reframe{ font-size:14px; color:#7a6a72; }
.bthf .callout{ font-family:Georgia,serif; font-size:26px; line-height:1.42; color:var(--midnight); margin-top:8px; }
.bthf .lead{ color:#5a4a52; }
.bthf .walkhead{ font-weight:700; color:var(--midnight); margin:18px 0 8px; }
.bthf .walkaway{ list-style:none; padding:0; margin:0 0 8px; }
.bthf .walkaway li{ position:relative; padding:10px 0 10px 30px; border-top:1px solid #e7e0d3; font-size:16px; color:#4a3a42; }
.bthf .walkaway li:first-child{ border-top:none; }
.bthf .walkaway li::before{ content:"\\1F4A7"; position:absolute; left:2px; top:9px; }
.bthf .bonus{ font-size:16px; background:#F3E4D3; border:1px solid #e6cdb6; border-radius:12px; padding:14px 16px; margin-top:18px; color:#4a3a42; }
.bthf .product{ background:linear-gradient(160deg,#382634,#5f3a4f 68%,#a86a72); }
.bthf .product .ptag{ color:#f0c9a3; font-weight:800; letter-spacing:2px; text-transform:uppercase; font-size:12px; }
.bthf .final{ background:linear-gradient(160deg,#a86a72,#d5a279); }
.bthf .final h2{ color:#402a34; }
.bthf .final .offerline{ color:#402a34; font-size:16px; opacity:.9; }
.bthf .final .pricebig{ font-family:Georgia,serif; font-size:24px; color:#3c2a37; margin:10px 0 4px; }
.bthf .buy{ background:linear-gradient(135deg,#c96f7e,#d98c5f); color:#fff; box-shadow:0 10px 26px rgba(110,55,64,.32); }
.bthf .tagline{ color:#402a34; opacity:.85; }
.bthf .preview-label{ font-size:14px; color:#f2e2d7; margin:20px 0 0; letter-spacing:.3px; }
.bthf .final .terms{ font-size:12px; color:#5a4a52; opacity:.85; max-width:60ch; margin:16px auto 0; line-height:1.5; }
@media (max-width:560px){ .bthf .callout{ font-size:22px; } }

/* float + glimmer */
@keyframes wsFloat { 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-6px);} }
@keyframes wsSheen { 0%{ transform:translateX(-140%) rotate(10deg);} 55%,100%{ transform:translateX(260%) rotate(10deg);} }
.bthf .buy{ position:relative; overflow:hidden; animation:wsFloat 3.6s ease-in-out infinite; transition:transform .25s, box-shadow .25s; }
.bthf .buy:hover{ transform:translateY(-8px) scale(1.015); box-shadow:0 22px 46px rgba(110,55,64,.45); }
.bthf .buy::after{ content:""; position:absolute; top:-40%; left:0; width:38%; height:180%;
  background:linear-gradient(115deg, transparent, rgba(255,255,255,.55), transparent);
  transform:translateX(-140%) rotate(10deg); animation:wsSheen 4.8s ease-in-out infinite; pointer-events:none; }
@media (prefers-reduced-motion: reduce){ .bthf .buy, .bthf .buy::after{ animation:none; } }
`
