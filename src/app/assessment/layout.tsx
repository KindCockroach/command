import type { Metadata } from 'next'

// /assessment is a client page, so its tab title + share card live here.
export const metadata: Metadata = {
  title: 'Where could AI work for you? · WFH — Works For Her',
  description: 'Eight quick taps. Get an instant assessment of where AI fits in your business and how much time it could give back.',
}

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return children
}
