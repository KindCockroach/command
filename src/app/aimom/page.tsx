export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import SocialIcons from '@/components/wfh/SocialIcons'

// aiworksforher.com/aimom — Mandi's face: an intro to her, the AI Mom Podcast, be a
// guest, book her to speak, closing on her manifesto (intuition · women as the front
// line · the mission). Was the homepage until 2026-10-25; the homepage is now the AI
// services overview.
export const metadata: Metadata = {
  title: 'Mandi Beck — AI Mom · Host of the AI Mom Podcast',
  description:
    "Mom of five (one baby in heaven). A real mom, proactive woman, and AI enthusiast. Host of the AI Mom Podcast — honest conversations and tools that empower the middle class, mindful mothers, and the coming-of-age generations as AI changes everything. I believe women's intuition is the antidote to mankind's exponential potential for coexistence with exponential technology.",
}

const DOORS = [
  { href: '/listen', emoji: '🎙', label: 'Listen to the podcast', line: 'How to think — not what to think — about AI. Real, clear-eyed talk for thoughtful women.' },
  { href: '/book', emoji: '🤝', label: 'Be a guest', line: 'Have a story or a perspective women need to hear? Come on the show. Pick your date.' },
  { href: '/thesis', emoji: '🎤', label: 'Book me as a speaker', line: 'Bring the keynote on intuition, women, and the age of AI to your stage.' },
]

export default function AIMom() {
  return (
    <main className="h">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />

      {/* Hero — nice to e-meet you */}
      <section className="hero">
        <div className="wrap heroGrid">
          <div>
            <p className="eyebrow">AI MOM · <a className="eyebrowLink" href="/">AI WORKS FOR HER</a></p>
            <h1>Nice to <em>e-meet</em> you.</h1>
            <p className="lead">I&rsquo;m Mandi &mdash; they call me AI Mom.</p>
            <p className="sub">
              Mom of five &mdash; one baby in heaven. A real mom, a proactive woman, and an AI enthusiast.
              Host of the AI Mom Podcast. I build tools and have honest conversations that empower the
              middle class, mindful mothers, and the coming-of-age generations as AI changes everything.
              I believe <strong>women&rsquo;s intuition is the antidote to mankind&rsquo;s exponential potential for coexistence with exponential technology.</strong>
            </p>
            <div className="ctaRow">
              <a className="cta" href="/listen">Listen</a>
              <a className="cta ghost" href="/book">Be a guest</a>
              <a className="cta ghost" href="/thesis">Book me to speak</a>
            </div>
          </div>
          <div className="photo" role="img" aria-label="Mandi Beck" />
        </div>
      </section>

      {/* Where to get involved — three clear doors */}
      <section className="doors">
        <div className="wrap">
          <h2>Where would you like to get involved?</h2>
          <div className="grid">
            {DOORS.map((d) => (
              <a className="door" href={d.href} key={d.href}>
                <span className="demoji">{d.emoji}</span>
                <span className="dlabel">{d.label}</span>
                <span className="dline">{d.line}</span>
                <span className="dgo">Start here →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* The podcast */}
      <section className="pod">
        <div className="wrap">
          <p className="tag">🎙 THE AI MOM PODCAST</p>
          <h2>Not what to think about AI. <em>How</em> to think about it.</h2>
          <p>
            No fear. No hype. Just clear-eyed, real conversations with women figuring out how to stay
            human while everything changes &mdash; and how to use these tools instead of being used by
            them. If you&rsquo;re a thoughtful woman wondering what all of this means for your kids, your
            work, and your peace, you&rsquo;re exactly who this is for.
          </p>
          <div className="ctaRow">
            <a className="cta" href="/listen">Listen now</a>
            <a className="cta ghost" href="/book">Come on the show →</a>
          </div>
        </div>
      </section>

      {/* A little about me — meta, for guests */}
      <section className="about">
        <div className="wrap">
          <h2>A little about me &mdash; before we talk</h2>
          <p>
            I come from a line of women who broke things open. My mother and my grandmother were rebels
            against the role women were handed. I did something that surprised even me &mdash; I
            <em> chose</em> the traditional one. I became a stay-at-home mom. But I have never once been
            able to sit still while the world is on fire.
          </p>
          <p>
            Even as a kid, I carried this intense, bone-deep feeling that I was somehow responsible for
            the whole world. It took a real healing journey &mdash; parts work, inner-child work, timeline
            integration &mdash; to finally meet my fear, feel it for the first time, and then learn to be
            brave. To live in a reality where I&rsquo;m not responsible for everything &mdash; just in
            integrity with what&rsquo;s actually mine.
          </p>
          <p>
            That journey led me to mindfulness and meditation (before kids, you&rsquo;d find me at Beecroft
            Yoga three times a week). Then AI arrived, and I taught myself to build with it during nap
            times &mdash; a podcast and a whole AI command center that helps run my business &mdash; because I couldn&rsquo;t
            watch a once-in-history shift happen <em>without us</em> in the room.
          </p>
          <p>
            Off the clock, I&rsquo;m an unapologetic party girl, a music lover, and a mindful mama who
            beats to her own drum &mdash; an aspiring novelist and public speaker, currently building my
            keynote and researching my thesis on women in tech, and women, period. I have a big
            personality and an even bigger optimism. Some might call it delusional. My friends call it
            generous, intense, and hilarious &mdash; not when I&rsquo;m trying to be funny, but because my
            brain runs a little off-key and neuro-spicy, and that&rsquo;s where the fun of doing life with
            me comes from.
          </p>
          <p>
            Here&rsquo;s what I know: women can do anything. We are the holders of the world and the
            birthers of life &mdash; infinitely powerful, just living in a world that&rsquo;s been
            misaligned. I&rsquo;ve seen what opens up when women get aligned with themselves and gather
            around each other. That&rsquo;s the whole point of this &mdash; and on the show, I care more
            about a real conversation than a perfect one. Come as you are. We&rsquo;ll find the honest
            thing together.
          </p>
        </div>
      </section>

      {/* Manifesto */}
      <section className="creed">
        <div className="wrap">
          <p className="tag light">WHAT I BELIEVE</p>

          <div className="belief">
            <h3>A woman&rsquo;s intuition is not a soft skill.</h3>
            <p>
              It&rsquo;s the oldest intelligence we have &mdash; the one that reads the room, the child,
              the danger, the truth underneath the words. We were taught to override it, to defer to the
              louder logic in the room. I&rsquo;m here to help you trust it again. It was right all along.
            </p>
          </div>

          <div className="belief">
            <h3>Women are the front line.</h3>
            <p>
              The question of our time isn&rsquo;t whether man and machine can coexist &mdash; it&rsquo;s
              whether they can coexist <em>in harmony.</em> I believe women are the ones who will make
              that so. We have always been the translators between power and care, between what&rsquo;s
              possible and what&rsquo;s human. This moment needs exactly that, and it needs it from us.
            </p>
          </div>

          <div className="belief">
            <h3>My mission is to lift women up &mdash; with confidence.</h3>
            <p>
              To lift up mothers, women, and children in dark and uncertain times. To <em>show</em>, not
              just say, what&rsquo;s possible when we stop shrinking and start building together. I&rsquo;m
              genuinely confident about what we can do from here &mdash; and I&rsquo;d like to share some of
              that confidence with you.
            </p>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <SocialIcons />
          <p className="fcta"><a href="/book">Be a guest on the podcast →</a></p>
          <div className="social">
            <a href="/">AI services</a>
            <a href="/thesis">Speaking</a>
            <a href="https://aimomeducation.com">Podcast</a>
            <a href="https://instagram.com/aimompodcast">@aimompodcast</a>
            <a href="https://instagram.com/mandij0y">@mandij0y</a>
            <a href="https://instagram.com/theknowingis">@theknowingis</a>
            <a href="https://linkedin.com/in/amanda-beck-588200378">LinkedIn</a>
          </div>
          <p className="fname">Mandi Beck · AI Mom · From invisible to impactful.</p>
        </div>
      </footer>
    </main>
  )
}

const css = `
.h { --midnight:#171C3A; --nebula:#5A4FCF; --copper:#C2693F; --ember:#F2A65A; --cream:#FBF7F1;
  background:var(--cream); color:var(--midnight); line-height:1.65; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.h .wrap { max-width:960px; margin:0 auto; padding:0 24px; }
.h h1,.h h2,.h h3 { font-family:Georgia,"Times New Roman",serif; letter-spacing:-0.3px; }
.h section { padding:72px 0; }
.h em { font-style:italic; }
.h .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--copper); margin:0 0 14px; }
.h .tag.light { color:var(--ember); }
.h .ctaRow { display:flex; gap:12px; flex-wrap:wrap; margin-top:26px; }
.h .cta { display:inline-block; background:var(--nebula); color:#fff; font-weight:800; font-size:16px;
  text-decoration:none; padding:14px 26px; border-radius:999px; box-shadow:0 10px 26px rgba(90,79,207,0.3); transition:transform .12s ease; }
.h .cta:hover { transform:translateY(-2px); }
.h .cta.ghost { background:transparent; color:var(--nebula); box-shadow:none; border:1.5px solid var(--nebula); }

/* Hero */
.h .hero { background:linear-gradient(165deg,var(--midnight),#241f49 62%,var(--nebula)); color:var(--cream); padding:84px 0; }
.h .hero .eyebrow { letter-spacing:3px; font-size:13px; font-weight:800; color:var(--ember); margin:0 0 18px; }
.h .hero .eyebrowLink { color:var(--ember); text-decoration:none; border-bottom:1px solid rgba(242,166,90,0.5); }
.h .hero h1 { font-size:clamp(32px,5.5vw,52px); line-height:1.1; margin:0 0 20px; color:#fff; }
.h .hero h1 em { color:var(--ember); }
.h .hero .lead { font-size:18px; color:var(--ember); font-weight:700; margin:0 0 14px; }
.h .hero .sub { font-size:19px; color:#e7e2f2; max-width:620px; }
.h .hero .sub strong { color:#fff; }

/* Doors */
.h .doors { background:var(--cream); }
.h .doors h2 { font-size:clamp(24px,4vw,34px); margin:0 0 26px; }
.h .doors .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
.h .doors .door { display:flex; flex-direction:column; gap:8px; text-decoration:none; color:var(--midnight);
  background:#fff; border:1px solid #e7e0d3; border-radius:18px; padding:26px 22px; transition:transform .12s ease, box-shadow .12s ease; }
.h .doors .door:hover { transform:translateY(-3px); box-shadow:0 14px 34px rgba(23,28,58,0.12); }
.h .doors .demoji { font-size:30px; }
.h .doors .dlabel { font-family:Georgia,serif; font-size:21px; font-weight:700; }
.h .doors .dline { font-size:15.5px; color:#4a4560; flex:1; line-height:1.5; }
.h .doors .dgo { font-weight:800; color:var(--nebula); margin-top:6px; }
.h .heroGrid { display:grid; grid-template-columns:1.5fr 1fr; gap:40px; align-items:center; }
.h .photo { width:230px; height:230px; border-radius:50%; justify-self:center; border:4px solid rgba(242,166,90,0.6);
  background-image:url('/aimom-photo.jpg'), url('/balloon-512.png'); background-size:cover, 70%;
  background-position:center; background-repeat:no-repeat; background-color:#241f49; box-shadow:0 20px 50px rgba(0,0,0,0.35); }

/* Podcast */
.h .pod { background:#fff; }
.h .pod h2 { font-size:clamp(25px,4vw,36px); line-height:1.18; margin:0 0 18px; }
.h .pod h2 em { color:var(--nebula); }
.h .pod p { font-size:18px; max-width:720px; color:#3f3a52; }

/* About */
.h .about { background:var(--cream); }
.h .about h2 { font-size:clamp(24px,4vw,32px); margin:0 0 18px; }
.h .about p { font-size:18px; max-width:720px; color:#3f3a52; margin:0 0 16px; }

/* Creed */
.h .creed { background:linear-gradient(165deg,#2a1c3f,var(--nebula) 70%,var(--copper)); color:#fff; }
.h .creed .belief { max-width:760px; margin:0 0 34px; }
.h .creed .belief:last-child { margin-bottom:0; }
.h .creed h3 { font-size:clamp(21px,3.2vw,28px); line-height:1.25; margin:0 0 10px; color:#fff; }
.h .creed h3, .h .creed em { color:#fff; }
.h .creed p { font-size:17.5px; color:#efe9f7; }

/* Footer */
.h .foot { background:var(--midnight); color:#cfc9dd; text-align:center; padding:48px 0; }
.h .foot .fcta a { color:var(--ember); font-weight:800; font-size:18px; text-decoration:none; font-family:Georgia,serif; }
.h .foot .social { display:flex; gap:18px; justify-content:center; flex-wrap:wrap; margin:22px 0 18px; }
.h .foot .social a { color:#cfc9dd; text-decoration:none; font-size:14px; font-weight:600; }
.h .foot .social a:hover { color:#fff; }
.h .foot .fname { font-size:13px; color:#8782a0; margin:0; }

@media (max-width:720px){
  .h .heroGrid { grid-template-columns:1fr; text-align:center; }
  .h .hero .ctaRow { justify-content:center; }
  .h .photo { width:180px; height:180px; order:-1; }
  .h .hero .sub { margin-left:auto; margin-right:auto; }
  .h .doors .grid { grid-template-columns:1fr; }
}
`
