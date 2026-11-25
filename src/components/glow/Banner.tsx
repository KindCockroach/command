// Phase 7 · the one banner every tab uses: the tab's name and one line of what it's for.
// Styles live in globals.css (.rp-banner) so Day (Orchid Dawn) and Night (Midnight Orchid) both apply.
export default function Banner({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <section className="rp-banner">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
      {children && <div style={{ position: 'relative', zIndex: 1, marginTop: 14 }}>{children}</div>}
    </section>
  )
}
