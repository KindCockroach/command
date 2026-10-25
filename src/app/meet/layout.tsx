import type { Metadata } from 'next'

// /meet is a client page, so its tab title + share card live here.
export const metadata: Metadata = {
  title: 'Book a time · WFH — Works For Her',
  description: 'Book a time with Mandi Beck — AI integration, UGC & marketing, or speaking.',
}

export default function MeetLayout({ children }: { children: React.ReactNode }) {
  return children
}
