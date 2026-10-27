export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import Intake, { intakeCss } from '@/components/wfh/Intake'
import { SPEAKING_QUESTIONS } from '@/lib/wfh'
import { wfhCss } from '@/components/wfh/theme'
import SocialIcons from '@/components/wfh/SocialIcons'

// WFH — speaking. Mandi's theory + talks + who they're for, then the speaking
// questionnaire (emails Mandi every answer), then "Book a time with Mandi".
export const metadata: Metadata = {
  title: 'Book Mandi “AI Mom” Beck to Speak · WFH — Works For Her',
  description: 'Keynotes and workshops for women’s conferences, women in tech, and women’s leadership: intuition as the antidote in the age of AI, how to think about AI, building with AI as a mom, and mindfulness in the digital age.',
}

const TALKS = [
  { t: 'The Antidote: Women’s Intuition in the Age of AI', d: 'Intuition isn’t a soft skill. It’s the oldest intelligence we have, and the one technology can’t replicate. A keynote on trusting it again and leading with it.' },
  { t: 'How to Think — Not What to Think — About AI', d: 'A clear-eyed look at jobs, education, and creativity, plus the pushback few people air: data centers, water, and our kids. No fear, no hype.' },
  { t: 'Built at Nap Time', d: 'How a non-technical mom built a podcast and an AI command center that helps run her business, and how your audience can use AI without being used by it. Includes a live demo.' },
  { t: 'Running a Business as a Mom', d: 'Systems, AI, and permission to build something that fits your family instead of fighting it.' },
  { t: 'Mindfulness in the Digital Age', d: 'Burnout prevention for women carrying everything: a guided practice and the habits that let you show up for your life’s work, and for yourself.' },
]
const ROOMS = ['Women’s conferences', 'Women in tech events & ERGs', 'Women’s leadership summits & retreats', 'Entrepreneur & small-business events', 'Corporate teams', 'Schools & parent groups']

export default function SpeakPage() {
  return (
    <main className="w">
      <MetaPixel />
      <style>{wfhCss + intakeCss + css}</style>
      <CopyEditor />
      <header className="top">
        <div className="wrap">
          <a className="home" href="/"><img src="/wfh-logo-white.png" alt="AI WFH — Works For Her" /></a>
          <h1>Bring Mandi &ldquo;AI Mom&rdquo; Beck <em>to your stage.</em></h1>
          <p>Founder of WFH &mdash; Works For Her, and host of the AI Mom Podcast.</p>
        </div>
      </header>

      <section className="wrap sec">
        <div className="panel theory">
          <p className="tag">THE THEORY</p>
          <blockquote>Women are the answer, and their intuition the antidote, to mankind&rsquo;s potential for coexistence with exponential technology.</blockquote>
          <p>
            Mandi&rsquo;s goal is simple: make sure women aren&rsquo;t spectators to the biggest shift of our lifetime. Not afraid of
            AI, not swept away by it, but clear-eyed, grounded, and building. Peace, action, and intuition are what keep us human
            while everything accelerates, and women have been practicing all three for generations.
          </p>
          <p>
            She&rsquo;s a mom, a former realtor, and a former Evernote employee who taught herself to build with AI during nap
            times. She brings the honesty of a mom, the practicality of a business owner, and the calm of a long-time yogi and meditation practitioner.
          </p>
        </div>
      </section>

      <section className="wrap sec">
        <p className="tag">TALKS</p>
        <h2>What Mandi can bring to your audience</h2>
        <div className="talks">
          {TALKS.map(k => <div className="talk" key={k.t}><h3>{k.t}</h3><p>{k.d}</p></div>)}
        </div>
        <p className="rooms"><strong>Made for:</strong> {ROOMS.join(' · ')}</p>
        <p className="keynote"><a href="/thesis">Read the full keynote →</a></p>
      </section>

      <section className="wrap sec">
        <p className="tag">TELL MANDI ABOUT YOUR EVENT</p>
        <h2>A few questions, then pick a time</h2>
        <p className="lede">About 3 minutes. Mandi reads every answer before you talk.</p>
        <Intake kind="speaking" questions={SPEAKING_QUESTIONS} service="speaking" orgLabel="Organization or event"
          doneTitle="Mandi has your event details."
          doneBody="Pick a time for a short call to talk through your audience, the right talk, and the logistics." />
      </section>

      <footer className="foot"><SocialIcons color="#5A4FCF" /><a href="/">WFH home</a>·<a href="/aimom">AI Mom</a>·<a href="/thesis">The keynote</a></footer>
    </main>
  )
}

const css = `
.w .sec { padding:36px 20px 0; }
.w .sec:first-of-type { margin-top:-28px; position:relative; padding-top:0; }
.w .sec h2 { font-size:clamp(24px,4vw,32px); margin:0 0 8px; }
.w .lede { color:var(--muted); margin:0 0 18px; font-size:17px; }
.w .theory blockquote { font:italic 600 clamp(20px,3vw,26px)/1.35 Georgia,serif; margin:4px 0 16px; padding-left:16px; border-left:4px solid var(--ember); color:var(--midnight); }
.w .theory p { color:var(--muted); font-size:17px; margin:0 0 10px; }
.w .talks { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin:14px 0 18px; }
.w .talk { background:#fff; border:1px solid var(--line); border-radius:18px; padding:20px; box-shadow:0 14px 34px -26px rgba(23,28,58,0.4); }
.w .talk:first-child { grid-column:1 / -1; background:linear-gradient(165deg,#fff,#f4f1fd); }
.w .talk h3 { margin:0 0 6px; font-size:19px; }
.w .talk p { margin:0; color:var(--muted); font-size:15.5px; }
.w .rooms { color:var(--muted); font-size:16px; margin:0 0 8px; }
.w .keynote a { color:var(--nebula); font-weight:800; text-decoration:none; }
@media (max-width:680px){ .w .talks { grid-template-columns:1fr; } }
`
