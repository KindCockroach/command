'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, X, Save, Plus, Trash2, ExternalLink, Sparkles, Send, Eye, ChevronDown } from 'lucide-react'

// CAMPAIGNS — compose-first. The tab opens as the composer itself: pick what you're
// sending → Cap drafts → pick who gets it → send. Mission / fit / links / cadence are
// reference that lives in a quiet "details" panel, not in the way of the one job.
type Brand = 'btfh' | 'wfh' | 'joyful'
type Link = { label: string; url: string }
type Product = {
  id: string; name: string; brand: Brand; kind: string; status: 'live' | 'soon'; price?: string
  mission: string; fits: string; links: Link[]; cadence_days: number
  last_sent: string | null; days_since: number | null; overdue: boolean
}
type Person = { email?: string; labels: string[] }
type Draft = { subject: string; preview?: string; body: string; cta_label?: string; cta_url?: string; send_offset_days?: number }

const BRAND_TEXT: Record<Brand, string> = { btfh: 'Be There For Her', wfh: 'AI Works For Her', joyful: 'Joyful Media' }
const BRAND_COLOR: Record<Brand, string> = { btfh: '#C2693F', wfh: '#5A4FCF', joyful: '#E2508A' }
const BRAND_EMOJI: Record<Brand, string> = { btfh: '🌙', wfh: '🎈', joyful: '🎙' }
const KIND_TEXT: Record<string, string> = { free_download: 'Free download', paid_download: 'Paid download', live: 'Live session', membership: 'Membership', podcast: 'Podcast', service: 'Service', guest_track: 'Comms track' }
const ORDER: Brand[] = ['btfh', 'wfh', 'joyful']
const AUDIENCE: { id: string; text: string }[] = [
  { id: 'free_customer', text: 'Free Customers' }, { id: 'paid_customer', text: 'Paid Customers' },
  { id: 'sub_podcast', text: 'Podcast subs' }, { id: 'sub_btfh', text: 'BTFH subs' }, { id: 'sub_joyful', text: 'Joyful subs' },
  { id: 'guest', text: 'Guests' }, { id: 'poi', text: 'Persons of Interest' }, { id: 'invited', text: 'Invited' },
]

const stepLbl = { fontSize: '11px', fontWeight: 800 as const, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-subtle)' }
const miniLbl = { fontSize: '10.5px', fontWeight: 800 as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-subtle)' }
const input = { width: '100%', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 11px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' as const }

function cadenceText(p: Product): { text: string; color: string } {
  if (p.cadence_days === 0) return { text: 'no cadence', color: 'var(--text-subtle)' }
  if (p.overdue) return { text: p.days_since === null ? 'never reached out' : `${p.days_since}d — reach out`, color: '#C2410C' }
  return { text: p.days_since === 0 ? 'reached today' : `reached ${p.days_since}d ago`, color: '#15803D' }
}

export default function CampaignsPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showOverdue, setShowOverdue] = useState(false)

  // composer state
  const [goal, setGoal] = useState('')
  const [count, setCount] = useState(1)
  const [labels, setLabels] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [feedback, setFeedback] = useState('')
  const [preview, setPreview] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState<false | 'draft' | 'send'>(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [c, pp] = await Promise.all([
      fetch('/api/campaigns').then(r => r.json()).catch(() => ({ products: [] })),
      fetch('/api/people').then(r => r.json()).catch(() => ({ people: [] })),
    ])
    setProducts(c.products || []); setPeople(pp.people || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const selected = products.find(p => p.id === selectedId) || null
  const color = selected ? BRAND_COLOR[selected.brand] : '#5A4FCF'
  const overdue = products.filter(p => p.overdue)

  // Live headcount — matches the backend's "any of these labels" (OR) filter.
  const audienceCount = useMemo(() => people.filter(p =>
    p.email && (labels.length ? labels.some(l => p.labels.includes(l)) : true)).length, [people, labels])

  const pick = (id: string) => {
    setSelectedId(id); setDrafts([]); setErr(''); setResult(''); setShowDetails(false); setFeedback('')
  }
  const toggleLabel = (id: string) => setLabels(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])
  const setDraft = (i: number, patch: Partial<Draft>) => setDrafts(ds => ds.map((x, j) => j === i ? { ...x, ...patch } : x))

  const draft = async (revise = false) => {
    if (!selected) return
    setBusy('draft'); setErr(''); setResult('')
    const d = await fetch('/api/campaigns/compose', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: selected.id, goal, audience_labels: labels, count, feedback: revise ? feedback : '', previous: revise ? JSON.stringify(drafts) : '' }),
    }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup.' }))
    setBusy(false)
    if (d.error) { setErr(d.error); return }
    setDrafts(d.emails || []); setFeedback('')
  }

  const send = async (dft: Draft) => {
    if (!selected) return
    if (!confirm(`Send "${dft.subject}" to ${audienceCount} ${audienceCount === 1 ? 'person' : 'people'} now?`)) return
    setBusy('send'); setErr('')
    const d = await fetch('/api/campaigns/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: selected.id, subject: dft.subject, body: dft.body, cta_label: dft.cta_label, cta_url: dft.cta_url, audience_labels: labels }),
    }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup.' }))
    setBusy(false)
    if (d.error) { setErr(d.error); return }
    setResult(`Sent to ${d.sent}${d.failed ? `, ${d.failed} failed` : ''}.`)
    load()
  }

  return (
    <div style={{ padding: '4px 2px', maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '4px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Campaigns</h2>
        <span style={miniLbl}>write it · send it</span>
      </div>
      <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', margin: '0 0 16px' }}>Pick what you&rsquo;re sending, Cap drafts it, you choose who gets it, send.</p>

      {/* Overdue nudge — quiet, taps straight into composing */}
      {overdue.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <button onClick={() => setShowOverdue(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '7px', border: '1px solid #F0C2A0', background: '#FEF3EC', borderRadius: '10px', padding: '8px 13px', fontSize: '12.5px', fontWeight: 700, color: '#C2410C', cursor: 'pointer', fontFamily: 'inherit' }}>
            🔴 {overdue.length} overdue to reach out
            <ChevronDown size={14} style={{ transform: showOverdue ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {showOverdue && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '9px' }}>
              {overdue.map(p => (
                <button key={p.id} onClick={() => pick(p.id)} style={{ border: `1px solid ${BRAND_COLOR[p.brand]}`, background: 'transparent', color: BRAND_COLOR[p.brand], borderRadius: '999px', padding: '5px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {p.name} · {cadenceText(p).text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={20} className="spin" style={{ color: 'var(--text-subtle)' }} /></div>
      ) : (
        <>
          {/* STEP 1 — what are you sending */}
          <p style={{ ...stepLbl, margin: '0 0 10px' }}>1 · What are you sending?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {ORDER.map(brand => {
              const items = products.filter(p => p.brand === brand)
              if (!items.length) return null
              return (
                <div key={brand}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px' }}>{BRAND_EMOJI[brand]}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: BRAND_COLOR[brand] }}>{BRAND_TEXT[brand]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {items.map(p => {
                      const on = p.id === selectedId
                      const cad = cadenceText(p)
                      return (
                        <button key={p.id} onClick={() => pick(p.id)} style={{
                          textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                          border: `1.5px solid ${on ? BRAND_COLOR[p.brand] : 'var(--border)'}`,
                          background: on ? BRAND_COLOR[p.brand] : 'var(--bg)', color: on ? '#fff' : 'var(--text)',
                          borderRadius: '13px', padding: '9px 13px', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '130px',
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 800 }}>
                            {p.name}
                            {p.status === 'soon' && <span style={{ fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.04em', color: on ? '#fff' : '#92400E', background: on ? 'rgba(255,255,255,0.25)' : '#FEF3C7', padding: '1px 6px', borderRadius: '999px' }}>SOON</span>}
                          </span>
                          <span style={{ fontSize: '10.5px', opacity: 0.85, color: on ? '#fff' : cad.color, fontWeight: 600 }}>
                            {KIND_TEXT[p.kind] || p.kind}{p.price ? ` · ${p.price}` : ''}
                          </span>
                          <span style={{ fontSize: '10px', opacity: on ? 0.9 : 1, color: on ? '#fff' : cad.color, fontWeight: 700 }}>
                            {p.cadence_days === 0 ? '' : (p.overdue ? '🔴 ' : '🟢 ') + cad.text}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {!selected ? (
            <div style={{ border: '1px dashed var(--border)', borderRadius: '13px', padding: '26px', textAlign: 'center', fontSize: '13px', color: 'var(--text-subtle)' }}>
              Pick a campaign above to start writing.
            </div>
          ) : (
            <>
              {/* selected context + collapsible details/edit */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '13px', padding: '13px 15px', marginBottom: '22px', background: 'var(--bg-subtle, rgba(0,0,0,0.02))' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text)' }}>{selected.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '2px', lineHeight: 1.5 }}>{selected.mission}</div>
                  </div>
                  <button onClick={() => setShowDetails(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 0, background: 'transparent', cursor: 'pointer', color, fontSize: '11.5px', fontWeight: 800, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    Details <ChevronDown size={13} style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                  </button>
                </div>
                {selected.links.length > 0 && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '9px' }}>
                    {selected.links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color, textDecoration: 'none', fontWeight: 600 }}>
                        <ExternalLink size={12} /> {l.label || l.url}
                      </a>
                    ))}
                  </div>
                )}
                {showDetails && <DetailsEditor product={selected} color={color} onSaved={() => { setShowDetails(false); load() }} />}
              </div>

              {/* STEP 2 — the message */}
              <p style={{ ...stepLbl, margin: '0 0 9px' }}>2 · The message</p>
              <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={2} placeholder={'Tell Cap the goal — e.g. “invite them to Sunday’s Reset, gentle, one yes”'} style={{ ...input, resize: 'vertical', marginBottom: '11px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <span style={miniLbl}>Length</span>
                {[1, 3, 5].map(n => <button key={n} onClick={() => setCount(n)} style={{ border: `1px solid ${count === n ? color : 'var(--border)'}`, background: count === n ? color : 'transparent', color: count === n ? '#fff' : 'var(--text-subtle)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{n === 1 ? 'Single' : `${n}-part`}</button>)}
                <button onClick={() => draft(false)} disabled={busy !== false} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '7px', border: 0, borderRadius: '10px', padding: '10px 18px', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: color, color: '#fff', opacity: busy ? 0.6 : 1 }}>
                  {busy === 'draft' ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} {drafts.length ? 'Redraft' : 'Draft with Cap'}
                </button>
              </div>

              {err && <p style={{ color: '#b23b3b', fontSize: '13px', margin: '0 0 12px' }}>{err}</p>}
              {result && <p style={{ color: '#15803D', fontSize: '13.5px', fontWeight: 700, margin: '0 0 14px' }}>✅ {result}</p>}

              {drafts.length > 0 && (
                <>
                  {/* STEP 3 — who gets it (shared across the drafts) */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '0 0 9px' }}>
                    <p style={{ ...stepLbl, margin: 0 }}>3 · Who gets it</p>
                    <span style={{ fontSize: '13px', fontWeight: 800, color }}>{audienceCount} {audienceCount === 1 ? 'person' : 'people'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {AUDIENCE.map(a => (
                      <button key={a.id} onClick={() => toggleLabel(a.id)} style={{ border: `1px solid ${labels.includes(a.id) ? color : 'var(--border)'}`, background: labels.includes(a.id) ? color : 'transparent', color: labels.includes(a.id) ? '#fff' : 'var(--text-subtle)', borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{a.text}</button>
                    ))}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)', margin: '0 0 18px' }}>None selected = everyone with an email. Pick several to reach anyone in those groups.</p>

                  {drafts.map((d, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '13px', padding: '14px', marginBottom: '12px', background: 'var(--bg)' }}>
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
                        <button onClick={() => send(d)} disabled={busy !== false} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 0, borderRadius: '8px', padding: '7px 15px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: color, color: '#fff', opacity: busy ? 0.6 : 1 }}>
                          {busy === 'send' ? <Loader2 size={13} className="spin" /> : <Send size={13} />} Send to {audienceCount}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* revise */}
                  <div style={{ marginTop: '6px' }}>
                    <p style={{ ...miniLbl, margin: '0 0 6px' }}>Comment for Cap, then redraft</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} placeholder="e.g. warmer open, shorter, lead with the invitation" style={{ ...input, flex: 1, minWidth: '240px', resize: 'vertical' }} />
                      <button onClick={() => draft(true)} disabled={busy !== false || !feedback.trim()} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', border: `1px solid ${color}`, borderRadius: '9px', padding: '9px 15px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color, opacity: (busy || !feedback.trim()) ? 0.5 : 1 }}>
                        {busy === 'draft' ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} Revise
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// Compact inline details editor — mission, fit, price, cadence, status, links via PATCH.
function DetailsEditor({ product, color, onSaved }: { product: Product; color: string; onSaved: () => void }) {
  const [f, setF] = useState({ mission: product.mission, fits: product.fits, price: product.price || '', cadence_days: product.cadence_days, status: product.status })
  const [links, setLinks] = useState<Link[]>(product.links)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    await fetch('/api/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, ...f, links: links.filter(l => l.url.trim()) }) })
    setBusy(false); onSaved()
  }
  return (
    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
      <p style={{ ...miniLbl, margin: '0 0 5px' }}>Mission</p>
      <textarea value={f.mission} onChange={e => setF({ ...f, mission: e.target.value })} rows={2} style={{ ...input, resize: 'vertical', marginBottom: '11px' }} />
      <p style={{ ...miniLbl, margin: '0 0 5px' }}>How it fits the big picture</p>
      <textarea value={f.fits} onChange={e => setF({ ...f, fits: e.target.value })} rows={2} style={{ ...input, resize: 'vertical', marginBottom: '11px' }} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '11px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '120px' }}><p style={{ ...miniLbl, margin: '0 0 5px' }}>Price</p><input value={f.price} onChange={e => setF({ ...f, price: e.target.value })} style={input} /></div>
        <div style={{ width: '120px' }}><p style={{ ...miniLbl, margin: '0 0 5px' }}>Reach out every (days)</p><input type="number" min={0} value={f.cadence_days} onChange={e => setF({ ...f, cadence_days: Number(e.target.value) })} style={input} /></div>
        <div>
          <p style={{ ...miniLbl, margin: '0 0 5px' }}>Status</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['live', 'soon'] as const).map(s => (
              <button key={s} onClick={() => setF({ ...f, status: s })} style={{ border: `1px solid ${f.status === s ? color : 'var(--border)'}`, background: f.status === s ? color : 'transparent', color: f.status === s ? '#fff' : 'var(--text-subtle)', borderRadius: '999px', padding: '7px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{s === 'live' ? 'Live' : 'Soon'}</button>
            ))}
          </div>
        </div>
      </div>
      <p style={{ ...miniLbl, margin: '0 0 6px' }}>Funnel links</p>
      {links.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
          <input value={l.label} placeholder="Label" onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} style={{ ...input, flex: '0 0 34%' }} />
          <input value={l.url} placeholder="https://…" onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} style={{ ...input, flex: 1 }} />
          <button onClick={() => setLinks(links.filter((_, j) => j !== i))} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><Trash2 size={15} /></button>
        </div>
      ))}
      <button onClick={() => setLinks([...links, { label: '', url: '' }])} style={{ display: 'flex', alignItems: 'center', gap: '5px', border: 0, background: 'transparent', color: 'var(--text-subtle)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: '2px' }}><Plus size={13} /> Add link</button>
      <div style={{ marginTop: '14px' }}>
        <button onClick={save} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: '7px', border: 0, borderRadius: '9px', padding: '9px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: color, color: '#fff', opacity: busy ? 0.6 : 1 }}>
          {busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save details
        </button>
      </div>
    </div>
  )
}
