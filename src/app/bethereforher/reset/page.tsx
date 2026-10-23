export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { MetaPixel, BuyButton, salesCss } from '@/components/funnel/shared'
import { upcomingReset, RESET_TZ } from '@/lib/resetSession'
import { bthfCss } from '../bthfCss'

// bethereforher.com/reset — the live Reset. Middleware rewrites the bethereforher.com
// host's /reset here. The date, time, price, label and checkout link come from
// /bethereforher/reset/edit (private), so the page updates weekly without a redeploy.

const DESC =
  'One live hour to listen, reset, and set down everything that was never yours to carry. With Mandi, in her real voice. $33.'

export const metadata: Metadata = {
  title: 'The Reset — Put It Down. It Was Never Yours.',
  description: DESC,
  openGraph: { title: 'The Reset — live with Mandi', description: DESC, type: 'website', siteName: 'Be There For Her' },
  twitter: { card: 'summary_large_image', title: 'The Reset — live with Mandi', description: DESC },
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function prettyTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const h12 = ((h + 11) % 12) + 1
  return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`
}

// A hand-drawn loop, a little past closed — like a pen circling the date on a wall calendar.
const CIRCLE_PATH =
  'M92 20 C74 4 30 6 13 32 C0 54 18 88 58 91 C98 94 118 66 109 38 C102 18 80 9 54 12'

function Calendar({ date }: { date: string }) {
  const [y, m, d] = date.split('-').map(Number)
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7) cells.push(null)

  return (
    <div className="cal" role="img" aria-label={`${MONTHS[m - 1]} ${y} calendar with the ${d}th circled`}>
      <div className="cal-head">
        <span className="cal-month">{MONTHS[m - 1]}</span>
        <span className="cal-year">{y}</span>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => <div key={w} className="cal-dow">{w}</div>)}
        {cells.map((n, i) =>
          n === d ? (
            <div key={i} className="cal-day is-it">
              <span className="num">{n}</span>
              <svg className="ring" viewBox="0 0 120 100" preserveAspectRatio="none" aria-hidden="true">
                <path d={CIRCLE_PATH} pathLength={1} />
              </svg>
              <span className="tag">RESET</span>
            </div>
          ) : (
            <div key={i} className={`cal-day${n ? '' : ' empty'}${n && n < d ? ' past' : ''}`}>
              {n && <span className="num">{n}</span>}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default function ResetPage() {
  const s = upcomingReset()
  const [y, m, d] = s.date.split('-').map(Number)
  const dow = WEEKDAYS_FULL[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  const time = prettyTime(s.time)
  const price = `$${s.price}`
  const when = `${dow}, ${MONTHS[m - 1]} ${d}`

  return (
    <main className="sales bthf rst">
      <MetaPixel />
      <style>{salesCss}</style>
      <style>{bthfCss}</style>
      <style>{css}</style>

      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">{s.display_label.toUpperCase()} · LIVE WITH MANDI</p>
          <h1>Put it down.<br /><em>It was never yours.</em></h1>
          <p className="sub">
            You&rsquo;ve been carrying everyone&rsquo;s moods, everyone&rsquo;s schedules, everyone&rsquo;s
            &ldquo;quick question&rdquo; &mdash; and calling it love. One hour. Live. You&rsquo;re going to sit
            down, put your headphones in, and set down every single thing that doesn&rsquo;t belong to you.
          </p>
          <p className="sub"><strong>Then you&rsquo;re going to walk out knowing exactly what you left behind.</strong></p>
          <BuyButton href={s.checkout_url} label={`Save my seat — ${price}`} tagline={`${when} · ${time} Central · 60 minutes`} />
        </div>
      </section>

      <section className="calsec">
        <div className="calwrap">
          <h2>Put this on your calendar. <span>Now.</span></h2>
          <Calendar date={s.date} />
          <p className="when"><strong>{when}</strong> &nbsp;·&nbsp; {time} Central &nbsp;·&nbsp; 60 minutes &nbsp;·&nbsp; Live</p>
          <p className="localtime" data-starts={s.starts_at} data-tz={RESET_TZ} />
          <p className="whensub">The kids are in bed. The dishes can wait. This hour is already taken &mdash; by you.</p>
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>You know exactly what I mean.</h2>
          <ul className="walkaway">
            <li>You can read everyone&rsquo;s mood in the room before you can name your own.</li>
            <li>You&rsquo;re holding the pickup schedule, the group chat, and a fight that wasn&rsquo;t even yours.</li>
            <li>You said &ldquo;I&rsquo;m fine&rdquo; so many times today you almost believed it.</li>
            <li>You lie down at night and your body is still holding up the whole house.</li>
            <li>You can&rsquo;t tell anymore which worries are yours and which ones you picked up on the way.</li>
          </ul>
          <p className="callout">That&rsquo;s not who you are. That&rsquo;s what you&rsquo;re holding. And you&rsquo;re going to put it down.</p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Here&rsquo;s what the hour holds.</h2>
          <ol className="steps">
            <li><span className="st">Listen.</span><span className="sl">You don&rsquo;t talk. You don&rsquo;t perform. You
              don&rsquo;t show your face. You listen &mdash; my voice, live, walking you back into your own body.</span></li>
            <li><span className="st">Reset.</span><span className="sl">We sort it. What&rsquo;s yours stays. What isn&rsquo;t
              goes back where it came from &mdash; not with a fight. With a breath.</span></li>
            <li><span className="st">Leave confident.</span><span className="sl">You walk out clear on exactly what you set
              down, and certain it&rsquo;s not coming home with you.</span></li>
          </ol>
        </div>
      </section>

      <section className="orders">
        <div className="wrap">
          <p className="eyebrow2">YOUR INSTRUCTIONS</p>
          <h2>Don&rsquo;t think about it. Do this.</h2>
          <ol className="steps light">
            <li><span className="st">Take the seat.</span><span className="sl">{price}. Don&rsquo;t negotiate with yourself.
              You&rsquo;ve spent more on things you didn&rsquo;t want.</span></li>
            <li><span className="st">Block the hour.</span><span className="sl">{dow}, {time}. Tell them you&rsquo;re
              unavailable. Say it like you mean it &mdash; because you do.</span></li>
            <li><span className="st">Show up.</span><span className="sl">Headphones in five minutes early. Camera off if
              you want. Tired, cranky, half-there &mdash; come anyway. That&rsquo;s exactly who this is for.</span></li>
          </ol>
          <BuyButton href={s.checkout_url} label={`I'm taking the hour — ${price}`} />
        </div>
      </section>

      <section className="what">
        <div className="wrap">
          <h2>This isn&rsquo;t for the woman who has it all handled.</h2>
          <p className="callout">It&rsquo;s for the one who&rsquo;s handling all of it.</p>
          <p>You don&rsquo;t need another thing to be good at. You don&rsquo;t need to meditate &ldquo;right.&rdquo;
            You need one hour where nobody needs anything from you &mdash; and someone telling you, out loud, that
            you&rsquo;re allowed to put it down.</p>
          <p><strong>I&rsquo;m telling you. Put it down.</strong></p>
        </div>
      </section>

      <section className="band faq">
        <div className="wrap">
          <h2>Questions</h2>
          <dl>
            <dt>Do I have to talk or be on camera?</dt>
            <dd>No. Camera off, mic off, headphones on. You listen. That&rsquo;s the whole job.</dd>
            <dt>I&rsquo;ve never made it through a meditation.</dt>
            <dd>Perfect. This isn&rsquo;t that. You don&rsquo;t have to empty your mind or sit still. You just
              have to show up.</dd>
            <dt>How do I join?</dt>
            <dd>Your link to the live session arrives by email right after checkout. Keep it. Put it in the
              calendar invite you&rsquo;re about to make.</dd>
            <dt>What time is that for me?</dt>
            <dd>{time} Central Time on {when}.<span className="localtime inline" data-starts={s.starts_at} data-tz={RESET_TZ} /></dd>
          </dl>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>You&rsquo;ve been there for everyone.<br />{dow} at {time.replace(':00', '')}, be there for her.</h2>
          <BuyButton href={s.checkout_url} label={`Save my seat — ${price}`} tagline={`${s.display_label} · ${when} · ${time} Central`} />
          <p className="terms">Live online session. Not a licensed therapist; this isn&rsquo;t therapy or medical
            advice. Please use alongside professional care, not in place of it.</p>
        </div>
      </section>

      {/* Show the visitor's own time when they're outside Central. */}
      <script dangerouslySetInnerHTML={{ __html: `
(function(){try{
  var tz=Intl.DateTimeFormat().resolvedOptions().timeZone; if(!tz||tz==='${RESET_TZ}')return;
  document.querySelectorAll('.localtime').forEach(function(el){
    var d=new Date(el.getAttribute('data-starts'));
    var t=d.toLocaleString(undefined,{weekday:'long',hour:'numeric',minute:'2-digit'});
    el.textContent=(el.classList.contains('inline')?' ':'')+'That\\u2019s '+t+' where you are.';
  });
}catch(e){}})();
` }} />
    </main>
  )
}

const css = `
/* ── Hero emphasis ── */
.rst .hero h1 em{ display:inline-block; margin-top:4px; }
.rst .hero .sub + .sub{ margin-top:-4px; }
.rst .hero .tagline{ color:#f2e2d7; opacity:.9; }

/* ── Page-width calendar ── */
.rst .calsec{ background:#FBF3EA; padding:64px 0 56px; }
.rst .calwrap{ width:100%; max-width:1180px; margin:0 auto; padding:0 16px; box-sizing:border-box; text-align:center; }
.rst .calsec h2{ font-size:clamp(28px,5vw,46px); margin:0 0 28px; }
.rst .calsec h2 span{ color:#b2566a; font-style:italic; }
.rst .cal{ background:#fffaf4; border:1px solid #e6cdb6; border-radius:22px;
  box-shadow:0 24px 60px rgba(60,42,55,.16); text-align:left; }
.rst .cal-head{ border-radius:21px 21px 0 0; display:flex; justify-content:space-between; align-items:baseline;
  background:linear-gradient(165deg,#382634,#6b3f52 60%,#a86a72); color:#fdf3ea;
  padding:clamp(16px,3vw,30px) clamp(18px,4vw,40px); }
.rst .cal-month{ font-family:Georgia,serif; font-size:clamp(34px,7vw,72px); line-height:1; letter-spacing:-1px; }
.rst .cal-year{ font-family:Georgia,serif; font-size:clamp(18px,3vw,30px); opacity:.75; }
.rst .cal-grid{ display:grid; grid-template-columns:repeat(7,1fr); }
.rst .cal-dow{ font-size:clamp(10px,1.6vw,14px); font-weight:800; letter-spacing:2px; text-transform:uppercase;
  color:#8a6f78; text-align:center; padding:12px 0; border-bottom:1px solid #eadccd; }
.rst .cal-day{ position:relative; aspect-ratio:1 / .82; border-right:1px solid #f0e4d6; border-bottom:1px solid #f0e4d6;
  padding:clamp(4px,1vw,12px); box-sizing:border-box; }
.rst .cal-day:nth-child(7n){ border-right:none; }
.rst .cal-day .num{ font-family:Georgia,serif; font-size:clamp(13px,2.4vw,26px); color:#5a4a52; }
.rst .cal-day.past .num{ color:#c3b2b6; }
.rst .cal-day.empty{ background:transparent; }
.rst .cal-grid > .cal-day:nth-last-child(-n+7){ border-bottom:none; }

.rst .cal-day.is-it{ background:radial-gradient(circle at 50% 52%, rgba(242,184,114,.35), transparent 70%); z-index:1; }
.rst .cal-day.is-it .num{ position:absolute; inset:0; display:grid; place-items:center;
  font-size:clamp(30px,7vw,88px); font-weight:700; color:#3c2a37; }
.rst .cal-day.is-it .tag{ position:absolute; left:0; right:0; bottom:clamp(2px,.8vw,10px); text-align:center;
  font-size:clamp(7px,1.2vw,12px); font-weight:800; letter-spacing:clamp(1px,.4vw,3px); color:#b2566a; }
.rst .ring{ position:absolute; top:-12%; left:-8%; width:116%; height:124%; overflow:visible; pointer-events:none; }
.rst .ring path{ fill:none; stroke:#c96f7e; stroke-width:3.2; stroke-linecap:round; stroke-linejoin:round;
  stroke-dasharray:1; stroke-dashoffset:1;
  filter:drop-shadow(0 0 6px rgba(217,140,95,.55)); animation:rstCircle 5.5s cubic-bezier(.6,.05,.3,1) infinite; }
@keyframes rstCircle{
  0%{ stroke-dashoffset:1; opacity:1; }
  30%{ stroke-dashoffset:0; opacity:1; }
  80%{ stroke-dashoffset:0; opacity:1; }
  92%{ stroke-dashoffset:0; opacity:0; }
  100%{ stroke-dashoffset:1; opacity:0; }
}
.rst .cal-day.is-it .num{ animation:rstPulse 5.5s ease-in-out infinite; }
@keyframes rstPulse{ 0%,25%{ transform:scale(1); } 34%{ transform:scale(1.08); } 45%,100%{ transform:scale(1); } }

.rst .when{ font-size:clamp(17px,2.6vw,24px); color:#3c2a37; margin:28px 0 4px; }
.rst .localtime{ font-size:15px; color:#8a6f78; margin:0; min-height:1px; }
.rst .whensub{ font-family:Georgia,serif; font-style:italic; font-size:clamp(18px,2.6vw,22px); color:#6b4f5c; margin:14px auto 0; max-width:40ch; }

/* ── Steps ── */
.rst .steps{ list-style:none; counter-reset:st; padding:0; margin:18px 0 0; }
.rst .steps li{ counter-increment:st; position:relative; padding:16px 0 16px 52px; border-top:1px solid #e7e0d3;
  display:flex; flex-direction:column; gap:4px; }
.rst .steps li:first-child{ border-top:none; }
.rst .steps li::before{ content:counter(st); position:absolute; left:0; top:16px; width:34px; height:34px; border-radius:999px;
  background:linear-gradient(135deg,#c96f7e,#d98c5f); color:#fff; font-family:Georgia,serif; font-weight:700;
  display:grid; place-items:center; font-size:16px; }
.rst .steps .st{ font-family:Georgia,serif; font-size:22px; font-weight:700; color:#3c2a37; }
.rst .steps .sl{ font-size:17px; color:#5a4a52; }

/* ── Instructions (dark) ── */
.rst .orders{ background:linear-gradient(160deg,#382634,#5f3a4f 68%,#a86a72); color:#fdf3ea; position:relative; overflow:hidden; }
.rst .orders h2{ color:#fff; }
.rst .orders .eyebrow2{ letter-spacing:2.5px; font-size:12px; font-weight:800; color:#f2b872; margin:0 0 8px; }
.rst .steps.light li{ border-top-color:rgba(255,255,255,.18); }
.rst .steps.light .st{ color:#fff; }
.rst .steps.light .sl{ color:#f2e2d7; }
.rst .orders .tagline{ color:#f2e2d7; }

@media (max-width:560px){
  .rst .cal-day.is-it .tag{ display:none; }
  .rst .cal-day.is-it .num{ font-size:30px; }
  .rst .ring path{ stroke-width:4; }
}

@media (prefers-reduced-motion: reduce){
  .rst .ring path{ animation:none; stroke-dashoffset:0; }
  .rst .cal-day.is-it .num{ animation:none; }
}
`
