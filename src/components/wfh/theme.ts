// Shared look for the WFH funnel pages (/assessment, /ugc, /meet) — same palette as
// the aiworksforher.com homepage. Scoped under .w so it never leaks into RISE.
export const wfhCss = `
.w { --midnight:#171C3A; --nebula:#5A4FCF; --copper:#C2693F; --ember:#F2A65A; --cream:#FBF7F1; --line:#e7e0d3; --muted:#4a4560;
  background:var(--cream); color:var(--midnight); line-height:1.6; margin:0; min-height:100vh;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
.w * { box-sizing:border-box; }
.w .wrap { max-width:880px; margin:0 auto; padding:0 20px; }
.w h1,.w h2,.w h3 { font-family:Georgia,"Times New Roman",serif; letter-spacing:-0.3px; }
.w em { font-style:italic; }
.w .top { background:linear-gradient(165deg,var(--midnight),#241f49 62%,var(--nebula)); color:var(--cream); padding:44px 0 52px; }
.w .top .home { color:var(--ember); font-weight:800; font-size:12px; letter-spacing:2.5px; text-decoration:none; }
.w .top h1 { font-size:clamp(28px,5vw,44px); line-height:1.12; margin:16px 0 12px; color:#fff; }
.w .top h1 em { color:var(--ember); }
.w .top p { font-size:18px; color:#e7e2f2; max-width:640px; margin:0; }
.w .tag { letter-spacing:2.5px; font-size:12px; font-weight:800; color:var(--copper); margin:0 0 10px; }
.w .panel { background:#fff; border:1px solid var(--line); border-radius:20px; padding:26px 24px; box-shadow:0 18px 50px -34px rgba(23,28,58,0.35); }
.w .btn { display:inline-block; background:var(--nebula); color:#fff; font-weight:800; font-size:16px; border:0; cursor:pointer;
  text-decoration:none; padding:14px 26px; border-radius:999px; box-shadow:0 10px 26px rgba(90,79,207,0.3); font-family:inherit; }
.w .btn:disabled { opacity:.45; cursor:default; box-shadow:none; }
.w .btn.ghost { background:transparent; color:var(--nebula); box-shadow:none; border:1.5px solid var(--nebula); }
.w .link { background:none; border:0; color:var(--nebula); font-weight:700; cursor:pointer; padding:0; font-size:15px; font-family:inherit; text-decoration:none; }
.w label.f { display:block; font-size:13px; font-weight:700; color:var(--muted); margin:0 0 14px; }
.w .in { width:100%; margin-top:6px; padding:12px 14px; border-radius:12px; border:1px solid #ddd5c6; background:var(--cream);
  color:var(--midnight); font-size:16px; font-family:inherit; outline:none; }
.w .in:focus { border-color:var(--nebula); }
.w .err { color:#C0392B; font-size:14px; margin:0 0 12px; }
.w .foot { text-align:center; padding:40px 0; font-size:13px; color:#8782a0; }
.w .foot a { color:#6b6585; font-weight:700; text-decoration:none; margin:0 8px; }
@media (max-width:620px){ .w .panel { padding:22px 18px; } }
`
