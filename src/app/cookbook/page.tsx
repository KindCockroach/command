export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import KitchenForm from '@/app/bethereforher/in-the-kitchen/KitchenForm'
import { wfhCss } from '@/components/wfh/theme'

// aiworksforher.com/cookbook — UNLISTED signup Mandi shares on the AI Mom Podcast only.
// Not linked from any page and kept out of search. Opt in to the AI Works For Her
// newsletter and/or the free cookbook, then on to the homepage.
export const metadata: Metadata = {
  title: 'A free cookbook for AI Mom listeners · WFH — Works For Her',
  description: 'A thank-you for listening to the AI Mom Podcast: The Magic Is in the Making, a free seasonal cookbook, plus the AI Works For Her newsletter.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Your free cookbook: The Magic Is in the Making',
    description: 'A seasonal kitchen spellbook for AI Mom listeners. Soups, potions, and familiars.',
    images: [{ url: '/og-cookbook.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Your free cookbook: The Magic Is in the Making', description: 'A seasonal kitchen spellbook for AI Mom listeners.', images: ['/og-cookbook.png'] },
}

export default function Cookbook() {
  return (
    <main className="w">
      <MetaPixel />
      <style>{wfhCss + css}</style>
      <CopyEditor />
      <header className="top">
        <div className="wrap">
          <a className="home" href="/"><img src="/wfh-logo-white.png" alt="AI WFH — Works For Her" /></a>
          <h1>Hey, AI Mom listener. <em>This one&rsquo;s for you.</em></h1>
          <p>
            You heard about it on the show, so here it is: <em>The Magic Is in the Making</em>, a free seasonal cookbook with
            notes in the margin for more play, joy, and relief in your kitchen. Want more from the podcast between episodes?
            Add the AI Works For Her newsletter too.
          </p>
        </div>
      </header>
      <section className="wrap body">
        <div className="panel k">
          <KitchenForm list="podcast" redirect="/welcome?from=wfh"
            cookbookLabel="Send me the free cookbook, The Magic Is in the Making."
            newsletterLabel="Subscribe to the AI Works For Her newsletter: new AI Mom episodes, AI tools worth your time, and updates from Mandi."
            button="Send it to me →" />
        </div>
        <p className="fine">We&rsquo;ll only send what you check. Unsubscribe anytime.</p>
      </section>
    </main>
  )
}

const css = `
.w .body { margin-top:-28px; position:relative; max-width:620px; padding-bottom:60px; }
.w .top p em { color:#fff; }
.w .fine { text-align:center; font-size:13px; color:var(--muted); margin-top:14px; }
.w .k .kf { display:block; font-size:13px; font-weight:700; color:var(--muted); margin:0 0 14px; }
.w .k .kf input { width:100%; margin-top:6px; padding:13px 14px; border-radius:12px; border:1px solid #ddd5c6; background:var(--cream); font-size:16px; color:var(--midnight); outline:none; font-family:inherit; }
.w .k .kf input:focus { border-color:var(--nebula); }
.w .k .kcheck { display:flex; gap:12px; align-items:flex-start; padding:14px; border-radius:14px; background:var(--cream); border:1px solid #ebe3d6; margin:0 0 10px; cursor:pointer; font-size:15.5px; }
.w .k .kcheck input { width:20px; height:20px; margin-top:2px; accent-color:var(--nebula); flex:none; }
.w .k .kerr { color:#b23b3b; font-size:14px; }
.w .k .kbtn { width:100%; margin-top:8px; background:var(--nebula); color:#fff; border:0; border-radius:999px; padding:15px; font-size:17px; font-weight:800; cursor:pointer;
  box-shadow:0 12px 26px rgba(90,79,207,0.35); transition:transform .15s ease; font-family:inherit; }
.w .k .kbtn:hover { transform:translateY(-2px); }
.w .k .kbtn:disabled { opacity:.6; }
`
