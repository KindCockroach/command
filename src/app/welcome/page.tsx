export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import JoyfulSignup from '@/components/joyful/JoyfulSignup'
import { BRANDS, joyfulCss as css } from '@/components/joyful/shared'

// /welcome — where every email signup lands (bethereforher.com/in-the-kitchen and
// aiworksforher.com/cookbook). Thanks them and introduces both Joyful Media brands;
// ?from=btfh|wfh puts the one they came from first. Works on both domains.
export const metadata: Metadata = {
  title: 'Welcome · Joyful Media',
  description: 'Thank you for subscribing. Welcome to Be There For Her and AI Works For Her.',
  robots: { index: false, follow: false },
}

export default async function Welcome({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams
  const order = from === 'wfh' ? [BRANDS.wfh, BRANDS.btfh] : [BRANDS.btfh, BRANDS.wfh]
  return (
    <main className="jw">
      <MetaPixel />
      <style>{css + dlCss}</style>
      <CopyEditor />
      <section className="top">
        <div className="wrap">
          <img className="balloon" src="/balloon-512.png" alt="" />
          <h1>Welcome. <em>You&rsquo;re in.</em></h1>
          <p>Thank you for signing up. Mandi built two radically different worlds to support one another.</p>
        </div>
      </section>

      <section className="wrap brands">
        <div className="mailnote">
          <span>📬</span>
          <p>
            <strong>Can&rsquo;t find our email? Check your All Mail.</strong> We&rsquo;re new, so our emails aren&rsquo;t
            prioritized in your inbox yet. Look in All Mail, Promotions, or Spam, and move us to your Primary inbox. We&rsquo;re a
            safe sender, and your information is secure with us.
          </p>
        </div>
        <p className="intro">You&rsquo;re invited:</p>
        <div className="grid">
          {order.map(b => (
            <a className={`brand ${b.key}`} href={b.href} key={b.key}>
              <img src={b.img} alt={b.name} />
              <h2>{b.name}</h2>
              <p>{b.line}</p>
              <span className="go">{b.cta} &rarr;</span>
            </a>
          ))}
        </div>
      </section>

      <section className="wrap join">
        <div className="jcard">
          <p className="jlead">
            For updates from Mandi and Joyful Media on all things, including the AI Mom Podcast and her
            &ldquo;Seasonal Creations,&rdquo; sign up here.
          </p>
          <JoyfulSignup />
        </div>
      </section>

      <footer className="foot">Powered by <strong>Joyful Media</strong></footer>
    </main>
  )
}

// The "can't find our email" note shown to every signup.
const dlCss = `
.jw .brands { margin-top:-44px; }
.jw .mailnote { display:flex; gap:12px; align-items:flex-start; max-width:680px; margin:0 auto 26px; padding:14px 18px; border-radius:16px;
  background:#fff; border:1px solid #e7e0d3; box-shadow:0 14px 30px -24px rgba(23,28,58,0.45); }
.jw .mailnote span { font-size:22px; line-height:1.2; }
.jw .mailnote p { margin:0; font-size:15px; color:#4a4560; line-height:1.5; }
.jw .mailnote strong { color:var(--ink); }
`
