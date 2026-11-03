'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, X, Save, Pencil, Plus, Trash2, ExternalLink } from 'lucide-react'

// CAMPAIGNS — every product/offer under Joyful Media as an org chart, each with its
// mission, how it fits the big picture, funnel links, and a cadence clock (touch its
// people at least every N days) computed from the send-log. The email composer
// (Campaign Manager) lands here in the next pass.
type Brand = 'btfh' | 'wfh' | 'joyful'
type Link = { label: string; url: string }
type Product = {
  id: string; name: string; brand: Brand; kind: string; status: 'live' | 'soon'; price?: string
  mission: string; fits: string; links: Link[]; cadence_days: number
  last_sent: string | null; days_since: number | null; overdue: boolean
}

const BRAND_TEXT: Record<Brand, string> = { btfh: 'Be There For Her', wfh: 'AI Works For Her', joyful: 'Joyful Media' }
const BRAND_COLOR: Record<Brand, string> = { btfh: '#C2693F', wfh: '#5A4FCF', joyful: '#E2508A' }
const BRAND_EMOJI: Record<Brand, string> = { btfh: '🌙', wfh: '🎈', joyful: '🎙' }
const KIND_TEXT: Record<string, string> = { free_download: 'Free download', paid_download: 'Paid download', live: 'Live session', membership: 'Membership', podcast: 'Podcast', service: 'Service', guest_track: 'Comms track' }
const ORDER: Brand[] = ['btfh', 'wfh', 'joyful']

const label = { fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-subtle)' }
const input = { width: '100%', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px 11px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' as const }

// The cadence light: 🟢 touched recently · 🔴 overdue · — no clock.
function Cadence({ p, big }: { p: Product; big?: boolean }) {
  const fs = big ? '13px' : '11.5px'
  if (p.cadence_days === 0) return <span style={{ fontSize: fs, color: 'var(--text-subtle)' }}>no cadence</span>
  if (p.overdue) return <span style={{ fontSize: fs, color: '#C2410C', fontWeight: 700 }}>🔴 {p.days_since === null ? 'never touched' : `${p.days_since}d — reach out`}</span>
  return <span style={{ fontSize: fs, color: '#15803D', fontWeight: 700 }}>🟢 touched {p.days_since === 0 ? 'today' : `${p.days_since}d ago`}</span>
}

export default function CampaignsPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const d = await fetch('/api/campaigns').then(r => r.json()).catch(() => ({ products: [] }))
    setProducts(d.products || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const open = products.find(p => p.id === openId) || null
  const overdue = products.filter(p => p.overdue).length

  return (
    <div style={{ padding: '4px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Campaigns</h2>
        <span style={{ ...label }}>Joyful Media · the big picture</span>
        {overdue > 0 && <span style={{ marginLeft: 'auto', fontSize: '12.5px', fontWeight: 700, color: '#C2410C' }}>🔴 {overdue} overdue to reach out</span>}
      </div>
      <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', margin: '0 0 20px' }}>Click a product for its mission, funnel links, and cadence. The email composer arrives next.</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={20} className="spin" style={{ color: 'var(--text-subtle)' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {ORDER.map(brand => {
            const items = products.filter(p => p.brand === brand)
            if (!items.length) return null
            return (
              <div key={brand}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '11px' }}>
                  <span style={{ fontSize: '16px' }}>{BRAND_EMOJI[brand]}</span>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: BRAND_COLOR[brand] }}>{BRAND_TEXT[brand]}</h3>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {items.map(p => (
                    <button key={p.id} onClick={() => setOpenId(p.id)} style={{
                      textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${p.overdue ? '#F0C2A0' : 'var(--border)'}`,
                      borderRadius: '14px', padding: '14px 15px', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800 }}>{p.name}</span>
                        {p.status === 'soon' && <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.04em', color: '#92400E', background: '#FEF3C7', padding: '2px 7px', borderRadius: '999px', whiteSpace: 'nowrap' }}>SOON</span>}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-subtle)' }}>{KIND_TEXT[p.kind] || p.kind}{p.price ? ` · ${p.price}` : ''}</div>
                      <Cadence p={p} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && <ProductDrawer product={open} onClose={() => setOpenId(null)} onSaved={() => { setOpenId(null); load() }} />}
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ProductDrawer({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({ mission: product.mission, fits: product.fits, price: product.price || '', cadence_days: product.cadence_days, status: product.status })
  const [links, setLinks] = useState<Link[]>(product.links)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    await fetch('/api/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, ...f, links: links.filter(l => l.url.trim()) }) })
    setBusy(false); onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,20,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 94vw)', height: '100%', overflowY: 'auto', background: 'var(--bg, #fff)', borderLeft: '1px solid var(--border)', padding: '22px 22px 40px', boxShadow: '-20px 0 60px -30px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: BRAND_COLOR[product.brand] }}>{BRAND_EMOJI[product.brand]} {BRAND_TEXT[product.brand]}</span>
            <h3 style={{ margin: '3px 0 2px', fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{product.name}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{KIND_TEXT[product.kind] || product.kind}{f.price ? ` · ${f.price}` : ''}{f.status === 'soon' ? ' · coming soon' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {!editing && <button onClick={() => setEditing(true)} title="Edit" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><Pencil size={16} /></button>}
            <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={18} /></button>
          </div>
        </div>

        <div style={{ margin: '16px 0', padding: '11px 13px', borderRadius: '11px', background: product.overdue ? '#FEF3EC' : 'var(--bg-subtle, rgba(0,0,0,0.03))', border: '1px solid var(--border)' }}>
          <Cadence p={product} big />
          {product.cadence_days > 0 && <div style={{ fontSize: '11.5px', color: 'var(--text-subtle)', marginTop: '3px' }}>Goal: touch its people every {product.cadence_days} days.</div>}
        </div>

        {!editing ? (
          <>
            <p style={{ ...label, margin: '0 0 6px' }}>Mission</p>
            <p style={{ fontSize: '14px', color: 'var(--text)', margin: '0 0 16px', lineHeight: 1.55 }}>{product.mission}</p>
            <p style={{ ...label, margin: '0 0 6px' }}>How it fits the big picture</p>
            <p style={{ fontSize: '13.5px', color: 'var(--text)', margin: '0 0 16px', lineHeight: 1.55 }}>{product.fits}</p>
            <p style={{ ...label, margin: '0 0 8px' }}>Funnel links</p>
            {product.links.length ? product.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: BRAND_COLOR[product.brand], marginBottom: '7px', textDecoration: 'none' }}>
                <ExternalLink size={13} /> {l.label || l.url}
              </a>
            )) : <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)' }}>No links yet.</p>}
          </>
        ) : (
          <>
            <p style={{ ...label, margin: '0 0 6px' }}>Mission</p>
            <textarea value={f.mission} onChange={e => setF({ ...f, mission: e.target.value })} rows={3} style={{ ...input, resize: 'vertical', marginBottom: '14px' }} />
            <p style={{ ...label, margin: '0 0 6px' }}>How it fits the big picture</p>
            <textarea value={f.fits} onChange={e => setF({ ...f, fits: e.target.value })} rows={3} style={{ ...input, resize: 'vertical', marginBottom: '14px' }} />
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}><p style={{ ...label, margin: '0 0 6px' }}>Price</p><input value={f.price} onChange={e => setF({ ...f, price: e.target.value })} style={input} /></div>
              <div style={{ width: '110px' }}><p style={{ ...label, margin: '0 0 6px' }}>Cadence (days)</p><input type="number" min={0} value={f.cadence_days} onChange={e => setF({ ...f, cadence_days: Number(e.target.value) })} style={input} /></div>
            </div>
            <p style={{ ...label, margin: '0 0 6px' }}>Status</p>
            <div style={{ display: 'flex', gap: '7px', marginBottom: '16px' }}>
              {(['live', 'soon'] as const).map(s => (
                <button key={s} onClick={() => setF({ ...f, status: s })} style={{ border: `1px solid ${f.status === s ? BRAND_COLOR[product.brand] : 'var(--border)'}`, background: f.status === s ? BRAND_COLOR[product.brand] : 'transparent', color: f.status === s ? '#fff' : 'var(--text-subtle)', borderRadius: '999px', padding: '5px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{s === 'live' ? 'Live' : 'Coming soon'}</button>
              ))}
            </div>
            <p style={{ ...label, margin: '0 0 8px' }}>Funnel links</p>
            {links.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                <input value={l.label} placeholder="Label" onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} style={{ ...input, flex: '0 0 34%' }} />
                <input value={l.url} placeholder="https://…" onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} style={{ ...input, flex: 1 }} />
                <button onClick={() => setLinks(links.filter((_, j) => j !== i))} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><Trash2 size={15} /></button>
              </div>
            ))}
            <button onClick={() => setLinks([...links, { label: '', url: '' }])} style={{ display: 'flex', alignItems: 'center', gap: '5px', border: 0, background: 'transparent', color: 'var(--text-subtle)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: '2px' }}><Plus size={13} /> Add link</button>
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <button onClick={save} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: '7px', border: 0, borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: BRAND_COLOR[product.brand], color: '#fff', opacity: busy ? 0.6 : 1 }}>
                {busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
              </button>
              <button onClick={() => setEditing(false)} style={{ border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: 'var(--text-subtle)' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
