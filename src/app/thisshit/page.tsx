export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Works For This Shit',
  description: 'Every account, two doors, one robot doing the work.',
  robots: { index: false, follow: false },
}

type Acct = { h: string; type: 'personal' | 'faceless'; home?: boolean; note: string; parked?: boolean }
type Door = { emoji: string; name: string; tag: string; price: string; accts: Acct[] }

const DOORS: Door[] = [
  {
    emoji: '🤍',
    name: 'Be There For Her',
    tag: 'heal with me',
    price: '$9',
    accts: [
      { h: '@mandijoybeck', type: 'personal', home: true, note: 'life coaching + inner-child healing' },
      { h: '@empoweredsupermom', type: 'personal', note: 'nervous system · calm moms' },
      { h: '@youradhdnature', type: 'faceless', note: 'ADHD women · presence' },
      { h: '@theadder.alleffect', type: 'faceless', note: 'ADHD mindset + systems' },
      { h: '@youradhdhusband', type: 'faceless', note: 'wives of ADHD men · relief' },
      { h: '@philosophicalmom', type: 'personal', note: 'stoicism + motherhood' },
      { h: '@art4thefeminine', type: 'faceless', note: 'feminine power · rage → art' },
      { h: '@homeschool4humans', type: 'personal', note: 'presence · family · freedom' },
      { h: '@dear_queenie', type: 'faceless', note: 'coming-of-age · love & purpose' },
      { h: '@her.risejournal', type: 'faceless', note: 'the journal that talks back' },
      { h: '@gettriggered', type: 'faceless', note: 'triggers → healing', parked: true },
    ],
  },
  {
    emoji: '✍️',
    name: 'Caption Writer',
    tag: 'create with me',
    price: '$27',
    accts: [
      { h: '@onetangledmind', type: 'faceless', home: true, note: 'Caption Writer HQ' },
      { h: '@content4queens', type: 'faceless', note: 'content systems · women who sell' },
      { h: '@aimompodcast', type: 'personal', note: 'AI + jobs · the podcast' },
      { h: '@aimom888', type: 'faceless', note: 'AI for total beginners' },
      { h: '@airevealsus', type: 'faceless', note: 'what AI reveals about us' },
      { h: '@survivethedome', type: 'faceless', note: 'preparedness', parked: true },
    ],
  },
]

const HUB: Acct = { h: '@mandij0y', type: 'personal', note: 'YOU · the human · build-in-public + the parodies' }

export default function ThisShit() {
  return (
    <main className="ts">
      <style>{css}</style>
      <div className="wrap">
        <header className="top">
          <p className="eyebrow">THE WHOLE OPERATION · ON ONE PAGE</p>
          <h1>AI Works For This Shit<span className="tm">™</span></h1>
          <p className="sub">Every account you have. Two doors they all lead to. One robot doing the work
            while you record meditations in a closet under a blanket.</p>
        </header>

        <div className="engine">
          <span className="chip-rise">🔥 RISE</span>
          <span className="ework">writes it · renders your voice · schedules it</span>
        </div>
        <div className="stem" aria-hidden="true"></div>

        <div className="hub">
          <span className="hub-h">{HUB.h}</span>
          <span className="hub-note">{HUB.note}</span>
          <span className="badge personal">👤 personal</span>
        </div>
        <p className="split-label">…and every account below is just a hallway to one of these two doors ↓</p>

        <div className="doors">
          {DOORS.map((d) => (
            <section className="door" key={d.name}>
              <div className="door-head">
                <span className="d-emoji">{d.emoji}</span>
                <div>
                  <h2>{d.name}</h2>
                  <p className="d-tag">{d.tag} <span className="d-price">{d.price}</span></p>
                </div>
              </div>
              <ul className="accts">
                {d.accts.map((a) => (
                  <li className={`acct${a.home ? ' home' : ''}${a.parked ? ' parked' : ''}`} key={a.h}>
                    <div className="a-top">
                      <span className="a-h">{a.h}</span>
                      {a.home && <span className="star">HOME</span>}
                      <span className={`badge ${a.type}`}>{a.type === 'personal' ? '👤' : '🎭'} {a.type}</span>
                    </div>
                    <span className="a-note">{a.note}{a.parked ? ' · parked' : ''}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="legend">
          <span><b>👤 personal</b> — you, your voice, your face</span>
          <span><b>🎭 faceless</b> — a brand or persona, no face</span>
          <span><b>HOME</b> — where the product actually lives</span>
        </div>

        <footer className="foot">
          <p>That&rsquo;s the empire. Two products, one engine, and roughly eighteen hallways &mdash; and I still
            only remember the password to one of them. <span className="wink">Tell me to flip any personal/faceless
            tag and I&rsquo;ll update the map.</span></p>
        </footer>
      </div>
    </main>
  )
}

const css = `
.ts{ --bg:#241820; --card:#31212b; --card2:#3a2733; --cream:#F4E9DB; --ink:#f3e6ec; --muted:#c3aeb9;
  --rose:#e79aa4; --clay:#e7a45a; --plum:#c99ab0; --line:#452f3c; --gold:#e0c07a;
  background:radial-gradient(120% 80% at 50% -10%, #3a2431 0%, var(--bg) 60%); color:var(--ink); min-height:100vh; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.5; }
.ts .wrap{ max-width:1000px; margin:0 auto; padding:44px 20px 80px; }
.ts .top{ text-align:center; }
.ts .eyebrow{ letter-spacing:.22em; font-size:11px; font-weight:800; color:var(--clay); margin:0 0 12px; }
.ts h1{ font-family:Georgia,"Times New Roman",serif; font-size:clamp(34px,7vw,62px); line-height:1.02; margin:0; color:#fff; letter-spacing:-.5px; }
.ts h1 .tm{ font-size:.32em; vertical-align:super; color:var(--clay); }
.ts .sub{ font-size:clamp(15px,2.2vw,18px); color:var(--muted); max-width:60ch; margin:16px auto 0; }

.ts .engine{ display:flex; align-items:center; justify-content:center; gap:12px; margin-top:34px; flex-wrap:wrap; }
.ts .chip-rise{ font-weight:800; font-size:18px; letter-spacing:.04em; color:#241820;
  background:linear-gradient(135deg,var(--clay),var(--rose)); padding:10px 22px; border-radius:999px; box-shadow:0 8px 24px rgba(231,164,90,.3); }
.ts .ework{ font-size:13px; color:var(--muted); font-style:italic; }
.ts .stem{ width:2px; height:26px; background:linear-gradient(var(--clay),transparent); margin:6px auto 0; }

.ts .hub{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px 20px; max-width:440px; margin:0 auto;
  display:flex; flex-direction:column; align-items:center; gap:5px; box-shadow:0 12px 30px rgba(0,0,0,.3); }
.ts .hub-h{ font-family:Georgia,serif; font-size:22px; font-weight:700; color:#fff; }
.ts .hub-note{ font-size:13px; color:var(--muted); text-align:center; }
.ts .split-label{ text-align:center; color:var(--plum); font-size:14px; margin:18px 0 22px; font-style:italic; }

.ts .doors{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.ts .door{ background:var(--cream); color:#3c2a37; border-radius:20px; padding:22px; box-shadow:0 16px 40px rgba(0,0,0,.28); }
.ts .door-head{ display:flex; align-items:center; gap:14px; border-bottom:2px solid #e6d6c4; padding-bottom:14px; margin-bottom:14px; }
.ts .d-emoji{ font-size:34px; }
.ts .door h2{ font-family:Georgia,serif; font-size:clamp(22px,3.4vw,28px); margin:0; color:#3c2a37; }
.ts .d-tag{ margin:2px 0 0; font-size:14px; color:#7a6a72; }
.ts .d-price{ font-weight:800; color:#c96f7e; margin-left:6px; }
.ts .accts{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
.ts .acct{ background:#fff; border:1px solid #ecdfce; border-radius:13px; padding:11px 14px; display:flex; flex-direction:column; gap:3px; }
.ts .acct.home{ border-color:#d98c5f; box-shadow:0 0 0 2px rgba(217,140,95,.22); background:#fffaf3; }
.ts .acct.parked{ opacity:.55; }
.ts .a-top{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.ts .a-h{ font-weight:800; font-size:15px; color:#3c2a37; }
.ts .star{ font-size:9px; font-weight:900; letter-spacing:.1em; color:#fff; background:#d98c5f; padding:2px 6px; border-radius:5px; }
.ts .a-note{ font-size:12.5px; color:#7a6a72; }
.ts .badge{ font-size:10.5px; font-weight:800; letter-spacing:.03em; padding:2px 8px; border-radius:999px; margin-left:auto; white-space:nowrap; }
.ts .badge.personal{ background:#f6e3ea; color:#a5507a; }
.ts .badge.faceless{ background:#e9e2f3; color:#6b5aa0; }

.ts .legend{ display:flex; gap:22px; flex-wrap:wrap; justify-content:center; margin-top:26px; font-size:13px; color:var(--muted); }
.ts .legend b{ color:var(--ink); }
.ts .foot{ margin-top:30px; text-align:center; color:var(--muted); font-size:14px; }
.ts .foot .wink{ display:block; margin-top:8px; color:var(--plum); font-size:13px; }

@media (max-width:680px){ .ts .doors{ grid-template-columns:1fr; } .ts .hub{ margin-inline:0; } }
`
