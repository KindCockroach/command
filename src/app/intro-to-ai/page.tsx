export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import SocialIcons from '@/components/wfh/SocialIcons'
import { wfhCss } from '@/components/wfh/theme'

// aiworksforher.com/intro-to-ai — PRIVATE (unlisted, noindex) "get your feet wet" session
// Mandi shares with friends. Not business integration: a 1-hour, $150 first date with AI
// for creators, artists, and innovators. Button → Stripe once CHECKOUT_URL is set; until
// then it books a time on /meet.
export const metadata: Metadata = {
  title: 'Get Your Feet Wet with AI · a private session with Mandi',
  description: 'A relaxed, one-hour intro to AI for creators, artists, and innovators. No tech skills needed.',
  robots: { index: false, follow: false },
}

const CHECKOUT_URL = '' // paste the $150 Stripe payment link here
const BUTTON_HREF = CHECKOUT_URL || '/meet?service=intro-ai'

const WHAT = [
  { e: '🌱', t: 'Start from zero', d: 'We set up your first AI tool together, at your pace. No jargon, no judgment.' },
  { e: '💬', t: 'Learn how to talk to it', d: 'The simple ways to ask that get you real, useful answers instead of mush.' },
  { e: '🎨', t: 'Make something that’s yours', d: 'A poem, a plan, an image, a recipe, a story idea, made from your own life and craft.' },
  { e: '📝', t: 'Leave with a cheat sheet', d: 'Prompts written for you and the things you love, so you can keep playing after we hang up.' },
]

export default function IntroToAI() {
  return (
    <main className="w">
      <MetaPixel />
      <style>{wfhCss + css}</style>
      <CopyEditor />
      <header className="top">
        <div className="wrap">
          <a className="home" href="/"><img src="/wfh-logo-white.png" alt="AI WFH — Works For Her" /></a>
          <h1>Get your feet wet <em>with AI.</em></h1>
          <p>
            A relaxed, one-hour session with Mandi for creators, artists, innovators, and anyone who&rsquo;s been meaning to
            try AI but didn&rsquo;t know where to start. No business plan required. Just curiosity.
          </p>
        </div>
      </header>

      <section className="wrap body">
        <div className="panel offer">
          <div>
            <p className="tag">PRIVATE SESSION</p>
            <h2>1 hour · 1:1 on Google Meet</h2>
            <p className="muted">Bring a cup of coffee and something you love making. We&rsquo;ll take it from there.</p>
          </div>
          <div className="price">
            <span>$150</span>
            <a className="btn" href={BUTTON_HREF}>{CHECKOUT_URL ? 'Reserve my session →' : 'Book my session →'}</a>
          </div>
        </div>

        <h3 className="sec">What we&rsquo;ll do</h3>
        <div className="what">
          {WHAT.map(w => <div className="panel item" key={w.t}><span>{w.e}</span><h4>{w.t}</h4><p>{w.d}</p></div>)}
        </div>

        <div className="panel note">
          <h4>Who it&rsquo;s for</h4>
          <p>
            Painters, writers, musicians, makers, tinkerers, retirees, and grandparents who want to keep up with the
            grandkids. If you&rsquo;ve thought &ldquo;I should probably figure out this AI thing,&rdquo; this is your hour.
          </p>
          <p className="muted small">
            Running a business and want AI built into it? That&rsquo;s a different service:{' '}
            <a href="/assessment">take the AI integration questionnaire</a>.
          </p>
        </div>
      </section>

      <footer className="foot"><SocialIcons color="#5A4FCF" /><a href="/">WFH home</a>·<a href="/aimom">AI Mom</a></footer>
    </main>
  )
}

const css = `
.w .body { margin-top:-28px; position:relative; padding-bottom:30px; }
.w .offer { display:flex; justify-content:space-between; align-items:center; gap:20px; flex-wrap:wrap; }
.w .offer h2 { margin:0 0 6px; font-size:26px; }
.w .muted { color:var(--muted); margin:0; }
.w .price { display:flex; flex-direction:column; align-items:center; gap:10px; }
.w .price span { font:700 40px Georgia,serif; color:var(--copper); line-height:1; }
.w .sec { font-size:24px; margin:30px 0 12px; }
.w .what { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.w .item { padding:20px; }
.w .item span { font-size:26px; }
.w .item h4 { margin:6px 0 4px; font:700 19px Georgia,serif; }
.w .item p { margin:0; color:var(--muted); font-size:15.5px; }
.w .note { margin-top:18px; }
.w .note h4 { margin:0 0 6px; font:700 20px Georgia,serif; }
.w .note p { margin:0 0 10px; color:var(--muted); }
.w .note a { color:var(--nebula); font-weight:700; }
.w .small { font-size:14px; }
@media (max-width:640px){ .w .what { grid-template-columns:1fr; } .w .offer { flex-direction:column; align-items:flex-start; } .w .price { align-items:flex-start; } }
`
