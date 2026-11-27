// Phase 7 · the one banner every tab uses: the tab's name and one line of what it's for.
// Styles live in globals.css (.rp-banner) so Day (Orchid Dawn) and Night (Midnight Orchid) both apply.
// Phase 8 · B1: an optional small gold back arrow, top-left, that steps back ONE view inside RISE.
import { ChevronLeft } from 'lucide-react'

export default function Banner({ title, sub, children, back }: { title: string; sub?: string; children?: React.ReactNode; back?: { can: boolean; onBack: () => void } }) {
  return (
    <section className="rp-banner">
      <div className="rp-banner-head">
        {back && (
          <button type="button" className="rp-back" onClick={back.onBack} disabled={!back.can} aria-label="Back one step" title={back.can ? 'Back one step' : 'Nothing to go back to'}>
            <ChevronLeft size={20} strokeWidth={2.6} aria-hidden />
          </button>
        )}
        <h1>{title}</h1>
      </div>
      {sub && <p>{sub}</p>}
      {children && <div style={{ position: 'relative', zIndex: 1, marginTop: 14 }}>{children}</div>}
    </section>
  )
}
