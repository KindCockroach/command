import { AI_MOM_INTRO, PODCAST_LINKS } from '@/lib/aiMom'

// "Who's AI Mom?" — shown after any signup so a Be There For Her subscriber knows who
// the hi@aimomeducation.com emails are from. Self-styled so it drops into any page.
export default function AiMomIntro() {
  return (
    <div className="aimi">
      <style>{css}</style>
      <p className="h">Who&rsquo;s AI Mom?</p>
      {AI_MOM_INTRO.map(p => <p key={p}>{p}</p>)}
      <p className="pod">
        <span>🎙 The AI Mom Podcast:</span>
        {PODCAST_LINKS.map(l => <a key={l.name} href={l.href} target="_blank" rel="noreferrer">{l.name}</a>)}
      </p>
    </div>
  )
}

const css = `
.aimi { background:#FBF3EC; border:1px solid #F0DCCB; border-radius:20px; padding:22px 24px; margin:22px auto; max-width:720px;
  color:#3C2A37; text-align:left; font-size:17px; line-height:1.6; }
.aimi p { margin:0 0 10px; color:#3C2A37; }
.aimi .h { font:700 22px/1.3 Georgia,serif; margin-bottom:8px; }
.aimi .pod { display:flex; flex-wrap:wrap; gap:6px 14px; align-items:center; margin:16px 0 0; padding-top:14px; border-top:1px solid #eadbcd; font-size:15px; }
.aimi .pod span { font-weight:700; }
.aimi .pod a { color:#C2703F; font-weight:800; text-decoration:none; }
.aimi .pod a:hover { text-decoration:underline; }
`
