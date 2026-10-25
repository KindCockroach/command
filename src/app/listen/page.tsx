export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

// aiworksforher.com/listen — pick your platform for the AI Mom Podcast.
// NOTE: the three hrefs are SEARCH links (they'll find the show) until Mandi sends the
// exact Apple / Spotify / YouTube URLs — then just replace the `href` values below.
export const metadata: Metadata = {
  title: 'Listen — The AI Mom Podcast',
  description: 'Listen to the AI Mom Podcast on Apple Podcasts, Spotify, or YouTube.',
}

const PLATFORMS = [
  { name: 'Apple Podcasts', emoji: '', color: '#9933CC', href: 'https://podcasts.apple.com/us/podcast/ai-mom/id6786440414' },
  { name: 'Spotify', emoji: '', color: '#1DB954', href: 'https://open.spotify.com/show/033I8hRPjXiKlCHhaq5YYc' },
  { name: 'YouTube', emoji: '', color: '#FF0000', href: 'https://www.youtube.com/@AIMom_888' },
]

export default function Listen() {
  return (
    <main className="l">
      <style>{css}</style>
      <section>
        <div className="wrap">
          <img src="/balloon-512.png" alt="" className="balloon" />
          <p className="eyebrow">THE AI MOM PODCAST</p>
          <h1>Listen wherever you are.</h1>
          <p className="sub">How to think &mdash; not what to think &mdash; about AI. Pick your spot:</p>

          <div className="cards">
            {PLATFORMS.map((p) => (
              <a key={p.name} className="card" href={p.href} target="_blank" rel="noreferrer" style={{ borderColor: p.color }}>
                <span className="dot" style={{ background: p.color }} />
                <span className="pname">{p.name}</span>
                <span className="go" style={{ color: p.color }}>Listen on {p.name.split(' ')[0]} &rarr;</span>
              </a>
            ))}
          </div>

          <p className="back"><a href="/aimom">&larr; AI Mom</a> &middot; <a href="/book">Be a guest</a></p>
        </div>
      </section>
    </main>
  )
}

const css = `
.l { --midnight:#171C3A; --nebula:#5A4FCF; --ember:#F2A65A; --cream:#FBF7F1;
  background:linear-gradient(170deg,var(--midnight),#241f49 70%,var(--nebula)); color:var(--cream); min-height:100vh; margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; display:flex; align-items:center; }
.l .wrap { max-width:520px; margin:0 auto; padding:56px 24px; text-align:center; width:100%; }
.l .balloon { width:72px; height:72px; object-fit:contain; margin:0 auto 14px; display:block; }
.l .eyebrow { letter-spacing:3px; font-size:12px; font-weight:800; color:var(--ember); margin:0 0 14px; }
.l h1 { font-family:Georgia,"Times New Roman",serif; font-size:clamp(28px,6vw,40px); line-height:1.12; margin:0 0 14px; color:#fff; }
.l .sub { font-size:17px; color:#e7e2f2; margin:0 0 32px; }
.l .cards { display:flex; flex-direction:column; gap:14px; }
.l .card { display:flex; align-items:center; gap:14px; text-decoration:none; background:#fff; color:var(--midnight);
  border:2px solid; border-radius:16px; padding:18px 22px; transition:transform .12s ease, box-shadow .12s ease; }
.l .card:hover { transform:translateY(-2px); box-shadow:0 14px 34px rgba(0,0,0,0.3); }
.l .dot { width:14px; height:14px; border-radius:50%; flex-shrink:0; }
.l .pname { font-weight:800; font-size:18px; flex:1; text-align:left; }
.l .go { font-weight:800; font-size:13px; white-space:nowrap; }
.l .back { margin-top:34px; font-size:14px; }
.l .back a { color:#cfc9dd; text-decoration:none; font-weight:600; }
`
