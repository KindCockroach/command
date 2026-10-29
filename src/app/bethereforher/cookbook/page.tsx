export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel } from '@/components/funnel/shared'
import CopyEditor from '@/components/CopyEditor'
import KitchenForm from '../in-the-kitchen/KitchenForm'

// bethereforher.com/cookbook — this week's funnel, step 1: the free cookbook.
// Signup (list "funnel") → /invitation-to-reset (instant download + The Reset invite).
export const metadata: Metadata = {
  title: 'Free Cookbook: The Magic Is in the Making · Be There For Her',
  description: 'A free seasonal kitchen spellbook: soups, potions, and little-witch treats, with notes in the margin for more play, joy, and relief in your kitchen.',
  openGraph: { title: 'Your free cookbook: The Magic Is in the Making', description: 'A seasonal kitchen spellbook from Be There For Her.', images: [{ url: '/og-cookbook.png', width: 1200, height: 630 }], type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Your free cookbook: The Magic Is in the Making', description: 'A seasonal kitchen spellbook from Be There For Her.', images: ['/og-cookbook.png'] },
}

const INSIDE = [
  { t: 'The Cauldron', d: 'Three cozy soups, from Harvest Moon squash to the White Witch.' },
  { t: 'Potions & Brews', d: 'Love Potion smoothies, golden chai, belching honey, and Dragon’s Breath tonic.' },
  { t: 'Little Witches & Familiars', d: 'Monster Mash bites for the kids and Hellhound treats for the dog.' },
  { t: 'Notes in the margin', d: '“Make it magic” rituals that turn an ordinary Tuesday dinner into something you’ll remember.' },
]

export default function CookbookFunnel() {
  return (
    <main className="cf">
      <MetaPixel />
      <style>{css}</style>
      <CopyEditor />
      <section className="hero">
        <div className="wrap grid">
          <div className="copy">
            <a className="eyebrow" href="/bethereforher">BE THERE FOR HER · FREE COOKBOOK</a>
            <h1>Get this cookbook. <em>Receive your invitation to a more magical you.</em></h1>
            <p>
              Sometimes it&rsquo;s enough just to infuse the mundane moments with a candle or new music. But sometimes you need
              more than romance to feel seen, even if it&rsquo;s by yourself.
            </p>
            <p>
              <em>The Magic Is in the Making</em> has amazing, delicious, family-forward recipes, including soups, smoothies, and
              even treats for your pets, with notes in the margin that remind you that you are magical.
            </p>
            <div className="card">
              <p className="free">Subscribe now, for free.</p>
              <KitchenForm list="funnel" fixedCookbook cookbookRedirect="/bethereforher/invitation-to-reset"
                newsletterLabel="Optional: also subscribe to Be There For Her updates."
                button="Send me the cookbook →" />
              <p className="fine">
                Signing up for any newsletter is optional, and none are planned as of now. This is just the creative expression
                of one woman who&rsquo;s making the world a little brighter by reminding women of their intuitive magic. Your
                information is secure with us.
              </p>
            </div>
          </div>
          <img className="cover" src="/bethereforher/cookbook-cover.jpg" alt="The Magic Is in the Making — cookbook cover" />
        </div>
      </section>
      <section className="inside">
        <div className="wrap">
          <h2>What&rsquo;s inside</h2>
          <div className="items">
            {INSIDE.map(i => <div className="item" key={i.t}><h3>{i.t}</h3><p>{i.d}</p></div>)}
          </div>
        </div>
      </section>
    </main>
  )
}

const css = `
.cf { --cream:#F4E9DB; --band:#FBF3EA; --plum:#3c2a37; --ember:#d98c5f; --soft:#6a5a62; --copper:#D68054;
  background:var(--cream); color:var(--plum); min-height:100vh; margin:0; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.cf * { box-sizing:border-box; }
.cf .wrap { max-width:1020px; margin:0 auto; padding:0 20px; }
.cf h1,.cf h2,.cf h3 { font-family:Georgia,"Times New Roman",serif; }
.cf .hero { background:radial-gradient(700px 400px at 80% 10%, rgba(214,128,84,0.25), transparent 60%), linear-gradient(160deg,#1c1520,#2a1f2b 60%,#3b2a37); color:#f5ece0; padding:56px 0 64px; }
.cf .grid { display:grid; grid-template-columns:1.15fr .85fr; gap:44px; align-items:center; }
.cf .eyebrow { letter-spacing:3px; font-size:12px; font-weight:800; color:#E0A458; text-decoration:none; }
.cf h1 { font-size:clamp(30px,5vw,46px); line-height:1.12; margin:14px 0 16px; color:#fff; }
.cf h1 em { color:#f2b872; }
.cf .copy > p { font-size:18px; color:#dccfc2; margin:0 0 14px; }
.cf .copy > p em { color:#f2b872; }
.cf .card { margin-top:22px; }
.cf .free { font:700 20px Georgia,serif; text-align:center; margin:0 0 14px; color:var(--plum); }
.cf .cover { width:100%; max-width:360px; justify-self:center; border-radius:10px; border:1px solid rgba(214,128,84,0.6);
  box-shadow:0 30px 60px -20px rgba(0,0,0,0.7), 0 0 60px rgba(214,128,84,0.25); transform:rotate(2deg); }
.cf .card { background:#fff; color:var(--plum); border-radius:22px; padding:22px 20px; box-shadow:0 24px 50px -28px rgba(0,0,0,0.6); }
.cf .kf { display:block; font-size:13px; font-weight:700; color:var(--soft); margin:0 0 12px; }
.cf .kf input { width:100%; margin-top:6px; padding:13px 14px; border-radius:12px; border:1px solid #e3d3c4; background:var(--band); font-size:16px; color:var(--plum); outline:none; font-family:inherit; }
.cf .kf input:focus { border-color:var(--ember); }
.cf .kcheck { display:flex; gap:12px; align-items:flex-start; padding:12px 14px; border-radius:14px; background:var(--band); border:1px solid #efe1d4; margin:0 0 10px; cursor:pointer; font-size:15px; }
.cf .kcheck input { width:20px; height:20px; margin-top:2px; accent-color:var(--ember); flex:none; }
.cf .kerr { color:#b23b3b; font-size:14px; }
.cf .kbtn { width:100%; margin-top:6px; color:#221923; border:0; border-radius:999px; padding:15px; font-size:17px; font-weight:800; cursor:pointer; font-family:inherit;
  background:linear-gradient(135deg,#F7C79A,#D68054); box-shadow:0 12px 26px rgba(214,128,84,0.4); transition:transform .15s ease; }
.cf .kbtn:hover { transform:translateY(-2px); }
.cf .kbtn:disabled { opacity:.6; }
.cf .fine { text-align:center; font-size:13px; line-height:1.5; color:var(--soft); margin:12px 0 0; }
.cf .inside { padding:56px 0 70px; }
.cf .inside h2 { font-size:clamp(26px,4vw,34px); margin:0 0 20px; text-align:center; }
.cf .items { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.cf .item { background:#fff; border:1px solid #ecdccf; border-radius:18px; padding:20px; }
.cf .item h3 { margin:0 0 6px; font-size:18px; color:var(--copper); }
.cf .item p { margin:0; font-size:15px; color:var(--soft); }
@media (max-width:860px){ .cf .grid { grid-template-columns:1fr; } .cf .cover { max-width:240px; order:-1; } .cf .items { grid-template-columns:1fr 1fr; } }
@media (max-width:520px){ .cf .items { grid-template-columns:1fr; } }
`
