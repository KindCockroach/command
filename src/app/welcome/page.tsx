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
      <style>{css}</style>
      <CopyEditor />
      <section className="top">
        <div className="wrap">
          <img className="balloon" src="/balloon-512.png" alt="" />
          <h1>Welcome. <em>You&rsquo;re in.</em></h1>
          <p>Thank you for signing up. Mandi built two radically different worlds to support one another.</p>
        </div>
      </section>

      <section className="wrap brands">
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
