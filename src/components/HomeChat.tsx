'use client'
import { useEffect, useRef, useState } from 'react'
import HerPanel from './HerPanel'
import CommanderChat from './CommanderChat'
import { TalkToCapThread } from './TalkToCap'

// Phase 7 · Home is a chat. One conversation with Her, Man or Cap (Her is the front door),
// built on their existing chats and receipts, plus a small strip of what needs Mandi.
type Who = 'her' | 'man' | 'cap'
const KEY = 'rise-home-who'
const HIDE_KEY = 'rise-home-hide-replies'   // B0: per device
// The agents' side of each chat (Her, Man, Cap) — the classes those chats already use.
const AGENT_SEL = '.her-msg.her, .her-out, .her-q, .ttc-t.cap, [data-who="agent"]'
const WHO: { id: Who; name: string; what: string }[] = [
  { id: 'her', name: 'Her', what: 'Thinks with you, saves your words, hands them on.' },
  { id: 'man', name: 'Man', what: 'Commander. Acts in RISE, with receipts.' },
  { id: 'cap', name: 'Cap', what: 'Your plans, the calendar, what runs where.' },
]
type Item = { source: string }

export default function HomeChat() {
  const [who, setWho] = useState<Who>('her')
  const [items, setItems] = useState<Item[]>([])
  // B0: the replies column can be hidden ("so I don't have to see the responses in chat if I don't want").
  const [hide, setHide] = useState(false)
  const [unseen, setUnseen] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const seen = useRef(0)
  useEffect(() => { try { setHide(localStorage.getItem(HIDE_KEY) === '1') } catch { /* shown */ } }, [])
  const toggleHide = (v: boolean) => { setHide(v); setUnseen(0); try { localStorage.setItem(HIDE_KEY, v ? '1' : '0') } catch { /* fine */ } }
  // Count the agents' replies; while hidden, a new one shows a quiet "replied · show" pill instead.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    seen.current = el.querySelectorAll(AGENT_SEL).length
    const mo = new MutationObserver(() => {
      const n = el.querySelectorAll(AGENT_SEL).length
      if (n > seen.current && hide) setUnseen(u => u + (n - seen.current))
      seen.current = n
    })
    mo.observe(el, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [hide, who])
  // B0: with the phone keyboard open, keep the text box in view and tuck the bottom tab bar away.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const open = vv.height < window.innerHeight * 0.78
      document.documentElement.classList.toggle('kb-open', open)
      const a = document.activeElement as HTMLElement | null
      if (open && a && boxRef.current?.contains(a)) setTimeout(() => a.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
    }
    vv.addEventListener('resize', onResize)
    return () => { vv.removeEventListener('resize', onResize); document.documentElement.classList.remove('kb-open') }
  }, [])
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY) as Who | null
      if (s && WHO.some(w => w.id === s)) setWho(s)
    } catch { /* default Her */ }
  }, [])
  useEffect(() => {
    const go = (e: Event) => { const w = (e as CustomEvent).detail?.who as Who | undefined; if (w) setWho(w) }
    window.addEventListener('rise-home-who', go)
    return () => window.removeEventListener('rise-home-who', go)
  }, [])
  useEffect(() => { try { localStorage.setItem(KEY, who) } catch { /* fine */ } }, [who])
  useEffect(() => {
    const tick = () => fetch('/api/approvals').then(r => r.json()).then(d => setItems(d?.items ?? [])).catch(() => {})
    tick(); const t = setInterval(tick, 60000); return () => clearInterval(t)
  }, [])
  const health = items.filter(i => i.source === 'health').length
  const rest = items.length - health
  const go = (view: string) => window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view } }))
  const me = WHO.find(w => w.id === who)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="rp-subtabs" role="tablist" aria-label="Who you're talking to">
          {WHO.map(w => (
            <button key={w.id} type="button" role="tab" aria-selected={who === w.id} aria-pressed={who === w.id}
              className={`rp-pill ${who === w.id ? 'rp-primary' : 'rp-secondary'}`} onClick={() => setWho(w.id)}>{w.name}</button>
          ))}
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginLeft: 4 }}>{me.what}</span>
        </div>
        <button type="button" className="rp-pill rp-quiet" aria-expanded={!hide} onClick={() => toggleHide(!hide)} title="Show or hide the agents' replies (remembered on this device)">
          {hide ? 'Show replies' : 'Hide replies'}
        </button>
        {items.length > 0 && (
          <button type="button" className="rp-pill rp-secondary rp-needs-line" onClick={() => go('approve')}>
            {items.length} thing{items.length === 1 ? '' : 's'} need{items.length === 1 ? 's' : ''} you →
          </button>
        )}
        {items.length > 0 && (
          <div className="rp-subtabs rp-needs-full" aria-label="Needs you">
            {rest > 0 && <button type="button" className="rp-pill rp-secondary" onClick={() => go('approve')}>Waiting on your yes <span className="rp-count">{rest}</span></button>}
            {health > 0 && <button type="button" className="rp-pill rp-secondary" onClick={() => go('approve')}>Health check <span className="rp-count">{health}</span></button>}
          </div>
        )}
      </div>
      {hide && unseen > 0 && (
        <button type="button" className="rp-pill rp-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => toggleHide(false)}>{me.name} replied · show</button>
      )}
      <div ref={boxRef} className={`rp-card rp-glow-input hc${hide ? ' hc-hide' : ' hc-split'}`} style={{ padding: who === 'cap' ? '18px 20px' : 0, overflow: 'hidden' }}>
        {who === 'her' && <HerPanel />}
        {who === 'man' && <CommanderChat />}
        {who === 'cap' && <TalkToCapThread id="cap:general" intro="Cap owns the map: every account’s plan, the calendar and your campaigns. Ask him what’s coming up, what’s waiting on you, or where an idea should go." placeholder="Ask Cap: what's on the calendar this week? What's waiting on me? Where should this idea go?" />}
      </div>
    </div>
  )
}
