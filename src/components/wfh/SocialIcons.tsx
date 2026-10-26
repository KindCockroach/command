// Social icons for the bottom of every WFH page. Icons are simple-icons SVGs in
// /public/icons, tinted with a CSS mask so they match each page's footer color.
// A network with no URL yet is simply not shown — fill in FB/TikTok when known.
export const SOCIALS: { name: string; icon: string; href: string }[] = [
  { name: 'Instagram', icon: 'instagram', href: 'https://instagram.com/aimompodcast' },
  { name: 'Facebook', icon: 'facebook', href: '' },
  { name: 'LinkedIn', icon: 'linkedin', href: 'https://linkedin.com/in/amanda-beck-588200378' },
  { name: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@AIMom_888' },
  { name: 'TikTok', icon: 'tiktok', href: '' },
]

export default function SocialIcons({ color = '#cfc9dd' }: { color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', margin: '0 0 18px' }}>
      {SOCIALS.filter(s => s.href).map(s => (
        <a key={s.name} href={s.href} target="_blank" rel="noreferrer" aria-label={s.name} title={s.name}
          className="wfh-social"
          style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center',
            border: `1.5px solid ${color}55`, transition: 'transform .15s ease, border-color .15s ease' }}>
          <span style={{ width: 19, height: 19, background: color, display: 'block',
            WebkitMask: `url(/icons/${s.icon}.svg) center / contain no-repeat`, mask: `url(/icons/${s.icon}.svg) center / contain no-repeat` }} />
        </a>
      ))}
      <style>{`.wfh-social:hover{transform:translateY(-3px);border-color:#F2A65A!important}`}</style>
    </div>
  )
}
