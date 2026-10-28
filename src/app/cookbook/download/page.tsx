export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import { joyfulCss } from '@/components/joyful/shared'

// /cookbook/download — the instant download for cookbook signups (doesn't depend on
// email delivery). KitchenForm sends people here the moment they check the cookbook box.
// Kept off the shared /welcome page, which every kind of signup lands on. Both domains.
export const metadata: Metadata = {
  title: 'Your cookbook is ready · The Magic Is in the Making',
  description: 'Download your free seasonal cookbook, The Magic Is in the Making.',
  robots: { index: false, follow: false },
}

export default function CookbookDownload() {
  return (
    <main className="jw">
      <MetaPixel />
      <style>{joyfulCss + dlCss}</style>
      <CopyEditor />
      <section className="top">
        <div className="wrap">
          <img className="balloon" src="/balloon-512.png" alt="" />
          <h1>Your cookbook is <em>ready.</em></h1>
          <p>Tap below to open and save it now. A copy is on its way to your inbox too.</p>
        </div>
      </section>

      <section className="wrap brands">
        <a className="dl" href="/bethereforher/magic-is-in-the-making.pdf" target="_blank" rel="noreferrer">
          <img src="/og-cookbook.png" alt="" />
          <span>
            <strong>The Magic Is in the Making</strong>
            A free seasonal cookbook, with notes in the margin for more play, joy, and relief in your kitchen.
          </span>
          <b>Download &darr;</b>
        </a>
        <div className="mailnote">
          <span>📬</span>
          <p>
            <strong>Can&rsquo;t find our email? Check your All Mail.</strong> We&rsquo;re new, so our emails aren&rsquo;t
            prioritized in your inbox yet. Look in All Mail, Promotions, or Spam, and move us to your Primary inbox. We&rsquo;re a
            safe sender, and your information is secure with us.
          </p>
        </div>
        <p className="back"><a href="/welcome">Continue to Joyful Media &rarr;</a></p>
      </section>

      <footer className="foot">Powered by <strong>Joyful Media</strong></footer>
    </main>
  )
}

const dlCss = `
.jw .brands { margin-top:-44px; padding-bottom:40px; }
.jw .dl { display:flex; align-items:center; gap:16px; max-width:680px; margin:0 auto 22px; padding:14px 18px 14px 14px; border-radius:20px; text-decoration:none;
  background:#221923; color:#f5ece0; box-shadow:0 24px 50px -28px rgba(23,28,58,0.7); border:1px solid rgba(214,128,84,0.5); transition:transform .15s ease; }
.jw .dl:hover { transform:translateY(-3px); }
.jw .dl img { width:120px; height:63px; object-fit:cover; object-position:left; border-radius:10px; flex:none; }
.jw .dl span { flex:1; font-size:15px; line-height:1.45; color:#dccfc2; }
.jw .dl strong { display:block; font:700 19px Georgia,serif; color:#fff; margin-bottom:3px; }
.jw .dl b { flex:none; background:linear-gradient(135deg,#F7C79A,#D68054); color:#221923; padding:11px 18px; border-radius:999px; font-size:15px; }
@media (max-width:560px){ .jw .dl { flex-wrap:wrap; } .jw .dl img { width:100%; height:auto; } .jw .dl b { width:100%; text-align:center; } }
.jw .mailnote { display:flex; gap:12px; align-items:flex-start; max-width:680px; margin:0 auto 26px; padding:14px 18px; border-radius:16px;
  background:#fff; border:1px solid #e7e0d3; box-shadow:0 14px 30px -24px rgba(23,28,58,0.45); }
.jw .mailnote span { font-size:22px; line-height:1.2; }
.jw .mailnote p { margin:0; font-size:15px; color:#4a4560; line-height:1.5; }
.jw .mailnote strong { color:var(--ink); }
.jw .back { text-align:center; margin:0; }
.jw .back a { color:#5d5470; font-weight:700; text-decoration:none; }
`
