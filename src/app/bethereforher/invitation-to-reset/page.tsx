export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import LearnMore from './LearnMore'

// bethereforher.com/invitation-to-reset — this week's funnel, step 2. They just asked
// for the cookbook: hand it over instantly, then invite them to The Reset. "Learn more"
// opens a pop-up (details + a meditation excerpt) without sending them to checkout.
export const metadata: Metadata = {
  title: 'Your cookbook + an invitation to The Reset · Be There For Her',
  description: 'Download The Magic Is in the Making, and join Mandi for The Reset: 60 minutes of guided time to yourself, every Sunday at 8 PM CT.',
  robots: { index: false, follow: false },
}

const CHECKOUT = 'https://buy.stripe.com/9B628rfW5dKE7N6ba59IQ03' // The Reset, $33 (same as /reset)
const PDF = '/bethereforher/magic-is-in-the-making.pdf'

export default function InvitationToReset() {
  return (
    <main className="ir">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />

      <section className="got">
        <div className="wrap">
          <p className="eyebrow">BE THERE FOR HER</p>
          <h1>Your cookbook <em>is ready.</em></h1>
          <a className="dl" href={PDF} target="_blank" rel="noreferrer">
            <img src="/bethereforher/cookbook-cover.jpg" alt="" />
            <span><strong>The Magic Is in the Making</strong>Tap to open and save it now. A copy is on its way to your inbox too (check All Mail).</span>
            <b>Download &darr;</b>
          </a>
        </div>
      </section>

      <section className="invite">
        <div className="wrap">
          <p className="tag">ONE MORE THING · YOU&rsquo;RE INVITED</p>
          <p className="hear">It&rsquo;s not obvious why a cookbook would send you to an invitation to a mindful exercise, but <em>hear me out.</em></p>
          <p>
            The woman who&rsquo;s interested in inviting magic into her life, in making room for herself in the small ways, might
            be interested in making space for herself in a big way.
          </p>
          <h2>The Reset</h2>
          <p>
            The Reset is a one-hour window blocked off just for you: a time when you can ask your co-parents and your children
            for the space to just be. Instead of spiraling, making another to-do list, or planning next week&rsquo;s lunches,
            you&rsquo;re invited to close your eyes and go inward.
          </p>

          <div className="story">
            <p className="tag">THE WOMAN WHO&rsquo;LL GUIDE YOU</p>
            <p>
              Mandi is an NLP and Time Line Therapy (TLT) practitioner: timeline integration, parts integration, and inner-child
              meditation extraordinaire. One evening, she took herself through a ten-minute timeline meditation, and the very
              next day she experienced a radically different sense of self.
            </p>
            <p>
              At the grocery store checkout, she had to put the hot food back because she didn&rsquo;t have enough to pay beyond
              her WIC and SNAP benefits. Instead of feeling embarrassment or shame, she just dealt with it, with confidence.
              Apologetic to the people behind her, she looked them in the eyes without hesitation.
            </p>
            <p>
              Stepping out to her van, where her four kids were watching a movie while she ran in, she found a grandpa standing
              behind it, waiting for her. He&rsquo;d noticed the van door hadn&rsquo;t closed when she ran out to check on the
              kids and back in, so he decided to stand guard over the kids, and over any passerby who might not understand what
              a mother is going through when she has to leave her kids in the car to get groceries.
            </p>
            <p>
              It wasn&rsquo;t until she got in the car and took a deep breath that she realized she had looked that man in the eye
              and asked his name. She didn&rsquo;t over-explain or apologize. She just thanked him. <strong>That&rsquo;s the level
              of confidence that comes with integrating the parts of you, long past, that are still driving your decisions and
              your feelings today.</strong>
            </p>
          </div>

          <p>
            The Reset is only an hour. It&rsquo;s not time enough to go deep, but it is time enough to take a broad sweep of your
            heart and your mind, to signal to your nervous system that you matter enough to set time aside just to be with it,
            just to be with yourself.
          </p>
          <p>
            This practice of pausing, of letting someone else hold your mind while you&rsquo;re guided through your imagination
            and into your heart, is more powerful than anyone is talking about.
          </p>

          <div className="when">
            <p>
              <strong>This year, after Halloween, after elections and voting, before the holidays, set an hour aside just for
              you.</strong> Come to The Reset: <strong>Sunday night, November 8 at 8 PM CT</strong>, and every Sunday after. A
              time designed for moms: after bedtime, before you&rsquo;re asleep. Tell honey you have to skip the movie. The
              characters in your book can wait till tomorrow.
            </p>
            <p className="guarantee">
              <span>The 1% promise:</span> come try something different. If it doesn&rsquo;t relieve your anxiety, stress, or
              worries by at least 1% the following week, Mandi will give you your money back.
            </p>
          </div>

          <div className="actions">
            <a className="buy" href={CHECKOUT}>Save my seat — $33</a>
            <LearnMore checkout={CHECKOUT} />
          </div>
        </div>
      </section>
    </main>
  )
}

const css = `
.ir { --cream:#F4E9DB; --band:#FBF3EA; --plum:#3c2a37; --ember:#d98c5f; --soft:#6a5a62; --midnight:#171C3A; --nebula:#5A4FCF;
  background:var(--cream); color:var(--plum); min-height:100vh; margin:0; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.ir * { box-sizing:border-box; }
.ir .wrap { max-width:720px; margin:0 auto; padding:0 20px; }
.ir h1,.ir h2,.ir h3 { font-family:Georgia,"Times New Roman",serif; }
.ir .got { background:linear-gradient(160deg,#1c1520,#2a1f2b 60%,#3b2a37); color:#f5ece0; padding:48px 0 56px; text-align:center; }
.ir .eyebrow { letter-spacing:3px; font-size:12px; font-weight:800; color:#E0A458; margin:0; }
.ir .got h1 { font-size:clamp(32px,6vw,48px); margin:10px 0 22px; color:#fff; }
.ir .got h1 em { color:#f2b872; }
.ir .dl { display:flex; align-items:center; gap:16px; text-align:left; padding:14px 18px 14px 14px; border-radius:20px; text-decoration:none;
  background:rgba(255,255,255,0.06); border:1px solid rgba(214,128,84,0.55); color:#dccfc2; transition:transform .15s ease; }
.ir .dl:hover { transform:translateY(-3px); }
.ir .dl img { width:64px; height:auto; border-radius:6px; flex:none; box-shadow:0 10px 20px rgba(0,0,0,0.4); }
.ir .dl span { flex:1; font-size:15px; line-height:1.45; }
.ir .dl strong { display:block; font:700 19px Georgia,serif; color:#fff; }
.ir .dl b { flex:none; background:linear-gradient(135deg,#F7C79A,#D68054); color:#221923; padding:11px 18px; border-radius:999px; font-size:15px; }
.ir .invite { padding:56px 0 72px; }
.ir .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--ember); margin:0 0 10px; }
.ir .invite h2 { font-size:clamp(28px,4.6vw,40px); line-height:1.15; margin:0 0 16px; }
.ir .invite h2 em { color:var(--ember); }
.ir .invite p { font-size:18px; color:var(--soft); margin:0 0 14px; }
.ir .invite p strong { color:var(--plum); }
.ir .actions { display:flex; gap:12px; flex-wrap:wrap; margin:26px 0 14px; }
.ir .buy, .ir .learn { display:inline-block; font-weight:800; font-size:17px; text-decoration:none; padding:15px 28px; border-radius:999px; cursor:pointer; font-family:inherit; transition:transform .15s ease; }
.ir .buy { background:linear-gradient(135deg,#6b3f52,#a86a72); color:#fff; box-shadow:0 12px 28px rgba(107,63,82,0.35); border:0; }
.ir .learn { background:#fff; color:var(--plum); border:1.5px solid rgba(107,63,82,0.35); box-shadow:0 10px 22px -14px rgba(60,42,55,0.5); }
.ir .buy:hover, .ir .learn:hover { transform:translateY(-2px); }
.ir .hear { font:600 clamp(22px,3.6vw,28px)/1.35 Georgia,serif; color:var(--plum) !important; margin:0 0 16px !important; }
.ir .hear em { color:var(--ember); }
.ir .invite h2 { margin-top:28px; }
.ir .story { margin:26px 0; padding:24px 22px; border-radius:20px; background:#fff; border:1px solid #ecdccf; box-shadow:0 20px 44px -30px rgba(60,42,55,0.45); }
.ir .story p { font-size:17px; }
.ir .story p:last-child { margin-bottom:0; }
.ir .when { margin:26px 0 6px; padding:22px; border-radius:20px; background:linear-gradient(160deg,#3B2A3A,#4d3a49 80%,#a86a72); color:#efe4ea; }
.ir .when p { color:#efe4ea !important; font-size:17px; }
.ir .when strong { color:#fff !important; }
.ir .guarantee { margin:14px 0 0 !important; padding:14px 16px; border-radius:14px; background:rgba(255,255,255,0.1); border:1px dashed rgba(242,184,114,0.7); }
.ir .guarantee span { display:block; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; font-size:12.5px; color:#f2b872; margin-bottom:4px; }
/* Learn more pop-up */
.lm-back { position:fixed; inset:0; z-index:1000; background:rgba(28,21,32,0.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center; padding:16px; animation:lmFade .2s ease; }
.lm { position:relative; width:100%; max-width:600px; max-height:88vh; overflow-y:auto; background:#FBF3EA; color:#3c2a37; border-radius:24px;
  padding:30px 26px 24px; box-shadow:0 40px 80px -30px rgba(0,0,0,0.6); animation:lmUp .25s ease; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
@keyframes lmFade { from { opacity:0 } to { opacity:1 } }
@keyframes lmUp { from { transform:translateY(16px); opacity:0 } to { transform:none; opacity:1 } }
.lm-x { position:absolute; top:12px; right:14px; width:36px; height:36px; border-radius:50%; border:0; background:#efe1d4; color:#3c2a37; font-size:22px; cursor:pointer; line-height:1; }
.lm-tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:#d98c5f; margin:0 0 6px; }
.lm h2 { font:700 28px Georgia,serif; margin:0 0 10px; }
.lm-lede { font-size:16.5px; color:#6a5a62; margin:0 0 18px; }
.lm h3 { font:700 18px Georgia,serif; margin:20px 0 8px; }
.lm ul { margin:0; padding-left:18px; color:#6a5a62; font-size:15.5px; }
.lm li { margin:0 0 8px; }
.lm li strong { color:#3c2a37; }
.lm blockquote { margin:0; padding:16px 18px; border-radius:16px; background:#fff; border-left:4px solid #d98c5f; font:italic 16px/1.6 Georgia,serif; color:#4d3a49; }
.lm blockquote p { margin:0 0 10px; }
.lm blockquote p:last-child { margin:0; }
.lm .lm-src { font:700 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; letter-spacing:1.5px; text-transform:uppercase; color:#a88f80; }
.lm dl { display:grid; gap:8px; margin:20px 0; }
.lm dl div { display:grid; grid-template-columns:100px 1fr; gap:10px; padding:10px 14px; border-radius:12px; background:#fff; border:1px solid #efe1d4; font-size:15px; }
.lm dt { font-weight:800; font-size:12px; letter-spacing:1.4px; text-transform:uppercase; color:#a88f80; padding-top:2px; }
.lm dd { margin:0; }
.lm-actions { display:flex; gap:10px; flex-wrap:wrap; }
.lm-buy { flex:1; text-align:center; background:linear-gradient(135deg,#6b3f52,#a86a72); color:#fff; font-weight:800; font-size:16px; text-decoration:none; padding:14px 20px; border-radius:999px; }
.lm-later { background:transparent; border:0; color:#6a5a62; font-weight:700; font-size:15px; cursor:pointer; padding:14px 10px; font-family:inherit; }
@media (max-width:520px){ .ir .dl { flex-wrap:wrap; } .ir .dl b { width:100%; text-align:center; } .lm dl div { grid-template-columns:1fr; gap:2px; } }
`
