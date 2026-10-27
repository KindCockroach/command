export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import KitchenForm from './KitchenForm'

// LOVE YOURSELF IN THE KITCHEN — bethereforher.com/in-the-kitchen. Email signup for the
// seasonal cookbooks and/or the Be There For Her newsletter, then on to /intuition.
export const metadata: Metadata = {
  title: 'Love Yourself In The Kitchen · Be There For Her',
  description: 'Seasonal cookbooks with notes in the margin that encourage play, joy, and relief in the kitchen.',
  openGraph: { title: 'Love Yourself In The Kitchen', description: 'Free seasonal cookbook: The Magic Is in the Making. Notes in the margin for play, joy, and relief in the kitchen.', images: [{ url: '/og-cookbook.png', width: 1200, height: 630 }], type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Love Yourself In The Kitchen', description: 'Free seasonal cookbook: The Magic Is in the Making.', images: ['/og-cookbook.png'] },
}

export default function InTheKitchen() {
  return (
    <main className="k">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />
      <section className="khero">
        <div className="wrap">
          <a className="eyebrow" href="/bethereforher">BE THERE FOR HER</a>
          <h1>Love yourself <em>in the kitchen.</em></h1>
          <p>
            Seasonal cookbooks with notes in the margin: little nudges toward play, joy, and relief at the stove.
            Because feeding everyone shouldn&rsquo;t mean forgetting yourself.
          </p>
        </div>
      </section>
      <section className="wrap kbody">
        <div className="kcard"><KitchenForm /></div>
        <p className="kfine">We&rsquo;ll only send what you check. Unsubscribe anytime.</p>
      </section>
    </main>
  )
}

const css = `
.k { --cream:#F4E9DB; --band:#FBF3EA; --plum:#3c2a37; --ember:#d98c5f; --soft:#6a5a62; --rose:#cf8aa0;
  background:var(--cream); color:var(--plum); min-height:100vh; margin:0; line-height:1.6;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.k * { box-sizing:border-box; }
.k .wrap { max-width:620px; margin:0 auto; padding:0 20px; }
.k .khero { background:linear-gradient(165deg,#3B2A3A,#4d3a49 70%,var(--rose)); color:#fff; padding:64px 0 76px; text-align:center; }
.k .eyebrow { letter-spacing:3px; font-size:12px; font-weight:800; color:#E0A458; text-decoration:none; }
.k h1 { font-family:Georgia,serif; font-size:clamp(32px,6vw,48px); line-height:1.1; margin:14px 0 14px; }
.k h1 em { color:#f2b872; }
.k .khero p { font-size:18px; color:#efe4ea; margin:0; }
.k .kbody { margin-top:-40px; padding-bottom:60px; }
.k .kcard { background:#fff; border:1px solid #ecdccf; border-radius:22px; padding:26px 24px; box-shadow:0 24px 50px -30px rgba(60,42,55,0.45); }
.k .kf { display:block; font-size:13px; font-weight:700; color:var(--soft); margin:0 0 14px; }
.k .kf input { width:100%; margin-top:6px; padding:13px 14px; border-radius:12px; border:1px solid #e3d3c4; background:var(--band); font-size:16px; color:var(--plum); outline:none; font-family:inherit; }
.k .kf input:focus { border-color:var(--ember); }
.k .kcheck { display:flex; gap:12px; align-items:flex-start; padding:14px; border-radius:14px; background:var(--band); border:1px solid #efe1d4; margin:0 0 10px; cursor:pointer; font-size:15.5px; }
.k .kcheck input { width:20px; height:20px; margin-top:2px; accent-color:var(--ember); flex:none; }
.k .kerr { color:#b23b3b; font-size:14px; }
.k .kbtn { width:100%; margin-top:8px; background:var(--ember); color:#fff; border:0; border-radius:999px; padding:15px; font-size:17px; font-weight:800; cursor:pointer;
  box-shadow:0 12px 26px rgba(217,140,95,0.35); transition:transform .15s ease; font-family:inherit; }
.k .kbtn:hover { transform:translateY(-2px); }
.k .kbtn:disabled { opacity:.6; }
.k .kfine { text-align:center; font-size:13px; color:var(--soft); margin-top:14px; }
`
