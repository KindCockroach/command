export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'

// /welcome — where every email signup lands (bethereforher.com/in-the-kitchen and
// aiworksforher.com/cookbook). Thanks them and introduces both Joyful Media brands;
// ?from=btfh|wfh puts the one they came from first. Works on both domains.
export const metadata: Metadata = {
  title: 'Welcome · Joyful Media',
  description: 'Thank you for subscribing. Welcome to Be There For Her and AI Works For Her.',
  robots: { index: false, follow: false },
}

const BRANDS = {
  btfh: {
    key: 'btfh', name: 'Be There For Her', href: 'https://www.bethereforher.com', img: '/bethereforher/emblem.png', cta: 'Visit bethereforher.com',
    line: 'Mindful products that bring women back to themselves: guided meditations recorded by Mandi in her studio, The Reset on Sunday nights, and seasonal cookbooks with notes in the margin.',
  },
  wfh: {
    key: 'wfh', name: 'AI Works For Her', href: 'https://www.aiworksforher.com', img: '/wfh-logo-white.png', cta: 'Visit aiworksforher.com',
    line: 'Home of the AI Mom Podcast, with AI integration for small businesses, UGC, speaking, and RETIRE. All about helping women use AI without being used by it.',
  },
} as const

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
          <p>
            Thank you for subscribing. Whatever you signed up for is headed to your inbox now. If you asked for the cookbook,
            look for <em>The Magic Is in the Making</em>.
          </p>
        </div>
      </section>

      <section className="wrap brands">
        <p className="intro">You&rsquo;re now part of two places made for women. Come explore:</p>
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

      <footer className="foot">Powered by <strong>Joyful Media</strong></footer>
    </main>
  )
}

const css = `
.jw { --cream:#FBF7F1; --ink:#2b2338; --ember:#F2A65A; background:var(--cream); color:var(--ink); min-height:100vh; margin:0; line-height:1.6;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.jw * { box-sizing:border-box; }
.jw .wrap { max-width:940px; margin:0 auto; padding:0 20px; }
.jw h1, .jw h2 { font-family:Georgia,"Times New Roman",serif; letter-spacing:-0.3px; }
.jw .top { text-align:center; color:#fff; padding:56px 0 84px;
  background: radial-gradient(700px 360px at 50% -10%, rgba(90,79,207,0.5), transparent 65%),
              linear-gradient(165deg,#171C3A 0%,#2b1f45 55%,#4d3a49 100%); }
.jw .balloon { width:84px; height:auto; filter:drop-shadow(0 16px 30px rgba(226,80,138,0.35)); animation:jwFloat 7s ease-in-out infinite; }
@keyframes jwFloat { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
@media (prefers-reduced-motion:reduce){ .jw .balloon { animation:none } }
.jw h1 { font-size:clamp(32px,6vw,50px); margin:10px 0 12px; line-height:1.1; }
.jw h1 em { color:var(--ember); }
.jw .top p { font-size:18px; color:#ebe5f3; max-width:600px; margin:0 auto; }
.jw .top p em { color:#fff; }
.jw .brands { margin-top:-44px; padding-bottom:40px; }
.jw .intro { text-align:center; font-weight:700; color:#5d5470; margin:0 0 16px; background:#fff; display:table; margin:0 auto 18px; padding:8px 18px; border-radius:999px; box-shadow:0 10px 24px -16px rgba(23,28,58,0.4); }
.jw .grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.jw .brand { display:flex; flex-direction:column; align-items:center; text-align:center; text-decoration:none; color:#fff; border-radius:24px; padding:30px 26px;
  box-shadow:0 26px 50px -30px rgba(23,28,58,0.6); transition:transform .15s ease, box-shadow .15s ease; }
.jw .brand:hover { transform:translateY(-4px); box-shadow:0 32px 60px -30px rgba(23,28,58,0.7); }
.jw .brand.btfh { background:linear-gradient(165deg,#3B2A3A,#5a3f52 70%,#a86a72); }
.jw .brand.wfh { background:linear-gradient(165deg,#0f0b26,#1d1747 60%,#3b2f86); }
.jw .brand img { height:110px; width:auto; max-width:90%; object-fit:contain; margin:0 0 14px; }
.jw .brand.btfh img { filter:drop-shadow(0 12px 24px rgba(217,140,95,0.4)); }
.jw .brand h2 { margin:0 0 8px; font-size:26px; }
.jw .brand p { margin:0 0 18px; color:#efe8f4; font-size:16px; flex:1; }
.jw .go { font-weight:800; color:#2b2338; background:#fff; padding:11px 20px; border-radius:999px; box-shadow:0 10px 22px rgba(0,0,0,0.25); }
.jw .foot { text-align:center; padding:28px 20px 44px; color:#7b7290; font-size:14px; letter-spacing:.5px; }
.jw .foot strong { color:var(--ink); }
@media (max-width:700px){ .jw .grid { grid-template-columns:1fr; } }
`
