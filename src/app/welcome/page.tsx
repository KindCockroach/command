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
        <a className="dl" href="/bethereforher/magic-is-in-the-making.pdf" target="_blank" rel="noreferrer">
          <img src="/og-cookbook.png" alt="" />
          <span>
            <strong>Your cookbook is ready.</strong>
            <em>The Magic Is in the Making</em> &mdash; tap to open and save it now. A copy is on its way to your inbox too.
          </span>
          <b>Download &darr;</b>
        </a>
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

// The instant cookbook download (doesn't depend on email delivery).
const dlCss = `
.jw .dl { display:flex; align-items:center; gap:16px; max-width:680px; margin:0 auto 22px; padding:14px 18px 14px 14px; border-radius:20px; text-decoration:none;
  background:#221923; color:#f5ece0; box-shadow:0 24px 50px -28px rgba(23,28,58,0.7); border:1px solid rgba(214,128,84,0.5); transition:transform .15s ease; }
.jw .dl:hover { transform:translateY(-3px); }
.jw .dl img { width:120px; height:63px; object-fit:cover; object-position:left; border-radius:10px; flex:none; }
.jw .dl span { flex:1; font-size:15px; line-height:1.45; color:#dccfc2; }
.jw .dl strong { display:block; font:700 19px Georgia,serif; color:#fff; }
.jw .dl em { color:#f2b872; }
.jw .dl b { flex:none; background:linear-gradient(135deg,#F7C79A,#D68054); color:#221923; padding:11px 18px; border-radius:999px; font-size:15px; }
@media (max-width:560px){ .jw .dl { flex-wrap:wrap; } .jw .dl img { width:100%; height:auto; } .jw .dl b { width:100%; text-align:center; } }
`
