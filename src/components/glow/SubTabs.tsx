'use client'
// Phase 7 · a row of sub-tab pills under a banner: one tool at a time, counts on the pills.
export type SubTab = { id: string; label: string; count?: number }
export default function SubTabs({ tabs, active, onPick }: { tabs: SubTab[]; active: string; onPick: (id: string) => void }) {
  if (tabs.length < 2) return null
  return (
    <div className="rp-subtabs" role="tablist">
      {tabs.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id} aria-pressed={active === t.id}
          className={`rp-pill ${active === t.id ? 'rp-primary' : 'rp-secondary'}`} onClick={() => onPick(t.id)}>
          {t.label}{t.count ? <span className="rp-count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
