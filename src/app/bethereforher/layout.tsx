import type { Metadata } from 'next'

// bethereforher.com has its own tab icon (the amber-eye emblem); the rest of the site uses the balloon.
// Link previews resolve images on bethereforher.com, not the AI Works For Her domain.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.bethereforher.com'),
  icons: { icon: '/favicon-btfh.ico', apple: '/apple-icon-btfh.png' },
}

export default function BeThereForHerLayout({ children }: { children: React.ReactNode }) {
  return children
}
