'use client'
import { useEffect, useState } from 'react'

// The "Learn more" pop-up: everything about The Reset plus a taste of Mandi's voice
// (an excerpt from "Come Back to Your Body"), without leaving the page or checking out.
export default function LearnMore({ checkout }: { checkout: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button className="learn" onClick={() => setOpen(true)}>Learn more</button>
      {open && (
        <div className="lm-back" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="About The Reset">
          <div className="lm" onClick={e => e.stopPropagation()}>
            <button className="lm-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            <p className="lm-tag">THE RESET · LIVE WITH MANDI</p>
            <h2>One hour, just for you.</h2>
            <p className="lm-lede">Not a class. No hype, no sales presentation, no Q&amp;A. Just you, your laptop, a notebook + tea, and 60 minutes of guided time to yourself.</p>

            <h3>What you&rsquo;ll leave with</h3>
            <ul>
              <li><strong>The Audit.</strong> Back to your factory settings: a clear picture of what you actually need today, this week, and this season of life.</li>
              <li><strong>The Somatic Reset.</strong> A guided practice for your body, mind, and nervous system you can return to whenever life feels too loud.</li>
              <li><strong>The Missing Instructions.</strong> Two simple prompts to better understand your child&rsquo;s unique behaviors, with newfound Momfidence.</li>
            </ul>

            <h3>A taste of how Mandi guides you</h3>
            <blockquote>
              <p className="lm-src">From the meditation &ldquo;Come Back to Your Body&rdquo;</p>
              <p>You&rsquo;ve held it all day, haven&rsquo;t you. Everyone else&rsquo;s stuff, the schedule, the mental list that never ends. Set it down for ten minutes. It&rsquo;ll wait. Trust me, it&rsquo;s very good at waiting.</p>
              <p>Now, your shoulders. Go ahead and let them drop. They&rsquo;ve been up around your ears keeping it high and tight since about seven this morning. She&rsquo;s done enough. Let her hang out.</p>
              <p>Underneath all the doing, there&rsquo;s a quieter you. She&rsquo;s the one who knows things before you can explain them, that little gut feeling you keep talking yourself out of. She&rsquo;s been waiting all day for you to come back.</p>
            </blockquote>

            <dl>
              <div><dt>When</dt><dd>Every Sunday at 8 PM CT</dd></div>
              <div><dt>Where</dt><dd>Google Meet, link sent when you register</dd></div>
              <div><dt>Investment</dt><dd>$33</dd></div>
            </dl>
            <div className="lm-actions">
              <a className="lm-buy" href={checkout}>Save my seat — $33</a>
              <button className="lm-later" onClick={() => setOpen(false)}>Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
