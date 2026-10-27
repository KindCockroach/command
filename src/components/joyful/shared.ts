// Shared by /welcome and /joyful: the two Joyful Media brands and the page styles.
export const BRANDS = {
  btfh: {
    key: 'btfh', name: 'Be There For Her', href: 'https://www.bethereforher.com', img: '/bethereforher/emblem.png', cta: 'Visit bethereforher.com',
    line: 'Mindful products that bring women back to themselves: guided meditations recorded by Mandi in her studio, The Reset on Sunday nights, and seasonal cookbooks with notes in the margin.',
  },
  wfh: {
    key: 'wfh', name: 'AI Works For Her', href: 'https://www.aiworksforher.com', img: '/wfh-logo-white.png', cta: 'Visit aiworksforher.com',
    line: 'Home of the AI Mom Podcast, with AI integration for small businesses, UGC, speaking, and RETIRE. All about helping women use AI without being used by it.',
  },
} as const

export const joyfulCss = `
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
.jw .join { padding-bottom:20px; }
.jw .jcard { max-width:620px; margin:0 auto; background:#fff; border:1px solid #e7e0d3; border-radius:22px; padding:26px 24px; box-shadow:0 24px 50px -32px rgba(23,28,58,0.45); }
.jw .jlead { margin:0 0 18px; font:600 19px/1.45 Georgia,serif; color:var(--ink); text-align:center; }
.jw .jform label { display:block; font-size:13px; font-weight:700; color:#6b6585; margin:0 0 12px; }
.jw .jform label span { font-weight:500; color:#9a93b0; }
.jw .jform input { width:100%; margin-top:5px; padding:12px 14px; border-radius:12px; border:1px solid #ddd5c6; background:var(--cream); font-size:16px; color:var(--ink); outline:none; font-family:inherit; }
.jw .jform input:focus { border-color:#5A4FCF; }
.jw .jrow { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.jw .jform button { width:100%; margin-top:6px; background:#5A4FCF; color:#fff; border:0; border-radius:999px; padding:14px; font-size:17px; font-weight:800; cursor:pointer;
  box-shadow:0 12px 26px rgba(90,79,207,0.35); transition:transform .15s ease; font-family:inherit; }
.jw .jform button:hover { transform:translateY(-2px); }
.jw .jform button:disabled { opacity:.6; }
.jw .jerr { color:#b23b3b; font-size:14px; }
.jw .jdone { text-align:center; font:600 20px Georgia,serif; color:#5A4FCF; margin:6px 0; }
@media (max-width:520px){ .jw .jrow { grid-template-columns:1fr; gap:0; } }
.jw .foot { text-align:center; padding:28px 20px 44px; color:#7b7290; font-size:14px; letter-spacing:.5px; }
.jw .foot strong { color:var(--ink); }
@media (max-width:700px){ .jw .grid { grid-template-columns:1fr; } }
`
