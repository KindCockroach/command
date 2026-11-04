'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, X, Save, Pencil, Plus, Trash2, ExternalLink, Sparkles, Send, Eye } from 'lucide-react'

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
// Audience labels Cap can target (mirrors the People CRM).
const AUDIENCE: { id: string; text: string }[] = [
  { id: 'free_customer', text: 'Free Customers' }, { id: 'paid_customer', text: 'Paid Customers' },
  { id: 'sub_podcast', text: 'Podcast subs' }, { id: 'sub_btfh', text: 'BTFH subs' }, { id: 'sub_joyful', text: 'Joyful subs' },
  { id: 'guest', text: 'Guests' }, { id: 'poi', text: 'Persons of Interest' },
]
type Draft = { subject: string; preview?: string; body: string; cta_label?: string; cta_url?: string; send_offset_days?: number }

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
  const [composeFor, setComposeFor] = useState<Product | null>(null)

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

      {open && <ProductDrawer product={open} onClose={() => setOpenId(null)} onSaved={() => { setOpenId(null); load() }} onCompose={p => { setOpenId(null); setComposeFor(p) }} />}
      {composeFor && <Composer product={composeFor} onClose={() => setComposeFor(null)} onSent={() => { setComposeFor(null); load() }} />}
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ProductDrawer({ product, onClose, onSaved, onCompose }: { product: Product; onClose: () => void; onSaved: () => void; onCompose: (p: Product) => void }) {
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

        {!editing && (
          <button onClick={() => onCompose(product)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', border: 0, borderRadius: '11px', padding: '12px', marginBottom: '16px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: BRAND_COLOR[product.brand], color: '#fff' }}>
            <Sparkles size={15} /> Compose with Cap
          </button>
        )}

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

// Cap's composer — pick an audience + goal, Cap drafts email(s), Mandi previews,
// edits, comments for a revision, then sends via Resend (which logs the cadence).
function Composer({ product, onClose, onSent }: { product: Product; onClose: () => void; onSent: () => void }) {
  const color = BRAND_COLOR[product.brand]
  const [labels, setLabels] = useState<string[]>([])
  const [goal, setGoal] = useState('')
  const [count, setCount] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [busy, setBusy] = useState<false | 'draft' | 'send'>(false)
  const [preview, setPreview] = useState<Set<number>>(new Set())
  const [err, setErr] = useState('')
  const [result, setResult] = useState<string>('')
  const toggle = (id: string) => setLabels(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  const draft = async (revise = false) => {
    setBusy('draft'); setErr(''); setResult('')
    const d = await fetch('/api/campaigns/compose', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, goal, audience_labels: labels, count, feedback: revise ? feedback : '', previous: revise ? JSON.stringify(drafts) : '' }),
    }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup.' }))
    setBusy(false)
    if (d.error) { setErr(d.error); return }
    setDrafts(d.emails || []); setAudienceCount(d.audience_count ?? null); setFeedback('')
  }

  const send = async (dft: Draft) => {
    if (!confirm(`Send "${dft.subject}" to ${audienceCount ?? 'the'} people now?`)) return
    setBusy('send'); setErr('')
    const d = await fetch('/api/campaigns/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, subject: dft.subject, body: dft.body, cta_label: dft.cta_label, cta_url: dft.cta_url, audience_labels: labels }),
    }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup.' }))
    setBusy(false)
    if (d.error) { setErr(d.error); return }
    setResult(`Sent to ${d.sent}${d.failed ? `, ${d.failed} failed` : ''}.`)
  }

  const setDraft = (i: number, patch: Partial<Draft>) => setDrafts(ds => ds.map((x, j) => j === i ? { ...x, ...patch } : x))
  const fieldLbl = { fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-subtle)' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,20,0.5)', zIndex: 70, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(640px, 100%)', background: 'var(--bg, #fff)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px', boxShadow: '0 40px 90px -40px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>📣 Cap · {product.name}</h3>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', margin: '0 0 16px' }}>Tell Cap the audience and the goal. Cap drafts; you edit, comment, and send.</p>

        <p style={{ ...fieldLbl, margin: '0 0 7px' }}>Audience {audienceCount !== null && <span style={{ color, marginLeft: 6 }}>{audienceCount} people</span>}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {AUDIENCE.map(a => (
            <button key={a.id} onClick={() => toggle(a.id)} style={{ border: `1px solid ${labels.includes(a.id) ? color : 'var(--border)'}`, background: labels.includes(a.id) ? color : 'transparent', color: labels.includes(a.id) ? '#fff' : 'var(--text-subtle)', borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{a.text}</button>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-subtle)', margin: '-6px 0 14px' }}>No audience selected = everyone with an email.</p>

        <p style={{ ...fieldLbl, margin: '0 0 6px' }}>Goal / rough message</p>
        <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={2} placeholder="e.g. invite them to Sunday's Reset — gentle, one yes" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 11px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', marginBottom: '12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={fieldLbl}>Emails</span>
          {[1, 3, 5].map(n => <button key={n} onClick={() => setCount(n)} style={{ border: `1px solid ${count === n ? color : 'var(--border)'}`, background: count === n ? color : 'transparent', color: count === n ? '#fff' : 'var(--text-subtle)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{n === 1 ? 'Single' : `${n}-part`}</button>)}
          <button onClick={() => draft(false)} disabled={busy !== false} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', border: 0, borderRadius: '9px', padding: '9px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: color, color: '#fff', opacity: busy ? 0.6 : 1 }}>
            {busy === 'draft' ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} {drafts.length ? 'Redraft' : 'Draft with Cap'}
          </button>
        </div>

        {err && <p style={{ color: '#b23b3b', fontSize: '13px', margin: '0 0 12px' }}>{err}</p>}
        {result && <p style={{ color: '#15803D', fontSize: '13px', fontWeight: 700, margin: '0 0 12px' }}>✅ {result}</p>}

        {drafts.map((d, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '13px', padding: '14px', marginBottom: '12px', background: 'var(--bg-subtle, rgba(0,0,0,0.02))' }}>
            {drafts.length > 1 && <div style={{ fontSize: '11px', fontWeight: 800, color, marginBottom: '8px' }}>EMAIL {i + 1}{typeof d.send_offset_days === 'number' ? ` · day ${d.send_offset_days}` : ''}</div>}
            <input value={d.subject} onChange={e => setDraft(i, { subject: e.target.value })} placeholder="Subject" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', fontWeight: 700, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', marginBottom: '8px' }} />
            {preview.has(i) ? (
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap', padding: '6px 2px' }}>{d.body}</div>
            ) : (
              <textarea value={d.body} onChange={e => setDraft(i, { body: e.target.value })} rows={7} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 11px', fontSize: '13px', lineHeight: 1.55, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical' }} />
            )}
            <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
              <input value={d.cta_label || ''} onChange={e => setDraft(i, { cta_label: e.target.value })} placeholder="Button label" style={{ flex: '0 0 40%', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', fontSize: '12.5px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }} />
              <input value={d.cta_url || ''} onChange={e => setDraft(i, { cta_url: e.target.value })} placeholder="https://…" style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', fontSize: '12.5px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => setPreview(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })} style={{ display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: 'var(--text-subtle)' }}><Eye size={13} /> {preview.has(i) ? 'Edit' : 'Preview'}</button>
              <button onClick={() => send(d)} disabled={busy !== false} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 0, borderRadius: '8px', padding: '7px 14px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: color, color: '#fff', opacity: busy ? 0.6 : 1 }}>
                {busy === 'send' ? <Loader2 size={13} className="spin" /> : <Send size={13} />} Send{audienceCount !== null ? ` to ${audienceCount}` : ''}
              </button>
            </div>
          </div>
        ))}

        {drafts.length > 0 && (
          <div style={{ marginTop: '6px' }}>
            <p style={{ ...fieldLbl, margin: '0 0 6px' }}>Comment for Cap (then redraft)</p>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} placeholder="e.g. warmer open, shorter, lead with the invitation" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 11px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', marginBottom: '8px' }} />
            <button onClick={() => draft(true)} disabled={busy !== false || !feedback.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: `1px solid ${color}`, borderRadius: '9px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color, opacity: (busy || !feedback.trim()) ? 0.5 : 1 }}>
              {busy === 'draft' ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} Revise with Cap
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
