export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

// aiworksforher.com/thesis — Mandi's keynote / speaker page. Her thesis on intuition,
// her signature talks, a clear fit-check for conference organizers, and how to book her.
// DRAFT for her review; she's still researching to present it with full confidence.
export const metadata: Metadata = {
  title: 'Mandi Beck — Keynote Speaker · The Intuition Thesis',
  description:
    'In the age of machine intelligence, human intuition — carried most fluently by women — is the decisive technology. Mandi Beck (AI Mom) on why women are the front line of man and machine coexisting in harmony. Book her to speak.',
}

const TALKS = [
  { t: 'Intuition Is the Technology', d: 'We built machines that out-calculate us. The scarce resource now is discernment — and its oldest name is intuition. Why the human edge in the AI age is the one thing we were taught to distrust.' },
  { t: 'Women on the Front Line', d: 'The question of our age isn’t whether man and machine coexist — it’s whether they coexist in harmony. Harmony needs a translator between power and care. That has always been women. A rallying, hopeful case for who leads now.' },
  { t: 'From Invisible to Impactful', d: 'How an overwhelmed stay-at-home mom taught herself to build with AI during nap times — and what it reveals about the women the future is quietly waiting on.' },
  { t: 'Raising Humans in the Age of Machines', d: 'For parenting & education stages: how to raise discerning, grounded kids — and keep your own nervous system — while everything changes. Mindful, practical, funny.' },
]

export default function Thesis() {
  return (
    <main className="t">
      <style>{css}</style>

      {/* Hero */}
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">KEYNOTE SPEAKER · AI MOM</p>
          <h1>In the age of exponential machines, a <em>woman&rsquo;s intuition</em> is where mankind&rsquo;s exponential is found.</h1>
          <p className="sub">Women carry it most fluently. I speak about why women are the front line of a future where man and machine coexist <strong>in harmony</strong> — and how we lead it.</p>
          <a className="cta" href="mailto:hi@aimomeducation.com?subject=Speaking%20inquiry%20—%20Mandi%20Beck">Book me to speak →</a>
        </div>
      </section>

      {/* The thesis */}
      <section className="thesis">
        <div className="wrap">
          <p className="tag">THE THESIS</p>
          <blockquote>
            In the age of exponential machines, a woman&rsquo;s <em>intuition</em> is where mankind&rsquo;s exponential is found — the oldest intelligence we have, and the one women were most trained to override. Women, reconnected to their intuition and aligned with themselves, are the front line of a future where man and machine coexist in harmony.
          </blockquote>
          <div className="beats">
            <p>We built machines that can out-calculate every one of us. So the scarce resource is no longer information or logic — it&rsquo;s <strong>discernment</strong>. Knowing what&rsquo;s true, what matters, and what&rsquo;s human.</p>
            <p>That discernment has a name we were taught to distrust: <strong>intuition</strong>. The intelligence that reads the room, the child, the danger, the truth underneath the words. It is not a soft skill. It is the edge.</p>
            <p>Women carry it most fluently — and were most trained to silence it. Reconnecting women to that knowing isn&rsquo;t self-help. In this moment, it&rsquo;s <strong>infrastructure</strong>.</p>
            <p>The real question of our age isn&rsquo;t whether man and machine can coexist. It&rsquo;s whether they can coexist <em>in harmony</em>. Harmony requires a translator between power and care — and that has always, quietly, been women. The future is waiting on us to remember it.</p>
          </div>
        </div>
      </section>

      {/* Signature talks */}
      <section className="talks">
        <div className="wrap">
          <p className="tag">SIGNATURE TALKS</p>
          <div className="grid">
            {TALKS.map((k) => (
              <div className="talk" key={k.t}>
                <h3>{k.t}</h3>
                <p>{k.d}</p>
              </div>
            ))}
          </div>
          <p className="note">Every talk is tailored to your audience and length — from a 15-minute spark to a 60-minute keynote with Q&amp;A.</p>
        </div>
      </section>

      {/* Fit check */}
      <section className="fit">
        <div className="wrap">
          <p className="tag light">IS THIS A FIT FOR YOUR STAGE?</p>
          <div className="fitGrid">
            <div className="yes">
              <h3>Yes, if your audience is&hellip;</h3>
              <ul>
                <li>Women in tech, leadership, or business</li>
                <li>Future-of-work &amp; AI gatherings wanting a human, hopeful voice</li>
                <li>Wellness, mindfulness &amp; women&rsquo;s empowerment events</li>
                <li>Parenting &amp; education audiences navigating the AI age</li>
                <li>Anyone who wants to leave <em>energized and clear</em>, not anxious</li>
              </ul>
            </div>
            <div className="no">
              <h3>Probably not, if you want&hellip;</h3>
              <ul>
                <li>A doom-and-gloom &ldquo;AI is coming for you&rdquo; talk</li>
                <li>A purely technical deep-dive on models and tooling</li>
                <li>A polished corporate monotone (I&rsquo;m warm, real, and a little funny)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why me */}
      <section className="why">
        <div className="wrap">
          <p className="tag">WHY ME</p>
          <p>
            I&rsquo;m Mandi Beck &mdash; mom of five (one baby in heaven), former realtor and Evernote
            employee, host of the AI Mom Podcast. Five months
            postpartum, I taught myself to build with AI during nap times: a podcast, a voice clone, a
            whole command center. I come from a line of women who broke things open, and I&rsquo;ve done
            the inner work &mdash; parts work, inner-child, timeline integration &mdash; to speak about
            intuition from the inside, not the theory. I&rsquo;m generous, intense, and genuinely funny
            (my brain runs a little off-key), with a big optimism some might call delusional. Audiences
            leave feeling seen, steadied, and ready.
          </p>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <h2>Let&rsquo;s bring this to your stage.</h2>
          <a className="cta" href="mailto:hi@aimomeducation.com?subject=Speaking%20inquiry%20—%20Mandi%20Beck">Book me to speak →</a>
          <p className="back"><a href="/aimom">← AI Mom</a> · <a href="https://aimomeducation.com">The AI Mom Podcast</a></p>
        </div>
      </footer>
    </main>
  )
}

const css = `
.t { --midnight:#171C3A; --nebula:#5A4FCF; --ember:#F2A65A; --copper:#C2693F; --cream:#FBF7F1;
  background:var(--cream); color:var(--midnight); line-height:1.65; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.t .wrap { max-width:940px; margin:0 auto; padding:0 24px; }
.t h1,.t h2,.t h3,.t blockquote { font-family:Georgia,"Times New Roman",serif; letter-spacing:-0.3px; }
.t em { font-style:italic; }
.t section { padding:68px 0; }
.t .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--copper); margin:0 0 16px; }
.t .tag.light { color:var(--ember); }
.t .cta { display:inline-block; background:var(--ember); color:var(--midnight); font-weight:800; font-size:17px;
  text-decoration:none; padding:15px 30px; border-radius:999px; box-shadow:0 10px 28px rgba(242,166,90,0.4); transition:transform .12s ease; }
.t .cta:hover { transform:translateY(-2px); }

.t .hero { background:linear-gradient(165deg,var(--midnight),#241f49 62%,var(--nebula)); color:var(--cream); padding:90px 0; text-align:center; }
.t .hero .eyebrow { letter-spacing:3px; font-size:13px; font-weight:800; color:var(--ember); margin:0 0 20px; }
.t .hero h1 { font-size:clamp(30px,5.2vw,50px); line-height:1.12; margin:0 auto 22px; color:#fff; max-width:800px; }
.t .hero h1 em { color:var(--ember); }
.t .hero .sub { font-size:19px; color:#e7e2f2; max-width:640px; margin:0 auto 28px; }
.t .hero .sub strong { color:#fff; }

.t .thesis { background:#fff; }
.t .thesis blockquote { margin:0 0 28px; font-size:clamp(21px,3.2vw,29px); line-height:1.4; color:var(--midnight); border-left:4px solid var(--ember); padding-left:22px; }
.t .thesis blockquote em { color:var(--nebula); }
.t .beats p { font-size:18px; max-width:760px; color:#3f3a52; margin:0 0 14px; }

.t .talks { background:var(--cream); }
.t .talks .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.t .talks .talk { background:#fff; border:1px solid #e7e0d3; border-radius:16px; padding:22px 24px; }
.t .talks .talk h3 { font-size:21px; margin:0 0 8px; color:var(--nebula); }
.t .talks .talk p { font-size:15.5px; color:#4a4560; margin:0; line-height:1.55; }
.t .talks .note { font-size:15px; color:#6E678A; margin:20px 0 0; }

.t .fit { background:#fff; }
.t .fit .fitGrid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.t .fit h3 { font-size:19px; margin:0 0 12px; }
.t .fit .yes { background:#F1FBF5; border:1px solid #cdeede; border-radius:16px; padding:22px 24px; }
.t .fit .no { background:#FBF4F6; border:1px solid #efd7e0; border-radius:16px; padding:22px 24px; }
.t .fit ul { margin:0; padding-left:20px; }
.t .fit li { font-size:15.5px; color:#3f3a52; margin:0 0 8px; line-height:1.5; }

.t .why { background:var(--cream); }
.t .why p { font-size:18px; max-width:780px; color:#3f3a52; }

.t .foot { background:linear-gradient(165deg,#2a1c3f,var(--nebula) 70%,var(--copper)); color:#fff; text-align:center; padding:72px 0; }
.t .foot h2 { font-size:clamp(24px,4vw,34px); margin:0 0 24px; color:#fff; }
.t .foot .back { margin-top:26px; font-size:14px; }
.t .foot .back a { color:#e7e2f2; text-decoration:none; font-weight:600; }

@media (max-width:720px){
  .t .talks .grid, .t .fit .fitGrid { grid-template-columns:1fr; }
}
`
