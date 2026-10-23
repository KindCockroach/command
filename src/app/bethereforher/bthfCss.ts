// Warm Be There For Her palette + motion, layered over the shared salesCss.
// Used by the homepage and /reset.
export const bthfCss = `
/* ── Cozy, warm palette for Be There For Her (overrides shared salesCss) ── */
.sales.bthf{ --light:#F4E9DB; --midnight:#3c2a37; --nebula:#9b6a86; --pink:#cf8aa0; --ember:#d98c5f;
  color:#463640; background:#F4E9DB; }
.bthf .hero{ background:linear-gradient(165deg,#382634 0%,#6b3f52 58%,#a86a72 100%); }
.bthf .hero h1{ color:#fdf3ea; }
.bthf .hero h1 em{ color:#f2b872; font-style:italic; font-size:1.12em; text-shadow:0 2px 20px rgba(242,166,90,.45); }
.bthf .hero .sub{ color:#f2e2d7; }
.bthf .hero .sub strong,.bthf .hero strong{ color:#fff; }
.bthf h1,.bthf h2{ color:#3c2a37; }
.bthf .band,.bthf .band.faq{ background:#FBF3EA; }
.bthf .what,.bthf .proof{ background:#F4E9DB; }
.bthf .lead{ color:#5a4a52; }
.bthf blockquote{ background:#3c2a37; border-left-color:#d98c5f; }
.bthf .product{ background:linear-gradient(160deg,#382634,#5f3a4f 68%,#a86a72); }
.bthf .product .psub,.bthf .product .ptag .arw{ color:#f0c9a3; }
.bthf .final{ background:linear-gradient(160deg,#a86a72,#d5a279); }
.bthf .final h2{ color:#402a34; }
.bthf .buy{ background:linear-gradient(135deg,#c96f7e,#d98c5f); color:#fff; box-shadow:0 10px 26px rgba(110,55,64,.32); }
.bthf .tagline{ color:#402a34; opacity:.85; }
.bthf .bumpcard{ background:#F6EBDC; border-color:#d3a488; }
.bthf .bumpsell strong{ color:#b26a52; }

.bthf .preview-label { font-size:14px; color:#f2e2d7; margin:22px 0 8px; letter-spacing:.3px; }
.bthf audio.preview { width:100%; max-width:420px; }
.bthf .medlist { list-style:none; counter-reset:med; padding:0; margin:18px 0; }
.bthf .medlist li { counter-increment:med; display:flex; flex-direction:column; gap:2px;
  padding:14px 0 14px 44px; border-top:1px solid #e7e0d3; position:relative; }
.bthf .medlist li:first-child { border-top:none; }
.bthf .medlist li::before { content:counter(med); position:absolute; left:0; top:14px;
  width:30px; height:30px; border-radius:999px; background:var(--pink); color:#fff;
  font-family:Georgia,serif; font-weight:700; display:grid; place-items:center; font-size:15px; }
.bthf .medlist .mt { font-family:Georgia,serif; font-size:19px; font-weight:700; color:var(--midnight); }
.bthf .medlist .ml { font-size:15px; color:#6a6280; }
.bthf .bonus { font-size:16px; background:#F3E4D3; border:1px solid #e6cdb6; border-radius:12px; padding:14px 16px; margin-top:18px; color:#4a3a42; }
.bthf .guarantee { font-size:15px; color:#7a6a72; font-style:italic; margin-top:18px; }
.bthf .walkhead { font-weight:700; color:var(--midnight); margin:18px 0 8px; }
.bthf .walkaway { list-style:none; padding:0; margin:0 0 8px; }
.bthf .walkaway li { position:relative; padding:8px 0 8px 28px; border-top:1px solid #e7e0d3; font-size:16px; color:#4a3a42; }
.bthf .walkaway li:first-child { border-top:none; }
.bthf .walkaway li::before { content:"\\2022"; position:absolute; left:6px; top:8px; color:var(--ember); font-weight:800; }
.bthf .sevenhead { margin-top:26px; font-weight:700; color:var(--midnight); }
.bthf .final .terms { font-size:12px; color:#5a4a52; opacity:.85; max-width:60ch; margin:16px auto 0; line-height:1.5; }

/* Opt-in (warm candlelit) */
.bthf .optin { background:linear-gradient(160deg,#4a2f44,#8a5470 66%,#cf8aa0); color:#fff; }
.bthf .optin .eyebrow2 { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--ember); margin:0 0 8px; }
.bthf .optin h2 { color:#fff; }
.bthf .optin .osub { font-size:18px; color:#f3ecf7; max-width:60ch; margin:0 0 6px; }
.bthf .optin .fo-form { display:grid; grid-template-columns:1fr auto; gap:12px; margin-top:14px; max-width:560px; align-items:start; }
.bthf .optin .fo-form input { box-sizing:border-box; padding:15px 16px; border-radius:12px;
  border:1px solid rgba(255,255,255,0.35); background:rgba(255,255,255,0.96); color:var(--midnight);
  font-size:16px; font-family:inherit; }
.bthf .optin .fo-form input:focus { outline:none; border-color:var(--ember); box-shadow:0 0 0 3px rgba(242,166,90,0.35); }
.bthf .optin .fo-form button { background:var(--ember); color:var(--midnight); font-weight:800; font-size:16px;
  border:none; cursor:pointer; padding:15px 24px; border-radius:999px; white-space:nowrap; }
.bthf .optin .fo-form button:disabled { opacity:0.7; cursor:default; }
.bthf .optin .fo-fine { grid-column:1 / -1; font-size:13px; opacity:0.85; margin:2px 0 0; color:#f3ecf7; }
.bthf .optin .fo-err { grid-column:1 / -1; color:#ffd7c2; font-size:14px; margin:0; }
.bthf .optin .fo-done { background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.4);
  border-radius:16px; padding:22px 24px; margin-top:8px; display:flex; flex-direction:column; gap:12px; max-width:560px; }
.bthf .optin .fo-done p { font-size:18px; color:#fff; margin:0; }
.bthf .optin .fo-done audio { width:100%; }
.bthf .optin .fo-dl { color:var(--ember); font-weight:800; text-decoration:none; }
@media (max-width:560px){ .bthf .optin .fo-form { grid-template-columns:1fr; } }

/* ── Float + glimmer ── */
@keyframes bthfFloat { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-6px); } }
@keyframes bthfSheen { 0%{ transform:translateX(-140%) rotate(10deg); } 55%,100%{ transform:translateX(260%) rotate(10deg); } }
@keyframes bthfGlow { 0%,100%{ opacity:.45; } 50%{ opacity:.9; } }

.bthf .buy{ position:relative; overflow:hidden; animation:bthfFloat 3.6s ease-in-out infinite;
  transition:transform .25s ease, box-shadow .25s ease; }
.bthf .buy:hover{ transform:translateY(-8px) scale(1.015); box-shadow:0 22px 46px rgba(110,55,64,.45); }
.bthf .buy::after{ content:""; position:absolute; top:-40%; left:0; width:38%; height:180%;
  background:linear-gradient(115deg, transparent, rgba(255,255,255,.55), transparent);
  transform:translateX(-140%) rotate(10deg); animation:bthfSheen 4.8s ease-in-out infinite; pointer-events:none; }

/* soft glimmer behind the dark sections */
.bthf .hero, .bthf .product, .bthf .optin, .bthf .final { position:relative; overflow:hidden; }
.bthf .hero > .wrap, .bthf .product > .wrap, .bthf .optin > .wrap, .bthf .final > .wrap { position:relative; z-index:1; }
.bthf .hero::before, .bthf .product::before, .bthf .final::before { content:""; position:absolute; z-index:0;
  width:70vw; height:70vw; top:-25%; right:-15%; pointer-events:none;
  background:radial-gradient(circle, rgba(242,184,114,.20), transparent 62%);
  animation:bthfGlow 6.5s ease-in-out infinite; }
.bthf .optin::before { content:""; position:absolute; z-index:0; width:60vw; height:60vw; bottom:-25%; left:-15%;
  pointer-events:none; background:radial-gradient(circle, rgba(255,255,255,.12), transparent 62%);
  animation:bthfGlow 7.5s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce){
  .bthf .buy, .bthf .buy::after, .bthf .hero::before, .bthf .product::before, .bthf .final::before, .bthf .optin::before { animation:none; }
}

/* ── Emphasis + quote (batch tweaks) ── */
.bthf .hero .eyebrow{ color:#f2d3a8; text-shadow:0 0 26px rgba(242,184,114,.8), 0 0 8px rgba(242,184,114,.55); }
.bthf .reframe{ font-size:14px; color:#7a6a72; }
.bthf .callout{ font-family:Georgia,serif; font-size:26px; line-height:1.42; color:var(--midnight); margin-top:8px; }
.bthf .untilnow{ margin:6px 0 18px; }
.bthf .product .pullquote{ margin:28px auto 0; max-width:52ch; background:rgba(255,255,255,.09);
  border-left:3px solid var(--ember); border-radius:12px; padding:20px 24px; font-family:Georgia,serif;
  font-style:italic; font-size:23px; line-height:1.4; color:#fdf3ea; }
.bthf .bump{ padding-top:12px; }
.bthf .bumpcard{ margin-top:24px; }
@media (max-width:560px){ .bthf .callout{ font-size:22px; } .bthf .product .pullquote{ font-size:20px; } }
`
