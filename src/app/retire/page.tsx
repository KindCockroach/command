export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import Intake, { intakeCss } from '@/components/wfh/Intake'
import { RETIRE_QUESTIONS } from '@/lib/wfh'
import { wfhCss } from '@/components/wfh/theme'

// WFH — RETIRE. For owners stepping back from daily involvement: the RETIRE
// questionnaire (emails Mandi every answer), then "Book a time with Mandi".
export const metadata: Metadata = {
  title: 'RETIRE · Step back from your business with AI · WFH — Works For Her',
  description: 'For owners ready to step back from daily involvement in their business. Turn what’s in your head into guides, playbooks, and an assistant the next owner can ask.',
}

export default function RetirePage() {
  return (
    <main className="w">
      <MetaPixel />
      <style>{wfhCss + intakeCss + css}</style>
      <CopyEditor />
      <header className="top">
        <div className="wrap">
          <a className="home" href="/"><img src="/wfh-logo-white.png" alt="AI WFH — Works For Her" /></a>
          <h1>RETIRE: step back from your business <em>with the help of AI.</em></h1>
          <p>
            For owners ready to step back from daily involvement in their business. Work with Mandi &ldquo;AI Mom&rdquo; to turn
            what&rsquo;s in your head into guides, playbooks, and an assistant the next owner can ask, while you sip pi&ntilde;a
            coladas and watch your grandbabies play on the beach.
          </p>
        </div>
      </header>

      <section className="wrap sec">
        <p className="lede">
          About 5 minutes. These questions are as much for you as for Mandi. They help you think through the handoff, and
          they let her come to your call already knowing your business.
        </p>
        <Intake kind="retire" questions={RETIRE_QUESTIONS} service="retire"
          doneTitle="Mandi will read every answer before your call."
          doneBody="Book a time to talk through your plan, your timeline, and the first thing to capture." />
      </section>

      <footer className="foot"><a href="/">WFH home</a>·<a href="/assessment">AI questionnaire</a>·<a href="/aimom">AI Mom</a></footer>
    </main>
  )
}

const css = `
.w .sec { margin-top:-28px; position:relative; padding-bottom:20px; }
.w .lede { background:#fff; border:1px solid var(--line); border-radius:16px; padding:14px 18px; color:var(--muted); margin:0 0 16px; font-size:16px; }
`
