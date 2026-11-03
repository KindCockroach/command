// "Who's AI Mom?" — every signup email comes from hi@aimomeducation.com, so anyone who
// joins through Be There For Her meets AI Mom here. Mandi approved this copy 2026-11-03.
// Used by the post-signup pages (components/joyful/AiMomIntro.tsx) and the signup emails.

export const AI_MOM_INTRO = [
  'That’s me, Mandi, and you’ll see that name in your inbox. “AI Mom” isn’t about robots. She’s the mom you need when the earth is shaking under your feet.',
  'The machines are moving fast, so I keep up with AI for my family and yours: jobs, school, what’s worth learning. And I keep teaching the one thing no machine can do for you: get quiet, listen to your body, trust what you know.',
  'Be There For Her is where we practice that. Same woman, two hands: one on the future, one on your heart.',
]

export const PODCAST_LINKS = [
  { name: 'Spotify', href: 'https://open.spotify.com/show/033I8hRPjXiKlCHhaq5YYc' },
  { name: 'Apple Podcasts', href: 'https://podcasts.apple.com/us/podcast/ai-mom/id6786440414' },
  { name: 'YouTube', href: 'https://www.youtube.com/@AIMom_888' },
]

const linkStyle = 'color:#D98C5F;font-weight:bold'

export function aiMomIntroHtml(): string {
  return `<div style="margin:22px 0;padding:16px 18px;border-radius:14px;background:#FBF3EC;border:1px solid #F0DCCB">
<p style="margin:0 0 8px"><b>Who’s AI Mom?</b> ${AI_MOM_INTRO[0]}</p>
<p style="margin:0 0 8px">${AI_MOM_INTRO[1]}</p>
<p style="margin:0">${AI_MOM_INTRO[2]}</p></div>`
}

export function podcastLinksHtml(): string {
  return `<p style="font-size:14px;color:#6b5a66;border-top:1px solid #eee2d8;padding-top:14px;margin-top:22px">
🎙 <b>The AI Mom Podcast:</b> ${PODCAST_LINKS.map(l => `<a href="${l.href}" style="${linkStyle}">${l.name}</a>`).join(' · ')}</p>`
}
