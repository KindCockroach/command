import type { Metadata } from 'next'

// bethereforher.com keeps its own "Hers" tab icon; the rest of the site uses the balloon.
export const metadata: Metadata = {
  icons: { icon: '/favicon-hers.ico', apple: '/apple-icon-hers.png' },
}

export default function BeThereForHerLayout({ children }: { children: React.ReactNode }) {
  return children
}
