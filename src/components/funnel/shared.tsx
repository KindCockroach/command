// Shared building blocks for the audience sales/welcome pages.
// Server-safe (no client hooks) so pages can stay server components.

// Meta Pixel — set NEXT_PUBLIC_META_PIXEL_ID in Railway to turn on ad tracking.
// Fires PageView on load and InitiateCheckout when a `.buy` link is clicked.
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

export function MetaPixel() {
  if (!META_PIXEL) return null
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL}');fbq('track','PageView');
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.buy');if(a){fbq('track','InitiateCheckout',{value:27,currency:'USD'});}});
` }} />
      <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL}&ev=PageView&noscript=1`} /></noscript>
    </>
  )
}

// Fires on the post-purchase welcome page (the GHL checkout's redirect target),
// so a completed sale reports a Purchase to Meta — GHL payment links have no pixel
// field, so this is how purchases track. Session-guarded against refresh double-counts.
export function PurchasePixel({ value = 27 }: { value?: number }) {
  if (!META_PIXEL) return null
  return (
    <script dangerouslySetInnerHTML={{ __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL}');fbq('track','PageView');
try{if(!sessionStorage.getItem('cw_purch')){fbq('track','Purchase',{value:${value},currency:'USD'});sessionStorage.setItem('cw_purch','1');}}catch(e){fbq('track','Purchase',{value:${value},currency:'USD'});}
` }} />
  )
}

export function BuyButton({ href, label, tagline }: { href: string; label: string; tagline?: string }) {
  return (
    <div className="cta">
      <a className="buy" href={href}>{label}</a>
      {tagline && <p className="tagline">{tagline}</p>}
    </div>
  )
}

// Order bumps — identical offer across every audience, added on the single
// checkout. Copy mirrors the two GHL payment links (The Reset $33, The Cheat Code $55).
export function OrderBumps() {
  return (
    <section className="bump">
      <div className="wrap">
        <div className="bumpcard">
          <p className="bumpsell">Get <strong>The Reset</strong> session and your <strong>Cheat Code</strong> when you check out.</p>
          <p className="bumpsmall">Two live sessions with me, added right on the checkout page &mdash; The Reset ($33) to breathe before you write, The Cheat Code to onboard your new writing assistant.</p>
        </div>
      </div>
    </section>
  )
}

// The universal "what it is / what you get" — identical on every sales page
// (marketing varies up top; the product truth is shared here). Leads with the
// Caption Writer product promise: raw life in → ready-to-post captions out.
export function ProductBlock() {
  return (
    <section className="product">
      <div className="wrap">
        <p className="ptag">Raw life in <span className="arw">→</span> ready-to-post captions out</p>
        <p className="psub">Your voice · Your story · AI-supported</p>
        <p>Caption Writer turns your messy story into a valuable, cohesive message. Notes, thoughts,
          and free-writes become finished, ready-to-post content cards &mdash; headline, caption, and
          hashtags. It even drafts captions from the photo(s) you give it, and suggests image prompts
          and video ideas to match your story.</p>
        <p className="pget">What you get:</p>
        <ul>
          <li>A <strong>Custom GPT</strong> that runs right inside your own ChatGPT and learns your voice by prompting you.</li>
          <li>A duplicate-able <strong>Notion workspace</strong> to track and process the posts that need a little more from your brain.</li>
        </ul>
        <p className="exhale">Exhale and enjoy the rest of your day &mdash; when your caption edits turn from hours into minutes.</p>
        <ul className="checks">
          <li>✓ Under-10-minute setup</li>
          <li>✓ Includes a walk-through</li>
          <li>✓ Runs on ChatGPT &amp; Notion.com (free)</li>
        </ul>
      </div>
    </section>
  )
}

// Shared sales-page CSS. Pages render <main className="sales"> and inject this once.
export const salesCss = `
.sales { --midnight:#171C3A; --nebula:#5A4FCF; --pink:#D98AB7; --ember:#F2A65A; --light:#F5EFE6;
  background:var(--light); color:var(--midnight); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  line-height:1.6; margin:0; }
.sales .wrap { max-width:760px; margin:0 auto; padding:0 24px; }
.sales h1,.sales h2,.sales blockquote { font-family:Georgia,"Times New Roman",serif; }
.sales h1 { font-size:clamp(28px,5vw,44px); line-height:1.15; letter-spacing:-0.5px; margin:0 0 20px; }
.sales h2 { font-size:clamp(24px,4vw,34px); line-height:1.2; margin:0 0 18px; }
.sales section { padding:56px 0; }
.sales .hero { background:linear-gradient(160deg,var(--midnight),#25204d 70%,var(--nebula)); color:var(--light); padding:80px 0 72px; }
.sales .hero h1 { color:#fff; }
.sales .eyebrow { letter-spacing:3px; font-size:13px; font-weight:700; color:var(--ember); margin:0 0 18px; }
.sales .sub { font-size:19px; color:#e7e2f2; }
.sales .sub strong,.sales .hero strong { color:#fff; }
.sales .band { background:#fff; }
.sales em { font-style:italic; color:var(--nebula); }
.sales .reframe { font-size:22px; font-family:Georgia,serif; margin-top:22px; }
.sales .lead { font-size:19px; }
.sales blockquote { background:var(--midnight); color:#fff; font-size:24px; margin:24px 0; padding:22px 26px; border-radius:14px; border-left:6px solid var(--ember); }
.sales blockquote em { color:var(--ember); }
.sales .cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:24px 0; }
.sales .card { padding:20px; border-radius:14px; }
.sales .card.compose { background:#eef3ec; border:1px solid #cfe0c8; }
.sales .card.park { background:#f6edf3; border:1px solid #e6cfe0; }
.sales .card p { margin:10px 0 0; }
.sales .pill { display:inline-block; font-weight:700; font-size:15px; }
.sales .get-list { padding-left:22px; font-size:18px; }
.sales .get-list li { margin:12px 0; }
.sales .who { margin-top:20px; }
.sales dl dt { font-weight:700; font-size:18px; margin-top:20px; }
.sales dl dd { margin:6px 0 0; }
.sales .proof { background:var(--light); }
.sales .final { background:linear-gradient(160deg,var(--nebula),var(--pink)); color:#fff; text-align:center; }
.sales .final h2 { color:#fff; }
.sales .cta { margin:28px 0; text-align:center; }
.sales .buy { display:inline-block; background:var(--ember); color:var(--midnight); font-weight:800;
  font-size:20px; letter-spacing:0.3px; text-decoration:none; padding:18px 40px; border-radius:999px;
  box-shadow:0 10px 30px rgba(242,166,90,0.4); transition:transform .12s ease; }
.sales .buy:hover { transform:translateY(-2px); }
.sales .tagline { font-size:14px; opacity:0.85; margin:12px 0 0; }
.sales .midcta { padding:34px 0; text-align:center; }
.sales .midcta .cta { margin:0; }
.sales .bump { background:#fff; padding-top:0; }
.sales .bumpcard { border:2px dashed var(--nebula); border-radius:16px; padding:24px 26px; background:#f4f2fb; }
.sales .bumptag { font-size:12px; font-weight:800; letter-spacing:1.5px; color:var(--nebula); margin:0 0 8px; }
.sales .bumpcard h3 { font-family:Georgia,serif; font-size:24px; margin:0 0 10px; }
.sales .bumpcard h3 em { color:var(--nebula); font-style:italic; }
.sales .bumpsmall { font-size:14px; color:#6a6280; margin-top:12px; }
.sales .bumpsintro { font-weight:700; font-size:16px; margin:0 0 14px; }
.sales .bumpcard + .bumpcard { margin-top:16px; }
.sales .bumpsell { font-family:Georgia,serif; font-size:21px; margin:0; }
.sales .bumpsell strong { color:var(--nebula); }
.sales .product { background:var(--midnight); color:#fff; }
.sales .product .ptag { font-family:Georgia,serif; font-size:clamp(24px,4.2vw,36px); line-height:1.15; color:#fff; margin:0 0 8px; }
.sales .product .ptag .arw { color:var(--ember); }
.sales .product .psub { letter-spacing:1.5px; font-size:13px; font-weight:800; color:var(--ember); text-transform:uppercase; margin:0 0 24px; }
.sales .product p { color:#e7e2f2; font-size:18px; }
.sales .product strong { color:#fff; }
.sales .product .pget { font-weight:800; color:#fff; margin:24px 0 6px; font-size:17px; letter-spacing:0.3px; }
.sales .product ul { padding-left:20px; }
.sales .product li { color:#e7e2f2; font-size:17px; margin:9px 0; }
.sales .product .exhale { font-family:Georgia,serif; font-style:italic; color:var(--pink); font-size:20px; margin-top:22px; }
.sales .product .checks { list-style:none; padding:0; display:flex; flex-wrap:wrap; gap:8px 24px; margin-top:20px; }
.sales .product .checks li { color:#fff; font-weight:600; font-size:15px; margin:0; }
@media (max-width:560px){ .sales .cards { grid-template-columns:1fr; } }
`
